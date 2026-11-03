import { Router, Request, Response } from "express";
import { db } from "../db";
import { wsService } from "../services/websocket";

const router = Router();

// GET /api/providers
router.get("/", (req: Request, res: Response) => {
  let providers = db.getProviders();

  const { model, minVram, maxPrice, available } = req.query;

  if (model) {
    const qModel = (model as string).toLowerCase();
    providers = providers.filter((p) => p.gpuModel.toLowerCase().includes(qModel));
  }

  if (minVram) {
    const min = parseInt(minVram as string, 10);
    providers = providers.filter((p) => p.vramMb >= min);
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice as string);
    providers = providers.filter((p) => parseFloat(p.pricePerJob) <= max);
  }

  if (available !== undefined) {
    const isAvail = available === "true" || available === "1";
    providers = providers.filter((p) => p.isAvailable === isAvail);
  }

  res.json({
    total: providers.length,
    providers
  });
});

// GET /api/providers/:id
router.get("/:id", (req: Request, res: Response) => {
  const provider = db.getProvider(req.params.id as string);
  if (!provider) {
    return res.status(404).json({ error: "Provider not found" });
  }
  res.json(provider);
});

// POST /api/providers/register
router.post("/register", (req: Request, res: Response) => {
  const { walletAddress, gpuModel, vramMb, pricePerJob, endpointUrl, supportedModels, telemetry } = req.body;

  if (!walletAddress || !gpuModel) {
    return res.status(400).json({ error: "walletAddress and gpuModel are required" });
  }

  const provider = db.upsertProvider({
    walletAddress,
    gpuModel,
    vramMb: vramMb || 24576,
    pricePerJob: pricePerJob || "0.25",
    endpointUrl: endpointUrl || "http://localhost:8001",
    supportedModels: supportedModels || ["gpt2"],
    telemetry
  });

  wsService.broadcast("PROVIDER_REGISTERED", { provider });

  res.status(201).json({
    success: true,
    message: "Provider registered successfully",
    provider
  });
});

// POST /api/providers/heartbeat
router.post("/heartbeat", (req: Request, res: Response) => {
  const { providerId, walletAddress, telemetry } = req.body;
  const address = walletAddress || providerId;

  if (!address) {
    return res.status(400).json({ error: "walletAddress or providerId required" });
  }

  const updated = db.updateProviderHeartbeat(address, telemetry || {});
  if (!updated) {
    return res.status(404).json({ error: "Provider not found" });
  }

  wsService.broadcast("PROVIDER_HEARTBEAT", {
    providerId: updated.id,
    walletAddress: updated.walletAddress,
    telemetry: updated.telemetry,
    timestamp: updated.lastHeartbeat
  });

  res.json({
    success: true,
    status: "alive",
    lastHeartbeat: updated.lastHeartbeat
  });
});

// PATCH /api/providers/:id/availability
router.patch("/:id/availability", (req: Request, res: Response) => {
  const { isAvailable } = req.body;
  if (typeof isAvailable !== "boolean") {
    return res.status(400).json({ error: "isAvailable boolean required in body" });
  }

  const updated = db.setProviderAvailability(req.params.id as string, isAvailable);
  if (!updated) {
    return res.status(404).json({ error: "Provider not found" });
  }

  wsService.broadcast("PROVIDER_AVAILABILITY_CHANGED", {
    providerId: updated.id,
    isAvailable: updated.isAvailable
  });

  res.json({
    success: true,
    isAvailable: updated.isAvailable
  });
});

export default router;
