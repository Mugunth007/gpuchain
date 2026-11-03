import fs from "fs";
import path from "path";

export interface ProviderTelemetry {
  gpuName: string;
  vramTotalMb: number;
  vramUsedMb: number;
  vramFreeMb: number;
  utilizationPct: number;
  temperatureC: number;
  powerDrawW: number;
  isEmulated: boolean;
}

export interface GPUProvider {
  id: string;
  walletAddress: string;
  gpuModel: string;
  vramMb: number;
  pricePerJob: string; // in AVAX or GPUC token
  isAvailable: boolean;
  reputationScore: number; // 0 - 100
  endpointUrl: string;
  supportedModels: string[];
  lastHeartbeat: number;
  completedJobs: number;
  failedJobs: number;
  avgDurationMs: number;
  telemetry: ProviderTelemetry;
  registeredAt: number;
}

export type JobStatus = "CREATED" | "ASSIGNED" | "RUNNING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface InferenceJob {
  id: string;
  developerAddress: string;
  providerId: string;
  model: string;
  prompt: string;
  status: JobStatus;
  paymentAmount: string;
  escrowJobId?: number;
  onChainJobId?: string | null;
  txHash?: string;
  settlementTxHash?: string;
  output?: string;
  completion?: string;
  receipt?: any;
  signature?: string;
  verifierSignature?: string;
  metrics?: {
    durationMs: number;
    tokensPerSec: number;
    promptTokens: number;
    completionTokens: number;
  };
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

export interface DatabaseSchema {
  providers: GPUProvider[];
  jobs: InferenceJob[];
  nonces: Record<string, { nonce: string; expiresAt: number }>;
}

const DB_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DB_DIR, "db.json");

const SEED_PROVIDERS: GPUProvider[] = [
  {
    id: "provider-a10g-01",
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    gpuModel: "NVIDIA A10G Tensor Core",
    vramMb: 24576,
    pricePerJob: "0.25",
    isAvailable: true,
    reputationScore: 98,
    endpointUrl: "http://localhost:8001",
    supportedModels: ["gpt2", "distilgpt2", "tiny-gpt2", "gpt2-medium"],
    lastHeartbeat: Date.now(),
    completedJobs: 142,
    failedJobs: 2,
    avgDurationMs: 420,
    telemetry: {
      gpuName: "NVIDIA A10G Tensor Core",
      vramTotalMb: 24576,
      vramUsedMb: 3450,
      vramFreeMb: 21126,
      utilizationPct: 24,
      temperatureC: 56,
      powerDrawW: 82.5,
      isEmulated: false
    },
    registeredAt: Date.now() - 86400000 * 5
  },
  {
    id: "provider-rtx4090-02",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    gpuModel: "NVIDIA RTX 4090",
    vramMb: 24576,
    pricePerJob: "0.30",
    isAvailable: true,
    reputationScore: 95,
    endpointUrl: "http://localhost:8002",
    supportedModels: ["gpt2", "distilgpt2", "gpt2-medium"],
    lastHeartbeat: Date.now() - 5000,
    completedJobs: 89,
    failedJobs: 3,
    avgDurationMs: 380,
    telemetry: {
      gpuName: "NVIDIA RTX 4090",
      vramTotalMb: 24576,
      vramUsedMb: 4200,
      vramFreeMb: 20376,
      utilizationPct: 35,
      temperatureC: 62,
      powerDrawW: 140.0,
      isEmulated: false
    },
    registeredAt: Date.now() - 86400000 * 3
  },
  {
    id: "provider-h100-03",
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    gpuModel: "NVIDIA H100 PCIe",
    vramMb: 81920,
    pricePerJob: "0.75",
    isAvailable: true,
    reputationScore: 100,
    endpointUrl: "http://localhost:8003",
    supportedModels: ["gpt2", "gpt2-medium", "distilgpt2"],
    lastHeartbeat: Date.now() - 2000,
    completedJobs: 310,
    failedJobs: 0,
    avgDurationMs: 190,
    telemetry: {
      gpuName: "NVIDIA H100 PCIe",
      vramTotalMb: 81920,
      vramUsedMb: 12400,
      vramFreeMb: 69520,
      utilizationPct: 18,
      temperatureC: 48,
      powerDrawW: 210.0,
      isEmulated: false
    },
    registeredAt: Date.now() - 86400000 * 12
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(raw);
      } catch (e) {
        this.data = { providers: SEED_PROVIDERS, jobs: [], nonces: {} };
        this.save();
      }
    } else {
      this.data = { providers: SEED_PROVIDERS, jobs: [], nonces: {} };
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving database:", e);
    }
  }

  // --- Providers ---
  getProviders(): GPUProvider[] {
    return this.data.providers;
  }

  getProvider(idOrWallet: string): GPUProvider | undefined {
    const lower = idOrWallet.toLowerCase();
    return this.data.providers.find(
      (p) => p.id.toLowerCase() === lower || p.walletAddress.toLowerCase() === lower
    );
  }

  upsertProvider(provider: Partial<GPUProvider> & { walletAddress: string; gpuModel: string }): GPUProvider {
    const existingIndex = this.data.providers.findIndex(
      (p) => p.walletAddress.toLowerCase() === provider.walletAddress.toLowerCase()
    );

    const now = Date.now();
    if (existingIndex >= 0) {
      const existing = this.data.providers[existingIndex];
      const updated: GPUProvider = {
        ...existing,
        ...provider,
        telemetry: provider.telemetry ? { ...existing.telemetry, ...provider.telemetry } : existing.telemetry,
        lastHeartbeat: now
      };
      this.data.providers[existingIndex] = updated;
      this.save();
      return updated;
    } else {
      const newProvider: GPUProvider = {
        id: provider.id || `provider-${Date.now().toString(36)}`,
        walletAddress: provider.walletAddress,
        gpuModel: provider.gpuModel,
        vramMb: provider.vramMb || 24576,
        pricePerJob: provider.pricePerJob || "0.25",
        isAvailable: provider.isAvailable ?? true,
        reputationScore: provider.reputationScore ?? 100,
        endpointUrl: provider.endpointUrl || "http://localhost:8001",
        supportedModels: provider.supportedModels || ["gpt2", "distilgpt2"],
        lastHeartbeat: now,
        completedJobs: 0,
        failedJobs: 0,
        avgDurationMs: 0,
        telemetry: provider.telemetry || {
          gpuName: provider.gpuModel,
          vramTotalMb: provider.vramMb || 24576,
          vramUsedMb: 2048,
          vramFreeMb: (provider.vramMb || 24576) - 2048,
          utilizationPct: 15,
          temperatureC: 50,
          powerDrawW: 75.0,
          isEmulated: false
        },
        registeredAt: now
      };
      this.data.providers.push(newProvider);
      this.save();
      return newProvider;
    }
  }

  updateProviderHeartbeat(walletAddress: string, telemetry: Partial<ProviderTelemetry>): GPUProvider | undefined {
    const provider = this.getProvider(walletAddress);
    if (!provider) return undefined;

    provider.lastHeartbeat = Date.now();
    provider.telemetry = { ...provider.telemetry, ...telemetry };
    this.save();
    return provider;
  }

  setProviderAvailability(idOrWallet: string, isAvailable: boolean): GPUProvider | undefined {
    const provider = this.getProvider(idOrWallet);
    if (!provider) return undefined;
    provider.isAvailable = isAvailable;
    this.save();
    return provider;
  }

  recordProviderJobResult(walletAddress: string, success: boolean, durationMs: number) {
    const provider = this.getProvider(walletAddress);
    if (!provider) return;

    if (success) {
      provider.completedJobs += 1;
      provider.avgDurationMs = provider.avgDurationMs === 0 
        ? durationMs 
        : Math.round((provider.avgDurationMs * (provider.completedJobs - 1) + durationMs) / provider.completedJobs);
    } else {
      provider.failedJobs += 1;
    }

    const total = provider.completedJobs + provider.failedJobs;
    provider.reputationScore = total > 0 ? Math.round((provider.completedJobs / total) * 100) : 100;
    this.save();
  }

  // --- Jobs ---
  getJobs(): InferenceJob[] {
    return this.data.jobs;
  }

  getJob(id: string): InferenceJob | undefined {
    return this.data.jobs.find((j) => j.id === id);
  }

  createJob(jobData: Omit<InferenceJob, "id" | "createdAt" | "status"> & { id?: string }): InferenceJob {
    const newJob: InferenceJob = {
      id: jobData.id || `job-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      status: "CREATED",
      ...jobData
    };
    this.data.jobs.unshift(newJob);
    this.save();
    return newJob;
  }

  updateJob(id: string, updates: Partial<InferenceJob>): InferenceJob | undefined {
    const index = this.data.jobs.findIndex((j) => j.id === id);
    if (index === -1) return undefined;

    const updated = { ...this.data.jobs[index], ...updates };
    this.data.jobs[index] = updated;
    this.save();
    return updated;
  }

  // --- Nonces ---
  createNonce(walletAddress: string): string {
    const nonce = `Sign this message to authenticate with GPUChain: ${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
    this.data.nonces[walletAddress.toLowerCase()] = {
      nonce,
      expiresAt: Date.now() + 1000 * 60 * 15 // 15 mins
    };
    this.save();
    return nonce;
  }

  verifyAndConsumeNonce(walletAddress: string, nonce: string): boolean {
    const record = this.data.nonces[walletAddress.toLowerCase()];
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      delete this.data.nonces[walletAddress.toLowerCase()];
      this.save();
      return false;
    }
    const valid = record.nonce === nonce;
    delete this.data.nonces[walletAddress.toLowerCase()];
    this.save();
    return valid;
  }
}

export const db = new Database();
