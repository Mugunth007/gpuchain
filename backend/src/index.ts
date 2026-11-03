import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { CONFIG } from "./config";
import { wsService } from "./services/websocket";
import { avalancheService } from "./services/contracts";

import authRoutes from "./routes/auth";
import providerRoutes from "./routes/providers";
import jobRoutes from "./routes/jobs";
import inferenceRoutes from "./routes/inference";
import analyticsRoutes from "./routes/analytics";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path !== "/health" && !req.path.includes("heartbeat")) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Root Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "GPUChain Backend Orchestrator",
    network: CONFIG.CHAIN_ID === 43113 ? "Avalanche Fuji Testnet" : "Avalanche Local",
    timestamp: Date.now()
  });
});

// Chain and Contract Configuration
app.get("/api/config", (req: Request, res: Response) => {
  res.json(avalancheService.getContractMetadata());
});

// Mount Modular API Routes
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/inference", inferenceRoutes);
app.use("/api/analytics", analyticsRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

const server = http.createServer(app);

// Attach WebSocket Server
wsService.initialize(server);

server.listen(CONFIG.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 GPUChain Backend Orchestrator Running on Port ${CONFIG.PORT}`);
  console.log(`🌐 Avalanche Fuji Testnet RPC: ${CONFIG.AVALANCHE_RPC}`);
  console.log(`⚡ WebSocket Stream ready at ws://localhost:${CONFIG.PORT}/ws`);
  console.log(`🔑 Verifier Address: ${avalancheService.getVerifierAddress()}`);
  console.log(`=======================================================`);
});

export { app, server };
