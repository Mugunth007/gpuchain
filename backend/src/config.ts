import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Avalanche Fuji Testnet Config
  AVALANCHE_RPC: process.env.AVALANCHE_RPC || "https://api.avax-test.network/ext/bc/C/rpc",
  CHAIN_ID: parseInt(process.env.CHAIN_ID || "43113", 10),
  
  // Deployed Contract Addresses (defaults to deployed addresses)
  TOKEN_ADDRESS: process.env.TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  REPUTATION_ADDRESS: process.env.REPUTATION_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  REGISTRY_ADDRESS: process.env.REGISTRY_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  ESCROW_ADDRESS: process.env.ESCROW_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",

  // Verifier Private Key for signing escrow execution vouchers
  VERIFIER_PRIVATE_KEY: process.env.VERIFIER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",

  // Worker default URL
  DEFAULT_WORKER_URL: process.env.DEFAULT_WORKER_URL || "http://localhost:8001"
};
