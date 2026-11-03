import React from "react";
import { Cpu, Zap, Shield, ArrowRight, Server, Terminal, Sparkles, CheckCircle2, Lock, Flame } from "lucide-react";
import { NetworkAnalytics } from "../types";

interface LandingPageProps {
  setCurrentTab: (tab: string) => void;
  analytics: NetworkAnalytics;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentTab, analytics }) => {
  return (
    <div className="space-y-24 py-6">
      
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto pt-12 pb-6 px-4">
        <div className="inline-flex items-center space-x-2 bg-surface-card border border-surface-border px-3.5 py-1.5 rounded-full text-xs text-zinc-300 mb-8 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-avax animate-pulse"></span>
          <span>Avalanche Fuji Testnet Live</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400">Zero Cloud Markups</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Decentralized GPU Compute. <br />
          <span className="bg-gradient-to-r from-avax via-red-400 to-amber-400 bg-clip-text text-transparent">
            Powered by Avalanche.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Connect GPU providers with AI developers. Run inference anywhere. Pay transparently on-chain with smart contract escrow.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => setCurrentTab("playground")}
            className="bg-avax hover:bg-avax-hover text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-avax/25 transition-all flex items-center space-x-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch AI Playground</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTab("marketplace")}
            className="bg-surface-card hover:bg-surface-hover border border-surface-border text-zinc-200 font-medium px-6 py-3 rounded-xl transition-all text-sm flex items-center space-x-2"
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Explore GPU Marketplace</span>
          </button>

          <button
            onClick={() => setCurrentTab("provider")}
            className="bg-surface-card/60 hover:bg-surface-hover border border-surface-border text-zinc-400 hover:text-white px-5 py-3 rounded-xl transition-all text-sm flex items-center space-x-2"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Become a GPU Provider</span>
          </button>
        </div>

        {/* Live Network Quick Stat Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="bg-surface-card/70 border border-surface-border/80 rounded-2xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{analytics.totalGpus}</div>
            <div className="text-xs text-zinc-400 mt-1">Registered GPUs</div>
          </div>
          <div className="bg-surface-card/70 border border-surface-border/80 rounded-2xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">{analytics.availableGpus}</div>
            <div className="text-xs text-zinc-400 mt-1">Available for Inference</div>
          </div>
          <div className="bg-surface-card/70 border border-surface-border/80 rounded-2xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{analytics.completedJobs}</div>
            <div className="text-xs text-zinc-400 mt-1">Completed Jobs</div>
          </div>
          <div className="bg-surface-card/70 border border-surface-border/80 rounded-2xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-avax font-mono">{analytics.totalEarningsAvax} <span className="text-xs font-normal">AVAX</span></div>
            <div className="text-xs text-zinc-400 mt-1">Provider Earnings</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">How GPUChain Works</h2>
          <p className="text-zinc-400 text-sm mt-2">End-to-end off-chain AI execution secured by Avalanche Fuji smart contracts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-avax/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-avax/10 border border-avax/20 flex items-center justify-center text-avax mb-5">
              <Lock className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-zinc-500">STEP 01</span>
            <h3 className="text-lg font-semibold text-white mt-2">Smart Contract Escrow</h3>
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
              Developers select a verified GPU provider (e.g. NVIDIA A10G) and lock payment in <code className="text-xs font-mono bg-surface text-avax px-1 py-0.5 rounded">JobEscrow.sol</code>.
            </p>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-zinc-500">STEP 02</span>
            <h3 className="text-lg font-semibold text-white mt-2">Off-Chain GPU Inference</h3>
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
              The Python GPU worker ingests the job, executes PyTorch / Hugging Face causal models, and streams live tokens with sub-second latency.
            </p>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold text-zinc-500">STEP 03</span>
            <h3 className="text-lg font-semibold text-white mt-2">Verifiable Settlement</h3>
            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
              The worker signs an ECDSA receipt. The verifier validates the output hash, releasing funds to the provider and boosting their on-chain reputation score.
            </p>
          </div>
        </div>
      </section>

      {/* Supported AI Models */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-b from-surface-card to-background border border-surface-border rounded-3xl p-8 sm:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-surface-border">
            <div>
              <h3 className="text-2xl font-bold text-white">Supported AI Models</h3>
              <p className="text-zinc-400 text-sm mt-1">High-throughput causal language models ready for instant deployment</p>
            </div>
            <button
              onClick={() => setCurrentTab("playground")}
              className="bg-surface hover:bg-surface-hover border border-surface-border text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2"
            >
              <span>Test in Playground</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              {
                name: "GPT-2 Base",
                params: "124M Parameters",
                useCase: "General text generation & creative writing",
                speed: "~42 tok/sec",
                badge: "Primary MVP"
              },
              {
                name: "DistilGPT-2",
                params: "82M Parameters",
                useCase: "Lightweight ultra-low latency completions",
                speed: "~68 tok/sec",
                badge: "Ultra Fast"
              },
              {
                name: "GPT-2 Medium",
                params: "355M Parameters",
                useCase: "Complex reasoning & code generation",
                speed: "~26 tok/sec",
                badge: "High Fidelity"
              },
              {
                name: "Tiny-GPT-2",
                params: "10M Parameters",
                useCase: "Micro-benchmarks & edge testing",
                speed: "~110 tok/sec",
                badge: "Micro"
              }
            ].map((m, i) => (
              <div key={i} className="bg-surface/60 border border-surface-border/80 rounded-2xl p-5 hover:border-zinc-600 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-avax font-mono">{m.badge}</span>
                  <span className="text-[11px] text-zinc-500 font-mono">{m.speed}</span>
                </div>
                <h4 className="font-semibold text-white text-base">{m.name}</h4>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">{m.params}</div>
                <p className="text-xs text-zinc-500 mt-3">{m.useCase}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
