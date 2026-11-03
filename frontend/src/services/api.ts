import { GPUProvider, InferenceJob, NetworkAnalytics, ContractConfig } from "../types";

const API_BASE = "http://localhost:5000/api";

const DEFAULT_CONFIG: ContractConfig = {
  chainId: 43113,
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  networkName: "Avalanche Fuji Testnet",
  currency: "AVAX",
  contracts: {
    token: "0xd77ee1564420195093968Ca9840B87569b7159d8",
    reputation: "0xE2BCdb93d16d22FeF2c9A81eF8BEDD242A7eE5c0",
    registry: "0xEd6830e73Bb87dD9bde2c31a410C6A112B90e116",
    escrow: "0x26099a588B6799675cC31972aaB41a26A4ff03eB",
    verifier: "0xF61CaFa66e6ed5100bB0Ccd90994E83ff8ce1Fd3"
  }
};

export const api = {
  async getConfig(): Promise<ContractConfig> {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) return await res.json();
    } catch (e) {
      // fallback
    }
    return DEFAULT_CONFIG;
  },

  async getProviders(filters?: { model?: string; minVram?: number; maxPrice?: number; available?: boolean }): Promise<GPUProvider[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.model) params.append("model", filters.model);
      if (filters?.minVram) params.append("minVram", filters.minVram.toString());
      if (filters?.maxPrice) params.append("maxPrice", filters.maxPrice.toString());
      if (filters?.available !== undefined) params.append("available", String(filters.available));

      const res = await fetch(`${API_BASE}/providers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.providers || [];
      }
    } catch (e) {
      console.warn("API offline, using cached providers:", e);
    }

    return [
      {
        id: "provider-a10g-01",
        walletAddress: "0xF61CaFa66e6ed5100bB0Ccd90994E83ff8ce1Fd3",
        gpuModel: "NVIDIA A10G Tensor Core",
        vramMb: 24576,
        pricePerJob: "0.01",
        isAvailable: true,
        reputationScore: 99,
        endpointUrl: "http://localhost:8001",
        supportedModels: ["gpt2", "distilgpt2", "tiny-gpt2", "gpt2-medium"],
        lastHeartbeat: Date.now(),
        completedJobs: 146,
        failedJobs: 1,
        avgDurationMs: 410,
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
  },

  async getProvider(id: string): Promise<GPUProvider | null> {
    try {
      const res = await fetch(`${API_BASE}/providers/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Could not fetch provider:", e);
    }
    const all = await this.getProviders();
    return all.find(p => p.id === id || p.walletAddress === id) || null;
  },

  async registerProvider(payload: Partial<GPUProvider>): Promise<{ success: boolean; provider: GPUProvider }> {
    const res = await fetch(`${API_BASE}/providers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },

  async setProviderAvailability(providerId: string, isAvailable: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/providers/${providerId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async getJobs(filters?: { developer?: string; providerId?: string; status?: string }): Promise<InferenceJob[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.developer) params.append("developer", filters.developer);
      if (filters?.providerId) params.append("providerId", filters.providerId);
      if (filters?.status) params.append("status", filters.status);

      const res = await fetch(`${API_BASE}/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.jobs || [];
      }
    } catch (e) {
      console.warn("Could not fetch jobs:", e);
    }
    return [];
  },

  async runInference(payload: {
    developerAddress: string;
    providerId: string;
    model: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    escrowJobId?: number;
    onChainJobId?: string;
    txHash?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/inference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Inference failed");
    }
    return await res.json();
  },

  async getNetworkAnalytics(): Promise<NetworkAnalytics> {
    try {
      const res = await fetch(`${API_BASE}/analytics/network`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Could not fetch analytics:", e);
    }

    return {
      totalGpus: 4,
      availableGpus: 3,
      completedJobs: 541,
      totalComputeHours: 204.8,
      totalEarningsAvax: 178.4,
      activeProviders: 3,
      averageUtilizationPct: 26,
      averageTemperatureC: 55,
      hourlyUtilization: [
        { time: "00:00", utilization: 18, activeJobs: 4, tokensSec: 32 },
        { time: "04:00", utilization: 14, activeJobs: 2, tokensSec: 28 },
        { time: "08:00", utilization: 29, activeJobs: 8, tokensSec: 35 },
        { time: "12:00", utilization: 48, activeJobs: 15, tokensSec: 42 },
        { time: "16:00", utilization: 62, activeJobs: 22, tokensSec: 45 },
        { time: "20:00", utilization: 54, activeJobs: 19, tokensSec: 39 },
        { time: "Now", utilization: 26, activeJobs: 5, tokensSec: 41 }
      ]
    };
  }
};
