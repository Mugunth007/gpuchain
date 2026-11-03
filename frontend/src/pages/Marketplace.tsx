import React, { useState } from "react";
import { GPUProvider } from "../types";
import { Cpu, Zap, ShieldCheck, Flame, Search, Filter, ArrowRight, Activity, Check } from "lucide-react";

interface MarketplaceProps {
  providers: GPUProvider[];
  onSelectProvider: (provider: GPUProvider) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ providers, onSelectProvider }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVram, setFilterVram] = useState<number>(0);
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"price" | "reputation" | "vram">("reputation");

  const filteredProviders = providers
    .filter((p) => {
      const matchesSearch = p.gpuModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.walletAddress.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVram = filterVram === 0 || p.vramMb >= filterVram;
      const matchesAvail = !filterAvailableOnly || p.isAvailable;
      return matchesSearch && matchesVram && matchesAvail;
    })
    .sort((a, b) => {
      if (sortBy === "price") return parseFloat(a.pricePerJob) - parseFloat(b.pricePerJob);
      if (sortBy === "vram") return b.vramMb - a.vramMb;
      return b.reputationScore - a.reputationScore;
    });

  return (
    <div className="space-y-8 py-4">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">GPU Compute Marketplace</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Browse verified NVIDIA hardware nodes on Avalanche Fuji. Pay securely per inference job.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-400 bg-surface-card border border-surface-border px-3 py-1.5 rounded-xl">
          Showing {filteredProviders.length} of {providers.length} Hardware Nodes
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by GPU model (e.g. A10G, RTX 4090, H100)..."
            className="w-full bg-surface border border-surface-border rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-avax"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Min VRAM */}
          <select
            value={filterVram}
            onChange={(e) => setFilterVram(Number(e.target.value))}
            className="bg-surface border border-surface-border text-zinc-300 rounded-xl px-3 py-2 focus:outline-none focus:border-avax"
          >
            <option value={0}>All VRAM Sizes</option>
            <option value={16384}>16 GB+ VRAM</option>
            <option value={24576}>24 GB+ VRAM (A10G/4090)</option>
            <option value={81920}>80 GB+ VRAM (H100)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-surface border border-surface-border text-zinc-300 rounded-xl px-3 py-2 focus:outline-none focus:border-avax"
          >
            <option value="reputation">Sort: Highest Reputation</option>
            <option value="price">Sort: Lowest Price</option>
            <option value="vram">Sort: Maximum VRAM</option>
          </select>

          {/* Available Only */}
          <label className="flex items-center space-x-2 cursor-pointer bg-surface border border-surface-border px-3 py-2 rounded-xl text-zinc-300 select-none">
            <input
              type="checkbox"
              checked={filterAvailableOnly}
              onChange={(e) => setFilterAvailableOnly(e.target.checked)}
              className="accent-avax rounded"
            />
            <span>Online Only</span>
          </label>
        </div>

      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map((provider) => {
          const vramGb = Math.round(provider.vramMb / 1024);
          const isA10G = provider.gpuModel.includes("A10G");

          return (
            <div
              key={provider.id}
              className={`bg-surface-card border rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-xl ${
                isA10G
                  ? "border-avax/40 shadow-lg shadow-avax/5 relative overflow-hidden"
                  : "border-surface-border hover:border-zinc-600"
              }`}
            >
              {isA10G && (
                <div className="absolute top-0 right-0 bg-avax text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Featured Node
                </div>
              )}

              <div>
                {/* Header: GPU Model & Status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-zinc-300">
                      <Cpu className="w-5 h-5 text-avax" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{provider.gpuModel}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs font-mono text-zinc-400">{vramGb} GB VRAM</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {provider.walletAddress.slice(0, 6)}...{provider.walletAddress.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {provider.isAvailable ? (
                    <span className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1.5 text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                      <span>Busy</span>
                    </span>
                  )}
                </div>

                {/* Telemetry Chips (NVIDIA-SMI live data) */}
                <div className="mt-5 grid grid-cols-3 gap-2 bg-surface/70 border border-surface-border rounded-xl p-2.5 text-center">
                  <div>
                    <div className="text-[10px] text-zinc-500">Load</div>
                    <div className="font-mono text-xs font-bold text-white mt-0.5">
                      {provider.telemetry.utilizationPct}%
                    </div>
                  </div>
                  <div className="border-x border-surface-border">
                    <div className="text-[10px] text-zinc-500">Temp</div>
                    <div className="font-mono text-xs font-bold text-amber-400 mt-0.5">
                      {provider.telemetry.temperatureC}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">Power</div>
                    <div className="font-mono text-xs font-bold text-cyan-400 mt-0.5">
                      {provider.telemetry.powerDrawW}W
                    </div>
                  </div>
                </div>

                {/* Reputation & Performance */}
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reputation Score</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{provider.reputationScore}%</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400 flex items-center space-x-1">
                      <Activity className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Completed Jobs</span>
                    </span>
                    <span className="font-mono text-zinc-200">{provider.completedJobs} verified</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-400 flex items-center space-x-1">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Throughput</span>
                    </span>
                    <span className="font-mono text-zinc-200">~{isA10G ? "42" : "38"} tok/sec</span>
                  </div>
                </div>

              </div>

              {/* Card Footer: Price & Action */}
              <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-zinc-400">Fixed Escrow Price</div>
                  <div className="text-lg font-bold text-avax font-mono leading-tight">
                    {provider.pricePerJob} <span className="text-xs text-zinc-400 font-sans">AVAX</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectProvider(provider)}
                  className="bg-avax hover:bg-avax-hover text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md shadow-avax/20 transition-all flex items-center space-x-1.5"
                >
                  <span>Deploy Inference</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
