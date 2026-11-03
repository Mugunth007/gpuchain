import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { Cpu, Activity, ShieldCheck, Wallet, ChevronDown, Check, Copy, ExternalLink } from "lucide-react";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { address, isConnected, balanceAvax, role, setRole, connectMetaMask, connectDemoWallet, disconnect } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems = [
    { id: "landing", label: "Overview" },
    { id: "network", label: "Network" },
    { id: "marketplace", label: "GPU Marketplace" },
    { id: "playground", label: "AI Playground" },
    { id: "provider", label: "Provider Node" },
    { id: "jobs", label: "Job Explorer" },
    { id: "wallet", label: "Transactions" }
  ];

  return (
    <nav className="border-b border-surface-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab("landing")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-avax to-red-700 flex items-center justify-center shadow-lg shadow-avax/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">GPUChain</span>
                <span className="text-[10px] font-semibold bg-avax/15 text-avax border border-avax/30 px-1.5 py-0.5 rounded uppercase">
                  Fuji
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Decentralized Compute on Avalanche</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? "bg-surface-card text-white border border-surface-border shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-surface/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            {/* Fuji Network Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-surface-card border border-surface-border px-2.5 py-1 rounded-full text-xs text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-[11px]">Avalanche Fuji 43113</span>
            </div>

            {/* Wallet Connect Dropdown */}
            <div className="relative">
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <div 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 bg-surface-card hover:bg-surface-hover border border-surface-border px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-mono text-zinc-300">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <span className="text-zinc-500 font-mono text-[11px] border-l border-surface-border pl-2">
                      {balanceAvax} AVAX
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </div>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-11 w-64 bg-surface-card border border-surface-border rounded-xl shadow-2xl p-3 z-50 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                        <span className="text-xs text-zinc-400">Connected Wallet</span>
                        <button
                          onClick={copyAddress}
                          className="text-[11px] flex items-center space-x-1 text-zinc-400 hover:text-white"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="text-xs font-mono text-zinc-300 break-all">{address}</div>
                      <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                        <a
                          href={`https://testnet.snowtrace.io/address/${address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-zinc-400 hover:text-avax flex items-center space-x-1"
                        >
                          <span>Snowtrace</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <button
                          onClick={() => {
                            disconnect();
                            setDropdownOpen(false);
                          }}
                          className="text-[11px] text-red-400 hover:text-red-300 font-medium"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={connectMetaMask}
                    className="bg-avax hover:bg-avax-hover text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-md transition-all flex items-center space-x-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect Wallet</span>
                  </button>
                  <button
                    onClick={() => connectDemoWallet("developer")}
                    className="hidden sm:inline-flex bg-surface-card hover:bg-surface-hover border border-surface-border text-zinc-300 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Fuji Demo
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </nav>
  );
};
