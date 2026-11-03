import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, TOKEN_ABI, getFujiJsonRpcProvider } from "../contracts";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  networkName: string;
  balanceAvax: string;
  balanceGpuc: string;
  escrowLocked: string;
  role: "developer" | "provider";
  setRole: (role: "developer" | "provider") => void;
  getSigner: () => Promise<ethers.Signer | null>;
  connectMetaMask: () => Promise<void>;
  connectDemoWallet: (role?: "developer" | "provider") => void;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  claimFaucet: () => Promise<string>;
  switchChainToFuji: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(43113);
  const [balanceAvax, setBalanceAvax] = useState("0.0000");
  const [balanceGpuc, setBalanceGpuc] = useState("0.00");
  const [escrowLocked, setEscrowLocked] = useState("0.00");
  const [role, setRole] = useState<"developer" | "provider">("developer");

  const getSigner = useCallback(async (): Promise<ethers.Signer | null> => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      return await browserProvider.getSigner();
    }
    return null;
  }, []);

  const fetchLiveBalances = useCallback(async (targetAddress: string) => {
    try {
      const rpcProvider = (typeof window !== "undefined" && (window as any).ethereum)
        ? new ethers.BrowserProvider((window as any).ethereum)
        : getFujiJsonRpcProvider();

      // Fetch AVAX balance
      const avaxWei = await rpcProvider.getBalance(targetAddress);
      setBalanceAvax(parseFloat(ethers.formatEther(avaxWei)).toFixed(4));

      // Fetch GPUC token balance
      try {
        const token = new ethers.Contract(CONTRACT_ADDRESSES.token, TOKEN_ABI, rpcProvider);
        const gpucWei = await token.balanceOf(targetAddress);
        setBalanceGpuc(parseFloat(ethers.formatEther(gpucWei)).toFixed(2));
      } catch (e) {
        console.warn("Could not query GPUC token balance:", e);
      }
    } catch (err) {
      console.error("Error fetching live balances:", err);
    }
  }, []);

  const refreshBalances = useCallback(async () => {
    if (address) {
      await fetchLiveBalances(address);
    }
  }, [address, fetchLiveBalances]);

  const connectDemoWallet = async (selectedRole: "developer" | "provider" = "developer") => {
    setRole(selectedRole);
    // Real Avalanche Fuji address with 0.5 AVAX and 1,000,000 GPUC
    const demoAddr = "0xF61CaFa66e6ed5100bB0Ccd90994E83ff8ce1Fd3";
    setAddress(demoAddr);
    setChainId(43113);
    await fetchLiveBalances(demoAddr);
  };

  const connectMetaMask = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setIsConnecting(true);
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await browserProvider.send("eth_requestAccounts", []);
        const network = await browserProvider.getNetwork();
        
        if (accounts.length > 0) {
          const userAddr = accounts[0];
          setAddress(userAddr);
          setChainId(Number(network.chainId));

          // Prompt switch if not on Fuji
          if (Number(network.chainId) !== 43113) {
            await switchChainToFuji();
          }

          await fetchLiveBalances(userAddr);
        }
      } catch (err) {
        console.error("MetaMask connection failed:", err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      await connectDemoWallet("developer");
    }
  };

  const switchChainToFuji = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa869" }] // 43113 in hex
        });
        setChainId(43113);
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xa869",
                chainName: "Avalanche Fuji Testnet",
                nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
                rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
                blockExplorerUrls: ["https://testnet.snowtrace.io/"]
              }
            ]
          });
          setChainId(43113);
        }
      }
    }
  };

  const claimFaucet = async (): Promise<string> => {
    const signer = await getSigner();
    if (!signer) throw new Error("Please connect MetaMask to claim test tokens");
    const token = new ethers.Contract(CONTRACT_ADDRESSES.token, TOKEN_ABI, signer);
    const tx = await token.faucet();
    await tx.wait(1);
    if (address) await fetchLiveBalances(address);
    return tx.hash;
  };

  const disconnect = () => {
    setAddress(null);
    setBalanceAvax("0.0000");
    setBalanceGpuc("0.00");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          fetchLiveBalances(accounts[0]);
        } else {
          disconnect();
        }
      };

      const handleChainChanged = (newChainIdHex: string) => {
        setChainId(parseInt(newChainIdHex, 16));
        if (address) fetchLiveBalances(address);
      };

      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      (window as any).ethereum.on("chainChanged", handleChainChanged);

      return () => {
        (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
        (window as any).ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [address, fetchLiveBalances]);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        chainId,
        networkName: chainId === 43113 ? "Avalanche Fuji" : "Wrong Network",
        balanceAvax,
        balanceGpuc,
        escrowLocked,
        role,
        setRole,
        getSigner,
        connectMetaMask,
        connectDemoWallet,
        disconnect,
        refreshBalances,
        claimFaucet,
        switchChainToFuji
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
};
