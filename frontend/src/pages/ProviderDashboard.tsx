import React, { useState } from "react";
import { GPUProvider } from "../types";
import { useWallet } from "../context/WalletContext";
import { api } from "../services/api";
import { ethers } from "ethers";
import { getRegistryContract } from "../contracts";
import { Terminal, Cpu, Flame, Zap, ShieldCheck, DollarSign, Activity, Copy, Check, Power, RefreshCw, ExternalLink } from "lucide-react";

interface ProviderDashboardProps {
  providers: GPUProvider[];
  onRefresh: () => void;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({ providers, onRefresh }) => {
  const { address, isConnected, connectDemoWallet, getSigner } = useWallet();
  const [copied, setCopied] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [onChainRegTx, setOnChainRegTx] = useState<string | null>(null);

  // New provider registration form state
  const [newModel, setNewModel] = useState("NVIDIA A10G Tensor Core");
  const [newVram, setNewVram] = useState(24576);
  const [newPrice, setNewPrice] = useState("0.01");

  // Find provider matching wallet or default to first provider
  const currentProvider = providers.find(
    (p) => p.walletAddress.toLowerCase() === (address || "").toLowerCase()
  ) || providers[0];

  const workerCommand = `python worker.py --wallet ${address || "0xF61CaFa66e6ed5100bB0Ccd90994E83ff8ce1Fd3"} --gpu-model "${currentProvider?.gpuModel || "NVIDIA A10G Tensor Core"}" --port 8001`;

  const copyWorkerCmd = () => {
    navigator.clipboard.writeText(workerCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAvailability = async () => {
    if (!currentProvider) return;
    setToggleLoading(true);
    try {
      const signer = await getSigner();
      if (signer) {
        try {
          const registry = getRegistryContract(signer);
          const tx = await registry.setAvailability(!currentProvider.isAvailable);
          await tx.wait(1);
        } catch (chainErr) {
          console.warn("On-chain availability toggle skipped:", chainErr);
        }
      }
      await api.setProviderAvailability(currentProvider.id, !currentProvider.isAvailable);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setToggleLoading(false);
    }
  };

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      await connectDemoWallet("provider");
      return;
    }
    setRegistering(true);
    setOnChainRegTx(null);
    try {
      const signer = await getSigner();
      if (signer) {
        try {
          const registry = getRegistryContract(signer);
          const priceWei = ethers.parseEther(newPrice || "0.01");
          const tx = await registry.registerProvider(newModel, Number(newVram), priceWei, "http://localhost:8001");
          setOnChainRegTx(tx.hash);
          await tx.wait(1);
        } catch (chainErr: any) {
          console.warn("On-chain registry notice:", chainErr.message);
        }
      }
      await api.registerProvider({
        walletAddress: address,
        gpuModel: newModel,
        vramMb: Number(newVram),
        pricePerJob: newPrice
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-8 py-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">GPU Provider Portal</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Monetize idle NVIDIA compute capacity. Receive escrow payments directly to your Avalanche wallet.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-surface-card border border-surface-border text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {currentProvider && (
            <button
              onClick={toggleAvailability}
              disabled={toggleLoading}
              className={`flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                currentProvider.isAvailable
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{currentProvider.isAvailable ? "Worker Online" : "Worker Offline"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Node Card */}
      {currentProvider && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Hardware & Telemetry Card */}
          <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-avax">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{currentProvider.gpuModel}</h3>
                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
                    <span className="font-mono">{Math.round(currentProvider.vramMb / 1024)} GB GDDR6</span>
                    <span>•</span>
                    <span className="font-mono">{currentProvider.walletAddress}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-zinc-400">Reputation</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {currentProvider.reputationScore}% Score
                </div>
              </div>
            </div>

            {/* NVIDIA-SMI Telemetry Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface/80 border border-surface-border rounded-xl p-3.5 text-center">
                <div className="text-[11px] text-zinc-400 flex items-center justify-center space-x-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>GPU Load</span>
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {currentProvider.telemetry.utilizationPct}%
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full"
                    style={{ width: `${currentProvider.telemetry.utilizationPct}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-surface/80 border border-surface-border rounded-xl p-3.5 text-center">
                <div className="text-[11px] text-zinc-400 flex items-center justify-center space-x-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Temperature</span>
                </div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {currentProvider.telemetry.temperatureC}°C
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${(currentProvider.telemetry.temperatureC / 90) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-surface/80 border border-surface-border rounded-xl p-3.5 text-center">
                <div className="text-[11px] text-zinc-400 flex items-center justify-center space-x-1">
                  <Zap className="w-3 h-3 text-avax" />
                  <span>Power Draw</span>
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {currentProvider.telemetry.powerDrawW}W
                </div>
                <div className="text-[10px] text-zinc-500 mt-2">Target 120W TDP</div>
              </div>

              <div className="bg-surface/80 border border-surface-border rounded-xl p-3.5 text-center">
                <div className="text-[11px] text-zinc-400 flex items-center justify-center space-x-1">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  <span>VRAM Allocated</span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {Math.round(currentProvider.telemetry.vramUsedMb / 1024)}GB
                </div>
                <div className="text-[10px] text-zinc-500 mt-2">
                  of {Math.round(currentProvider.telemetry.vramTotalMb / 1024)}GB Free
                </div>
              </div>
            </div>

            {/* Quick Python Worker Launch Command Box */}
            <div className="bg-background border border-surface-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Run Worker Agent (Python CLI)</span>
                </span>
                <button
                  onClick={copyWorkerCmd}
                  className="flex items-center space-x-1 text-zinc-400 hover:text-white transition-colors text-[11px]"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy Command"}</span>
                </button>
              </div>
              <div className="bg-surface p-2.5 rounded-lg font-mono text-[11px] text-zinc-300 overflow-x-auto select-all border border-surface-border">
                {workerCommand}
              </div>
              <p className="text-[11px] text-zinc-500">
                Executes NVIDIA-SMI hardware detection, authenticates with Avalanche contracts, and ingests inference jobs automatically.
              </p>
            </div>

          </div>

          {/* Earnings & Stats Card */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="font-semibold text-white text-sm">Provider Performance</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Settlement history via JobEscrow.sol</p>

              <div className="mt-6 space-y-4">
                <div className="bg-surface p-4 rounded-xl border border-surface-border">
                  <div className="text-xs text-zinc-400">Total Provider Earnings</div>
                  <div className="text-2xl font-bold font-mono text-avax mt-1">
                    {(currentProvider.completedJobs * parseFloat(currentProvider.pricePerJob)).toFixed(2)} AVAX
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">Disbursed directly into wallet</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-surface p-3 rounded-xl border border-surface-border">
                    <div className="text-zinc-400">Completed Jobs</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {currentProvider.completedJobs}
                    </div>
                  </div>
                  <div className="bg-surface p-3 rounded-xl border border-surface-border">
                    <div className="text-zinc-400">Avg Execution</div>
                    <div className="text-lg font-bold font-mono text-zinc-200 mt-1">
                      {currentProvider.avgDurationMs}ms
                    </div>
                  </div>
                </div>

                <div className="bg-surface p-3 rounded-xl border border-surface-border flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Settlement Currency</span>
                  <span className="font-mono text-zinc-200">AVAX / GPUC ERC-20</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-border">
              <a
                href={`https://testnet.snowtrace.io/address/${currentProvider.walletAddress}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-surface hover:bg-surface-hover border border-surface-border text-zinc-200 text-xs font-semibold py-2.5 rounded-xl transition-all block text-center"
              >
                View On Avalanche Snowtrace
              </a>
            </div>
          </div>

        </div>
      )}

      {/* Register New GPU Machine Form */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <h3 className="text-base font-bold text-white">Register a New GPU Node on Avalanche</h3>
        <p className="text-xs text-zinc-400 mt-1">
          Add hardware to <code className="text-avax font-mono">GPURegistry.sol</code> on Fuji Testnet.
        </p>

        <form onSubmit={handleRegisterNode} className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">GPU Model</label>
            <select
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-avax"
            >
              <option value="NVIDIA A10G Tensor Core">NVIDIA A10G Tensor Core (24GB)</option>
              <option value="NVIDIA RTX 4090">NVIDIA RTX 4090 (24GB)</option>
              <option value="NVIDIA H100 PCIe">NVIDIA H100 PCIe (80GB)</option>
              <option value="NVIDIA RTX 3090">NVIDIA RTX 3090 (24GB)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">VRAM (MB)</label>
            <input
              type="number"
              value={newVram}
              onChange={(e) => setNewVram(Number(e.target.value))}
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-avax"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Price Per Job (AVAX)</label>
            <input
              type="text"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-avax"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={registering}
              className="w-full bg-avax hover:bg-avax-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-avax/20"
            >
              {registering ? "Registering on Fuji..." : "Register GPU on-chain"}
            </button>
          </div>
        </form>

        {onChainRegTx && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Node registered on GPURegistry.sol!</span>
            </div>
            <a
              href={`https://testnet.snowtrace.io/tx/${onChainRegTx}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center space-x-1 font-mono"
            >
              <span>Snowtrace: {onChainRegTx.slice(0, 10)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

    </div>
  );
};
