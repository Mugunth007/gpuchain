import React, { useState } from "react";
import { InferenceJob } from "../types";
import { CONTRACT_ADDRESSES } from "../contracts";
import { ExternalLink, CheckCircle2, Clock, XCircle, Search, Eye, X, ShieldCheck } from "lucide-react";

interface JobExplorerProps {
  jobs: InferenceJob[];
  onRefresh: () => void;
}

export const JobExplorer: React.FC<JobExplorerProps> = ({ jobs, onRefresh }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState<InferenceJob | null>(null);

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.id.toLowerCase().includes(search.toLowerCase()) ||
      j.developerAddress.toLowerCase().includes(search.toLowerCase()) ||
      j.providerId.toLowerCase().includes(search.toLowerCase()) ||
      j.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium font-sans">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case "RUNNING":
        return (
          <span className="inline-flex items-center space-x-1 text-avax bg-avax/10 border border-avax/20 px-2 py-0.5 rounded-full text-[11px] font-medium font-sans animate-pulse">
            <Clock className="w-3 h-3" />
            <span>Running</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center space-x-1 text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full text-[11px] font-medium font-sans">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full text-[11px] font-medium font-sans">
            <Clock className="w-3 h-3" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 py-4">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Avalanche Job Explorer</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time on-chain escrow job lifecycle records and cryptographic execution proofs.
          </p>
        </div>
        <div className="text-xs font-mono text-zinc-400 bg-surface-card border border-surface-border px-3 py-1.5 rounded-xl">
          {jobs.length} Total Jobs Processed
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Job ID, wallet address, or prompt keyword..."
            className="w-full bg-surface border border-surface-border rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-avax"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {["ALL", "COMPLETED", "RUNNING", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                statusFilter === st
                  ? "bg-surface text-white border-avax"
                  : "bg-surface/50 text-zinc-400 border-surface-border hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/60 text-zinc-400 border-b border-surface-border">
              <tr>
                <th className="px-6 py-3.5 font-medium">Job ID</th>
                <th className="px-6 py-3.5 font-medium">Model</th>
                <th className="px-6 py-3.5 font-medium">Developer</th>
                <th className="px-6 py-3.5 font-medium">Provider</th>
                <th className="px-6 py-3.5 font-medium">Payment</th>
                <th className="px-6 py-3.5 font-medium">Latency</th>
                <th className="px-6 py-3.5 font-medium">Status</th>
                <th className="px-6 py-3.5 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border font-mono">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 font-sans">
                    No matching inference jobs found. Submit one in the AI Playground!
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-surface/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">
                      {job.id}
                    </td>
                    <td className="px-6 py-4 font-sans text-zinc-300">
                      <span className="bg-surface px-2 py-1 rounded border border-surface-border text-[11px]">
                        {job.model}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {job.developerAddress.slice(0, 6)}...{job.developerAddress.slice(-4)}
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-sans">
                      {job.providerId}
                    </td>
                    <td className="px-6 py-4 text-avax font-semibold">
                      {job.paymentAmount} AVAX
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      {job.metrics?.durationMs ? `${job.metrics.durationMs}ms` : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="bg-surface hover:bg-surface-hover border border-surface-border text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="font-sans">View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-3xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="font-bold text-white text-base font-mono">{selectedJob.id}</h3>
                <span className="text-xs text-zinc-400 font-sans">Inference Execution Receipt</span>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div>
                <label className="text-zinc-500 font-semibold block mb-1">PROMPT</label>
                <div className="bg-surface p-3 rounded-xl border border-surface-border text-zinc-200 font-mono">
                  {selectedJob.prompt}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-semibold block mb-1">GENERATED OUTPUT</label>
                <div className="bg-background p-3.5 rounded-xl border border-surface-border text-zinc-100 font-mono leading-relaxed whitespace-pre-wrap">
                  {selectedJob.output || selectedJob.completion || "Pending execution..."}
                </div>
              </div>

              {selectedJob.metrics && (
                <div className="grid grid-cols-3 gap-3 bg-surface p-3 rounded-xl border border-surface-border text-center font-mono">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-sans">Execution Duration</div>
                    <div className="text-white font-bold mt-0.5">{selectedJob.metrics.durationMs}ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-sans">Throughput</div>
                    <div className="text-cyan-400 font-bold mt-0.5">{selectedJob.metrics.tokensPerSec} tok/s</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-sans">Token Count</div>
                    <div className="text-zinc-300 font-bold mt-0.5">
                      {selectedJob.metrics.promptTokens} in / {selectedJob.metrics.completionTokens} out
                    </div>
                  </div>
                </div>
              )}

              {/* On-Chain Settlement Info */}
              <div className="pt-2 border-t border-surface-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Escrow Contract:</span>
                  <a
                    href={`https://testnet.snowtrace.io/address/${CONTRACT_ADDRESSES.escrow}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-zinc-300 hover:text-avax flex items-center space-x-1"
                  >
                    <span>{CONTRACT_ADDRESSES.escrow}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {selectedJob.txHash && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Deposit Tx Hash:</span>
                    <a
                      href={`https://testnet.snowtrace.io/tx/${selectedJob.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-avax hover:underline flex items-center space-x-1 font-mono"
                    >
                      <span>{selectedJob.txHash?.slice(0, 16)}...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {selectedJob.settlementTxHash && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Payout Settlement Tx:</span>
                    <a
                      href={`https://testnet.snowtrace.io/tx/${selectedJob.settlementTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline flex items-center space-x-1 font-mono"
                    >
                      <span>{selectedJob.settlementTxHash?.slice(0, 16)}...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
