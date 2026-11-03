import { Router, Request, Response } from "express";
import { db } from "../db";
import { avalancheService } from "../services/contracts";

const router = Router();

// GET /api/auth/nonce?address=0x...
router.get("/nonce", (req: Request, res: Response) => {
  const address = req.query.address as string;
  if (!address || !address.startsWith("0x")) {
    return res.status(400).json({ error: "Missing or invalid wallet address query param" });
  }

  const nonce = db.createNonce(address);
  res.json({ address, nonce });
});

// POST /api/auth/verify
router.post("/verify", (req: Request, res: Response) => {
  const { address, signature, nonce } = req.body;
  if (!address || !signature || !nonce) {
    return res.status(400).json({ error: "address, signature, and nonce are required" });
  }

  const isValidNonce = db.verifyAndConsumeNonce(address, nonce);
  if (!isValidNonce) {
    return res.status(401).json({ error: "Invalid or expired authentication nonce" });
  }

  const isValidSig = avalancheService.verifyWalletSignature(address, nonce, signature);
  if (!isValidSig) {
    return res.status(401).json({ error: "Invalid signature for wallet" });
  }

  // Session token or JWT
  const sessionToken = Buffer.from(`${address}:${Date.now()}:${Math.random()}`).toString("base64");
  res.json({
    success: true,
    address,
    token: sessionToken,
    message: "Wallet authenticated successfully"
  });
});

export default router;
