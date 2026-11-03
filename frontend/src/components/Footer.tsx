import React from "react";
import { Cpu, ExternalLink, ShieldCheck, Terminal, Layers } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-surface-border bg-background mt-20 text-zinc-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-avax flex items-center justify-center text-white">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-white">GPUChain</span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Decentralized AI compute marketplace powered by Avalanche Fuji smart contracts and off-chain NVIDIA GPU workers.
            </p>
          </div>

          <div>
            <h4 className="text-zinc-300 font-semibold mb-3">Blockchain Infrastructure</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://testnet.snowtrace.io" target="_blank" rel="noreferrer" className="hover:text-avax flex items-center space-x-1">
                  <span>Snowtrace Fuji Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Network: Avalanche Fuji (Chain ID 43113)</li>
              <li>RPC: api.avax-test.network/ext/bc/C/rpc</li>
              <li>Settlement: JobEscrow.sol (OpenZeppelin)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-300 font-semibold mb-3">GPU Worker Nodes</h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-1.5">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>NVIDIA-SMI Real-Time Telemetry</span>
              </li>
              <li>PyTorch & Hugging Face Transformers</li>
              <li>ECDSA SECP256K1 Execution Receipts</li>
              <li>Sub-second Time to First Token</li>
            </ul>
          </div>

          <div>
            <h4 className="text-zinc-300 font-semibold mb-3">Contract Verification</h4>
            <div className="space-y-1 font-mono text-[11px] text-zinc-400">
              <div className="truncate">Escrow: 0xCf7E...F0Fc9</div>
              <div className="truncate">Registry: 0x9fE4...fa6e0</div>
              <div className="truncate">Reputation: 0xe7f1...F0512</div>
              <div className="truncate">Token: 0x5FbD...80aa3</div>
            </div>
          </div>

        </div>

        <div className="border-t border-surface-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-zinc-600">
          <p>© 2026 GPUChain. Decentralized Compute Marketplace on Avalanche.</p>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <span className="flex items-center space-x-1 text-emerald-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Systems Operational</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
