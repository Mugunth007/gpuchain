import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { ContractConfig } from "../types";
import { Wallet, ExternalLink, ShieldCheck, Copy, Check, ArrowUpRight, Lock, DollarSign, Layers, RefreshCw } from "lucide-react";

interface WalletViewProps {
  config: ContractConfig;
}

export const WalletView: React.FC<WalletViewProps> = ({ config }) => {
  const {
    address,
    isConnected,
    balanceAvax,
    balanceGpuc,
    escrowLocked,
    connectMetaMask,
    connectDemoWallet,
    disconnect,
    refreshBalances,
    claimFaucet,
    switchChainToFuji
  } = useWallet();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [faucetTxHash, setFaucetTxHash] = useState<string | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleClaimFaucet = async () => {
    setClaiming(true);
    setFaucetError(null);
    setFaucetTxHash(null);
    try {
      const hash = await claimFaucet();
      setFaucetTxHash(hash);
    } catch (e: any) {
      setFaucetError(e.reason || e.message || "Faucet claim failed");
    } finally {
      setClaiming(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalances();
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const contracts = [
    { name: "JobEscrow.sol", desc: "Locks developer payment, releases upon verified receipt", address: config.contracts.escrow },
    { name: "GPURegistry.sol", desc: "Stores registered GPU provider hardware and pricing", address: config.contracts.registry },
    { name: "ProviderReputation.sol", desc: "Tracks completed jobs, reliability and execution score", address: config.contracts.reputation },
    { name: "GPUChainToken.sol (GPUC)", desc: "ERC-20 test payment token for Avalanche Fuji", address: config.contracts.token },
    { name: "Designated Verifier", desc: "Signs cryptographic execution receipts", address: config.contracts.verifier }
  ];

  return (
    <div className="space-y-8 py-4">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Wallet & Avalanche Settlement</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Live on Avalanche Fuji Testnet. View real balances, test tokens, and on-chain smart contracts.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center space-x-2 bg-surface hover:bg-surface-hover border border-surface-border text-zinc-300 text-xs px-3.5 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-avax" : ""}`} />
          <span>Refresh Live Balances</span>
        </button>
      </div>

      {faucetTxHash && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Claimed 500 GPUC successfully!</span>
          </div>
          <a
            href={`https://testnet.snowtrace.io/tx/${faucetTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline flex items-center space-x-1 font-mono"
          >
            <span>Snowtrace: {faucetTxHash.slice(0, 10)}...</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {faucetError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs">
          {faucetError}
        </div>
      )}

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* AVAX Balance */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Avalanche Native Balance</span>
              <span className="w-2 h-2 rounded-full bg-avax"></span>
            </div>
            <div className="text-3xl font-bold font-mono text-white mt-3">
              {balanceAvax} <span className="text-sm font-sans text-zinc-400">AVAX</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">
              Gas & Native Escrow on Fuji Testnet
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border">
            <a
              href="https://core.app/tools/testnet-faucet/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-avax hover:underline flex items-center space-x-1"
            >
              <span>Get Free Fuji AVAX Faucet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* GPUC Test Tokens */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>GPUChain Token (GPUC)</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            </div>
            <div className="text-3xl font-bold font-mono text-cyan-400 mt-3">
              {balanceGpuc} <span className="text-sm font-sans text-zinc-400">GPUC</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">
              ERC-20 Payment Token on Fuji
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border">
            <button
              onClick={handleClaimFaucet}
              disabled={claiming || !isConnected}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                claiming
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
              }`}
            >
              {claiming ? (
                <>
                  <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                  <span>Claiming on Fuji...</span>
                </>
              ) : (
                <span>Claim 500 GPUC (Faucet)</span>
              )}
            </button>
          </div>
        </div>

        {/* Escrow Locked */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Locked in JobEscrow.sol</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold font-mono text-amber-400 mt-3">
              {escrowLocked} <span className="text-sm font-sans text-zinc-400">AVAX</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">
              Active in-flight inference commitments
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-surface-border text-xs text-zinc-500 font-mono">
            Chain ID: 43113 (Fuji)
          </div>
        </div>

      </div>

      {/* Connection & Network Details */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border gap-4">
          <div>
            <h3 className="font-semibold text-white text-base">Connected Account</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isConnected ? "Active session connected via Web3 provider" : "No wallet currently connected"}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isConnected ? (
              <button
                onClick={disconnect}
                className="bg-surface hover:bg-surface-hover border border-surface-border text-red-400 text-xs px-3.5 py-2 rounded-xl transition-colors font-medium"
              >
                Disconnect Wallet
              </button>
            ) : (
              <>
                <button
                  onClick={connectMetaMask}
                  className="bg-avax hover:bg-avax-hover text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-avax/20 flex items-center space-x-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Connect MetaMask</span>
                </button>
                <button
                  onClick={() => connectDemoWallet("developer")}
                  className="bg-surface hover:bg-surface-hover border border-surface-border text-zinc-300 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Load Fuji Deployer
                </button>
              </>
            )}
          </div>
        </div>

        {isConnected && (
          <div className="bg-surface p-4 rounded-xl border border-surface-border flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 block mb-1">Wallet Address</span>
              <span className="font-mono text-xs text-white break-all">{address}</span>
            </div>
            <button
              onClick={() => copyText("wallet", address || "")}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-surface-card transition-colors"
            >
              {copiedKey === "wallet" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Network Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-surface p-3 rounded-xl border border-surface-border">
            <span className="text-zinc-500 font-sans block mb-1">Network</span>
            <span className="text-zinc-200">Avalanche Fuji</span>
          </div>
          <div className="bg-surface p-3 rounded-xl border border-surface-border">
            <span className="text-zinc-500 font-sans block mb-1">Chain ID</span>
            <span className="text-zinc-200">43113 (0xa869)</span>
          </div>
          <div className="bg-surface p-3 rounded-xl border border-surface-border">
            <span className="text-zinc-500 font-sans block mb-1">Public RPC</span>
            <span className="text-zinc-200 truncate block">api.avax-test.network</span>
          </div>
        </div>
      </div>

      {/* Verified Smart Contracts Reference */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <h3 className="font-bold text-white text-base">Verified Smart Contracts on Avalanche Fuji</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-5">
          Foundry-tested contracts deployed on Fuji Testnet for GPU registration, escrow deposits, and reputation tracking.
        </p>

        <div className="space-y-3">
          {contracts.map((c, i) => (
            <div
              key={i}
              className="bg-surface border border-surface-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-600 transition-colors"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-xs">{c.name}</span>
                  <span className="text-[10px] bg-surface-card text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    VERIFIED
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{c.desc}</p>
                <div className="font-mono text-xs text-zinc-300 mt-1.5 break-all">{c.address}</div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => copyText(`contract-${i}`, c.address)}
                  className="p-2 bg-surface-card hover:bg-surface-hover border border-surface-border text-zinc-400 hover:text-white rounded-lg transition-colors text-xs flex items-center space-x-1"
                >
                  {copiedKey === `contract-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px] font-sans">Copy</span>
                </button>
                <a
                  href={`https://testnet.snowtrace.io/address/${c.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-surface-card hover:bg-surface-hover border border-surface-border text-zinc-400 hover:text-avax rounded-lg transition-colors text-xs flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-sans">Snowtrace</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
