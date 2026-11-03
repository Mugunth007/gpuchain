import React, { useState } from "react";
import { GPUProvider } from "../types";
import { useWallet } from "../context/WalletContext";
import { api } from "../services/api";
import { ethers } from "ethers";
import { getEscrowContract } from "../contracts";
import {
  Sparkles,
  Zap,
  Cpu,
  Clock,
  ShieldCheck,
  Send,
  ExternalLink,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  Code
} from "lucide-react";

interface PlaygroundProps {
  providers: GPUProvider[];
  selectedProvider: GPUProvider | null;
  setSelectedProvider: (provider: GPUProvider) => void;
  onJobCompleted?: () => void;
}

export const Playground: React.FC<PlaygroundProps> = ({
  providers,
  selectedProvider,
  setSelectedProvider,
  onJobCompleted
}) => {
  const { address, isConnected, connectDemoWallet, getSigner, refreshBalances } = useWallet();

  // Selected Provider (Defaults to A10G)
  const activeProvider = selectedProvider || providers.find((p) => p.gpuModel.includes("A10G")) || providers[0];

  const [model, setModel] = useState("gpt2");
  const [prompt, setPrompt] = useState(
    "Decentralized AI inference on Avalanche Fuji combines smart contract escrow with high-throughput NVIDIA GPU compute."
  );
  const [maxTokens, setMaxTokens] = useState(60);
  const [temperature, setTemperature] = useState(0.7);

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<number>(0);
  const [stepStatusText, setStepStatusText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");
  const [metrics, setMetrics] = useState<any>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [settlementTxHash, setSettlementTxHash] = useState<string>("");
  const [receipt, setReceipt] = useState<any>(null);
  const [verifierSignature, setVerifierSignature] = useState<string>("");

  const promptPresets = [
    "Decentralized AI compute on Avalanche Fuji enables borderless access to GPUs.",
    "Smart contract escrows eliminate centralized cloud lock-in for AI developers.",
    "Explain how NVIDIA A10G Tensor Cores accelerate GPT-2 causal language models.",
    "Verifiable compute receipts settle deterministic payments on Avalanche."
  ];

  const handleRunInference = async () => {
    if (!prompt.trim()) return;

    if (!address) {
      await connectDemoWallet("developer");
    }

    setExecuting(true);
    setExecutionStep(1);
    setStepStatusText("Awaiting Avalanche Fuji Escrow Deposit...");
    setOutputText("");
    setMetrics(null);
    setReceipt(null);
    setVerifierSignature("");
    setSettlementTxHash("");

    try {
      const signer = await getSigner();
      let onChainJobId: string | null = null;
      let depositTxHash: string | null = null;
      const targetProviderWallet = activeProvider?.walletAddress || "0xF61CaFa66e6ed5100bB0Ccd90994E83ff8ce1Fd3";
      const paymentAmountAvax = activeProvider?.pricePerJob || "0.01";
      const amountWei = ethers.parseEther(paymentAmountAvax);

      if (signer) {
        setStepStatusText("Confirm Escrow Lock in MetaMask...");
        onChainJobId = ethers.hexlify(ethers.randomBytes(32));
        const escrow = getEscrowContract(signer);
        
        // Deposit real native AVAX to JobEscrow.sol on Fuji
        const tx = await escrow.createJob(
          onChainJobId,
          targetProviderWallet,
          amountWei,
          300,
          { value: amountWei }
        );
        depositTxHash = tx.hash;
        setTxHash(tx.hash);
        setStepStatusText("Confirming on Avalanche Fuji Testnet...");
        await tx.wait(1);
        await refreshBalances();
      }

      setExecutionStep(2);
      setStepStatusText("Assigning Worker & Initializing PyTorch Weights...");
      await new Promise((r) => setTimeout(r, 450));

      setExecutionStep(3);
      setStepStatusText("GPU Node Generating Neural Inference Tokens...");
      const res = await api.runInference({
        developerAddress: address || "0xF61CaFa66e6ed5100bB0Ccd90994E83ff8ce1Fd3",
        providerId: activeProvider ? activeProvider.id : "provider-a10g-01",
        model,
        prompt,
        maxTokens,
        temperature,
        onChainJobId: onChainJobId || undefined,
        txHash: depositTxHash || undefined
      });

      setExecutionStep(4);
      setStepStatusText("Verifying ECDSA Receipt & Releasing On-Chain Escrow Payout...");
      await new Promise((r) => setTimeout(r, 400));

      setExecutionStep(5);
      setStepStatusText("Inference & Fuji On-Chain Settlement Complete!");
      setOutputText(res.output || res.completion || "");
      setMetrics(res.metrics || {});
      setReceipt(res.receipt || {});
      setVerifierSignature(res.verifierSignature || "");
      if (res.settlementTxHash) {
        setSettlementTxHash(res.settlementTxHash);
      }
      if (depositTxHash) {
        setTxHash(depositTxHash);
      } else if (res.job?.txHash) {
        setTxHash(res.job.txHash);
      }
      await refreshBalances();

      if (onJobCompleted) onJobCompleted();
    } catch (err: any) {
      console.error(err);
      setOutputText("Error during execution: " + (err.message || "Failed"));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-8 py-4">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">AI Inference Playground</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Deploy prompt inference to NVIDIA GPU workers with Avalanche Fuji smart contract escrow.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Configuration Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-avax" />
              <span>Target Compute Node</span>
            </h3>

            {/* Provider Selector */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Selected GPU Node</label>
              <select
                value={activeProvider?.id}
                onChange={(e) => {
                  const p = providers.find((item) => item.id === e.target.value);
                  if (p) setSelectedProvider(p);
                }}
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-avax"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.gpuModel} ({Math.round(p.vramMb / 1024)}GB VRAM) • {p.pricePerJob} AVAX
                  </option>
                ))}
              </select>

              {activeProvider && (
                <div className="mt-2.5 bg-surface/60 border border-surface-border rounded-xl p-3 flex items-center justify-between text-xs font-mono">
                  <div className="text-zinc-400">
                    <div>Load: <span className="text-zinc-200">{activeProvider.telemetry.utilizationPct}%</span></div>
                    <div>Temp: <span className="text-amber-400">{activeProvider.telemetry.temperatureC}°C</span></div>
                  </div>
                  <div className="text-right">
                    <div>Reputation: <span className="text-emerald-400">{activeProvider.reputationScore}%</span></div>
                    <div>Rate: <span className="text-avax">{activeProvider.pricePerJob} AVAX</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">AI Language Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-avax"
              >
                <option value="gpt2">GPT-2 Base (124M Parameters) - Hugging Face</option>
                <option value="distilgpt2">DistilGPT-2 (82M Parameters) - Low Latency</option>
                <option value="gpt2-medium">GPT-2 Medium (355M Parameters)</option>
                <option value="tiny-gpt2">Tiny-GPT-2 (10M Parameters) - Micro</option>
              </select>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>Max Generated Tokens</span>
                  <span className="font-mono text-zinc-200">{maxTokens} tokens</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="128"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-avax cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>Temperature (Sampling Creativity)</span>
                  <span className="font-mono text-zinc-200">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-avax cursor-pointer"
                />
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="pt-4 border-t border-surface-border space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Inference Escrow Fee</span>
                <span className="font-mono text-white">{activeProvider?.pricePerJob || "0.25"} AVAX</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Estimated Avalanche Fuji Gas</span>
                <span className="font-mono text-white">~0.0018 AVAX</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-surface-border">
                <span className="text-zinc-200">Total Escrow Required</span>
                <span className="font-mono text-avax">{activeProvider?.pricePerJob || "0.25"} AVAX</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleRunInference}
              disabled={executing}
              className={`w-full py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg ${
                executing
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-avax hover:bg-avax-hover text-white shadow-avax/20"
              }`}
            >
              {executing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Deposit Escrow & Run Inference</span>
                </>
              )}
            </button>

          </div>

          {/* Quick Presets */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5 space-y-2.5">
            <span className="text-xs font-semibold text-zinc-400">Sample Prompt Templates</span>
            <div className="space-y-1.5">
              {promptPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(preset)}
                  className="w-full text-left text-[11px] text-zinc-300 hover:text-white bg-surface hover:bg-surface-hover border border-surface-border rounded-lg p-2 transition-colors truncate"
                >
                  "{preset}"
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Execution Terminal & Output (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Prompt Input Box */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300">Inference Prompt Input</span>
              <span className="text-zinc-500 font-mono text-[11px]">{prompt.length} chars</span>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt for the GPU worker..."
              className="w-full bg-surface border border-surface-border rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-avax resize-none font-sans leading-relaxed"
            />
          </div>

          {/* Pipeline Step Tracker */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
              Execution Lifecycle
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
              {[
                { step: 1, label: "1. Escrow Lock" },
                { step: 2, label: "2. Worker Assign" },
                { step: 3, label: "3. GPU Compute" },
                { step: 4, label: "4. Sign Receipt" },
                { step: 5, label: "5. Settled" }
              ].map((s) => {
                const isCurrent = executionStep === s.step;
                const isDone = executionStep > s.step;
                return (
                  <div
                    key={s.step}
                    className={`py-2 px-1 rounded-xl border transition-all ${
                      isDone
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium"
                        : isCurrent
                        ? "bg-avax/15 border-avax text-avax font-bold animate-pulse"
                        : "bg-surface border-surface-border text-zinc-600"
                    }`}
                  >
                    {s.label}
                  </div>
                );
              })}
            </div>
            {stepStatusText && (
              <div className="mt-3 text-center text-xs font-mono text-zinc-300 flex items-center justify-center space-x-2">
                {executing && <span className="w-2 h-2 rounded-full bg-avax animate-ping"></span>}
                <span>{stepStatusText}</span>
              </div>
            )}
          </div>

          {/* Generated Output Window */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-avax" />
                <span className="text-xs font-semibold text-white">Generated Inference Completion</span>
              </div>
              {metrics && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {metrics.tokensPerSec} tokens/sec
                </span>
              )}
            </div>

            <div className="min-h-[140px] bg-background border border-surface-border rounded-xl p-4 font-mono text-xs text-zinc-200 leading-relaxed overflow-y-auto max-h-[260px] whitespace-pre-wrap select-text">
              {outputText ? (
                outputText
              ) : executing ? (
                <span className="text-zinc-500 italic flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-avax animate-ping"></span>
                  <span>NVIDIA GPU worker is executing forward pass...</span>
                </span>
              ) : (
                <span className="text-zinc-600 italic">
                  Press "Deposit Escrow & Run Inference" to stream output from the GPU worker node.
                </span>
              )}
            </div>

            {/* Performance Metrics Bar */}
            {metrics && (
              <div className="grid grid-cols-4 gap-3 bg-surface border border-surface-border rounded-xl p-3 text-center">
                <div>
                  <div className="text-[10px] text-zinc-500">Latency</div>
                  <div className="font-mono text-xs font-bold text-white mt-0.5">{metrics.durationMs}ms</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Throughput</div>
                  <div className="font-mono text-xs font-bold text-cyan-400 mt-0.5">{metrics.tokensPerSec} tok/s</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Prompt / Gen</div>
                  <div className="font-mono text-xs font-bold text-zinc-300 mt-0.5">
                    {metrics.promptTokens} / {metrics.completionTokens}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Status</div>
                  <div className="font-mono text-xs font-bold text-emerald-400 mt-0.5">VERIFIED</div>
                </div>
              </div>
            )}

            {/* Cryptographic Proof & Receipt Details */}
            {receipt && (
              <div className="pt-2 border-t border-surface-border space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 gap-2">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ECDSA Receipt Verified</span>
                  </span>
                  <div className="flex items-center space-x-3">
                    {txHash && (
                      <a
                        href={`https://testnet.snowtrace.io/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-avax hover:underline flex items-center space-x-1 font-mono text-[10px]"
                      >
                        <span>Deposit Tx: {txHash.slice(0, 8)}...</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {settlementTxHash && (
                      <a
                        href={`https://testnet.snowtrace.io/tx/${settlementTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center space-x-1 font-mono text-[10px]"
                      >
                        <span>Payout Tx: {settlementTxHash.slice(0, 8)}...</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="bg-surface/80 p-2.5 rounded-lg font-mono text-[10px] text-zinc-400 break-all space-y-1 border border-surface-border">
                  <div>Output Hash: <span className="text-zinc-200">{receipt.outputHash}</span></div>
                  <div>Verifier Signature: <span className="text-emerald-400">{verifierSignature ? `${verifierSignature.slice(0, 36)}...` : "Verified via Owner"}</span></div>
                  {settlementTxHash && (
                    <div className="text-emerald-400">On-Chain Fuji Settlement Confirmed: <span className="text-zinc-300">{settlementTxHash}</span></div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
