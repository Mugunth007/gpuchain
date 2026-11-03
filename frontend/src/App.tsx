import React, { useState, useEffect } from "react";
import { WalletProvider } from "./context/WalletContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { NetworkDashboard } from "./pages/NetworkDashboard";
import { Marketplace } from "./pages/Marketplace";
import { ProviderDashboard } from "./pages/ProviderDashboard";
import { Playground } from "./pages/Playground";
import { JobExplorer } from "./pages/JobExplorer";
import { WalletView } from "./pages/WalletView";

import { api } from "./services/api";
import { GPUProvider, InferenceJob, NetworkAnalytics, ContractConfig } from "./types";

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>("landing");
  const [providers, setProviders] = useState<GPUProvider[]>([]);
  const [jobs, setJobs] = useState<InferenceJob[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<GPUProvider | null>(null);
  const [analytics, setAnalytics] = useState<NetworkAnalytics>({
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
  });

  const [config, setConfig] = useState<ContractConfig>({
    chainId: 43113,
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    networkName: "Avalanche Fuji Testnet",
    currency: "AVAX",
    contracts: {
      token: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      reputation: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      registry: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      escrow: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      verifier: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    }
  });

  const loadData = async () => {
    try {
      const [fetchedProviders, fetchedJobs, fetchedAnalytics, fetchedConfig] = await Promise.all([
        api.getProviders(),
        api.getJobs(),
        api.getNetworkAnalytics(),
        api.getConfig()
      ]);
      setProviders(fetchedProviders);
      setJobs(fetchedJobs);
      setAnalytics(fetchedAnalytics);
      setConfig(fetchedConfig);
    } catch (e) {
      console.warn("Error refreshing state:", e);
    }
  };

  useEffect(() => {
    loadData();

    // Setup live WebSocket listener
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://localhost:5000/ws");
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "JOB_COMPLETED" || msg.type === "JOB_CREATED") {
            loadData();
          }
        } catch (e) {}
      };
    } catch (e) {}

    const interval = setInterval(loadData, 12000);
    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const handleSelectProvider = (provider: GPUProvider) => {
    setSelectedProvider(provider);
    setCurrentTab("playground");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-zinc-100 selection:bg-avax selection:text-white">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {currentTab === "landing" && (
          <LandingPage setCurrentTab={setCurrentTab} analytics={analytics} />
        )}
        {currentTab === "network" && (
          <NetworkDashboard
            analytics={analytics}
            providers={providers}
            jobs={jobs}
            setCurrentTab={setCurrentTab}
          />
        )}
        {currentTab === "marketplace" && (
          <Marketplace
            providers={providers}
            onSelectProvider={handleSelectProvider}
          />
        )}
        {currentTab === "playground" && (
          <Playground
            providers={providers}
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            onJobCompleted={loadData}
          />
        )}
        {currentTab === "provider" && (
          <ProviderDashboard
            providers={providers}
            onRefresh={loadData}
          />
        )}
        {currentTab === "jobs" && (
          <JobExplorer jobs={jobs} onRefresh={loadData} />
        )}
        {currentTab === "wallet" && (
          <WalletView config={config} />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
