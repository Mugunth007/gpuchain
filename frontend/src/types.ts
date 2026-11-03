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
  pricePerJob: string;
  isAvailable: boolean;
  reputationScore: number;
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
  receipt?: {
    jobId: string;
    providerAddress: string;
    model: string;
    outputHash: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    tokensPerSec: number;
    completedAt: number;
  };
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

export interface NetworkAnalytics {
  totalGpus: number;
  availableGpus: number;
  completedJobs: number;
  totalComputeHours: number;
  totalEarningsAvax: number;
  activeProviders: number;
  averageUtilizationPct: number;
  averageTemperatureC: number;
  hourlyUtilization: Array<{
    time: string;
    utilization: number;
    activeJobs: number;
    tokensSec: number;
  }>;
}

export interface ContractConfig {
  chainId: number;
  rpcUrl: string;
  networkName: string;
  currency: string;
  contracts: {
    token: string;
    reputation: string;
    registry: string;
    escrow: string;
    verifier: string;
  };
}
