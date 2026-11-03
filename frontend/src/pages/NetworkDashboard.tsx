import React from "react";
import { NetworkAnalytics, GPUProvider, InferenceJob } from "../types";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Cpu, Server, Activity, Clock, Flame, Zap, DollarSign, CheckCircle2 } from "lucide-react";

interface NetworkDashboardProps {
  analytics: NetworkAnalytics;
  providers: GPUProvider[];
  jobs: InferenceJob[];
  setCurrentTab: (tab: string) => void;
}

export const NetworkDashboard: React.FC<NetworkDashboardProps> = ({ analytics, providers, jobs, setCurrentTab }) => {
  return (
    <div className="space-y-8 py-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Avalanche Compute Network</h2>
          <p className="text-xs text-zinc-400 mt-1">Real-time telemetry, node utilization, and on-chain metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{analytics.activeProviders} Nodes Active</span>
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total GPUs</span>
            <Cpu className="w-4 h-4 text-avax" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{analytics.totalGpus}</div>
          <div className="text-[11px] text-zinc-500 mt-1">NVIDIA Tensor Cores</div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Available GPUs</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">{analytics.availableGpus}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Ready for Jobs</div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Completed Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{analytics.completedJobs}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Escrow Settled</div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Compute Hours</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{analytics.totalComputeHours}h</div>
          <div className="text-[11px] text-zinc-500 mt-1">Total Executed</div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Provider Earnings</span>
            <DollarSign className="w-4 h-4 text-avax" />
          </div>
          <div className="text-2xl font-bold font-mono text-avax mt-2">{analytics.totalEarningsAvax} <span className="text-xs font-normal">AVAX</span></div>
          <div className="text-[11px] text-zinc-500 mt-1">Distributed On-chain</div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Avg Utilization</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{analytics.averageUtilizationPct}%</div>
          <div className="text-[11px] text-zinc-500 mt-1">Cluster Load</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Utilization Trend Chart */}
        <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">24-Hour GPU Cluster Utilization</h3>
              <p className="text-xs text-zinc-400">Load percentage across registered provider machines</p>
            </div>
            <span className="text-xs font-mono text-zinc-400 bg-surface px-2.5 py-1 rounded-lg border border-surface-border">
              Avg: {analytics.averageUtilizationPct}%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.hourlyUtilization}>
                <defs>
                  <linearGradient id="utilGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E84142" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E84142" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#4B5563" fontSize={11} tickLine={false} />
                <YAxis stroke="#4B5563" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#15181E", borderColor: "#262B35", borderRadius: "12px", fontSize: "12px" }}
                  itemStyle={{ color: "#E84142" }}
                />
                <Area type="monotone" dataKey="utilization" stroke="#E84142" strokeWidth={2} fillOpacity={1} fill="url(#utilGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Telemetry Breakdown */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Cluster Telemetry</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Aggregated NVIDIA-SMI node vitals</p>

            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400 flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Average Temperature</span>
                  </span>
                  <span className="font-mono text-zinc-200">{analytics.averageTemperatureC}°C</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                    style={{ width: `${(analytics.averageTemperatureC / 90) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Throughput Capacity</span>
                  </span>
                  <span className="font-mono text-zinc-200">~145 tok/sec</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: "65%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    <span>Active Escrow Volume</span>
                  </span>
                  <span className="font-mono text-zinc-200">2.75 AVAX</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: "42%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-surface-border">
            <button
              onClick={() => setCurrentTab("marketplace")}
              className="w-full bg-surface hover:bg-surface-hover border border-surface-border text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
            >
              Browse Active Providers
            </button>
          </div>
        </div>

      </div>

      {/* Active Providers Overview Table */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Registered GPU Hardware Nodes</h3>
          <span className="text-xs text-zinc-400">{providers.length} Verified Machines</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/50 text-zinc-400 border-b border-surface-border">
              <tr>
                <th className="px-6 py-3 font-medium">GPU Model</th>
                <th className="px-6 py-3 font-medium">VRAM</th>
                <th className="px-6 py-3 font-medium">Provider Wallet</th>
                <th className="px-6 py-3 font-medium">Price / Job</th>
                <th className="px-6 py-3 font-medium">Reputation</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border font-mono">
              {providers.map((p) => (
                <tr key={p.id} className="hover:bg-surface/30 transition-colors">
                  <td className="px-6 py-3.5 font-sans font-semibold text-white flex items-center space-x-2">
                    <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{p.gpuModel}</span>
                  </td>
                  <td className="px-6 py-3.5 text-zinc-300">
                    {Math.round(p.vramMb / 1024)} GB
                  </td>
                  <td className="px-6 py-3.5 text-zinc-400">
                    {p.walletAddress.slice(0, 6)}...{p.walletAddress.slice(-4)}
                  </td>
                  <td className="px-6 py-3.5 text-avax font-semibold">
                    {p.pricePerJob} AVAX
                  </td>
                  <td className="px-6 py-3.5 text-zinc-300">
                    <span className="text-emerald-400 font-bold">{p.reputationScore}%</span>
                  </td>
                  <td className="px-6 py-3.5">
                    {p.isAvailable ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="font-sans">Available</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-zinc-400 text-[11px] bg-zinc-800 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                        <span className="font-sans">Busy</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
