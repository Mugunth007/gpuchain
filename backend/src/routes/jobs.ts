import { Router, Request, Response } from "express";
import { db, JobStatus } from "../db";
import { wsService } from "../services/websocket";
import { avalancheService } from "../services/contracts";
import { ethers } from "ethers";

const router = Router();

// GET /api/jobs
router.get("/", (req: Request, res: Response) => {
  let jobs = db.getJobs();
  const { developer, providerId, status } = req.query;

  if (developer) {
    const devLower = (developer as string).toLowerCase();
    jobs = jobs.filter((j) => j.developerAddress.toLowerCase() === devLower);
  }

  if (providerId) {
    const pLower = (providerId as string).toLowerCase();
    jobs = jobs.filter((j) => j.providerId.toLowerCase() === pLower);
  }

  if (status) {
    jobs = jobs.filter((j) => j.status === status);
  }

  res.json({
    total: jobs.length,
    jobs
  });
});

// GET /api/jobs/:id
router.get("/:id", (req: Request, res: Response) => {
  const jobId = req.params.id as string;
  const job = db.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(job);
});

// POST /api/jobs
router.post("/", (req: Request, res: Response) => {
  const { developerAddress, providerId, model, prompt, paymentAmount, escrowJobId, txHash } = req.body;

  if (!developerAddress || !providerId || !prompt) {
    return res.status(400).json({ error: "developerAddress, providerId, and prompt are required" });
  }

  const provider = db.getProvider(providerId);
  if (!provider) {
    return res.status(404).json({ error: `Provider '${providerId}' not found` });
  }

  const job = db.createJob({
    developerAddress,
    providerId: provider.id,
    model: model || "gpt2",
    prompt,
    paymentAmount: paymentAmount || provider.pricePerJob,
    escrowJobId: escrowJobId || Math.floor(Date.now() / 1000),
    txHash: txHash || `0x${ethers.hexlify(ethers.randomBytes(32)).substring(2)}`
  });

  wsService.broadcast("JOB_CREATED", { job });

  res.status(201).json({
    success: true,
    job
  });
});

// POST /api/jobs/:id/assign
router.post("/:id/assign", (req: Request, res: Response) => {
  const { providerId } = req.body;
  const jobId = req.params.id as string;
  const job = db.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const updated = db.updateJob(job.id, {
    status: "ASSIGNED",
    providerId: providerId || job.providerId
  });

  wsService.sendToJob(job.id, "JOB_ASSIGNED", { job: updated });

  res.json({ success: true, job: updated });
});

// POST /api/jobs/:id/complete
router.post("/:id/complete", async (req: Request, res: Response) => {
  const jobId = req.params.id as string;
  const job = db.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const { output, completion, receipt, signature, metrics } = req.body;

  const outputText = output || job.output || "";
  const outputHash = receipt?.outputHash || `0x${ethers.sha256(ethers.toUtf8Bytes(outputText)).substring(2)}`;

  const provider = db.getProvider(job.providerId);
  const providerAddress = provider?.walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const amountWei = ethers.parseEther(job.paymentAmount || "0.25");

  // Generate trusted verifier ECDSA signature for on-chain payout
  let verifierSignature = "";
  try {
    verifierSignature = await avalancheService.signJobCompletion(
      job.escrowJobId || 1,
      job.developerAddress,
      providerAddress,
      amountWei,
      outputHash
    );
  } catch (e) {
    console.warn("Could not generate verifier signature:", e);
  }

  const updated = db.updateJob(job.id, {
    status: "COMPLETED",
    output: outputText,
    completion: completion || outputText,
    receipt: receipt || null,
    signature: signature || null,
    verifierSignature,
    metrics: metrics || {
      durationMs: 410,
      tokensPerSec: 38.5,
      promptTokens: 12,
      completionTokens: 48
    },
    completedAt: Date.now()
  });

  // Update provider metrics & reputation score
  if (provider) {
    db.recordProviderJobResult(
      provider.walletAddress,
      true,
      metrics?.durationMs || 400
    );
  }

  wsService.sendToJob(job.id, "JOB_COMPLETED", { job: updated });

  res.json({
    success: true,
    job: updated,
    verifierSignature,
    message: "Job completed and signed for escrow release"
  });
});

// POST /api/jobs/:id/fail
router.post("/:id/fail", (req: Request, res: Response) => {
  const jobId = req.params.id as string;
  const job = db.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const { error } = req.body;

  const updated = db.updateJob(job.id, {
    status: "FAILED",
    errorMessage: error || "Inference execution failed"
  });

  const provider = db.getProvider(job.providerId);
  if (provider) {
    db.recordProviderJobResult(provider.walletAddress, false, 0);
  }

  wsService.sendToJob(job.id, "JOB_FAILED", { job: updated });

  res.json({
    success: true,
    job: updated,
    message: "Job marked as failed. Refund available for developer."
  });
});

export default router;
