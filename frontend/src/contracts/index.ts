import { ethers } from "ethers";

export const CONTRACT_ADDRESSES = {
  token: "0xd77ee1564420195093968Ca9840B87569b7159d8",
  reputation: "0xE2BCdb93d16d22FeF2c9A81eF8BEDD242A7eE5c0",
  registry: "0xEd6830e73Bb87dD9bde2c31a410C6A112B90e116",
  escrow: "0x26099a588B6799675cC31972aaB41a26A4ff03eB",
  verifier: "0xF61CaFa66e6ed5100bB0Ccd90994E83ff8ce1Fd3"
};

export const FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc";
export const FUJI_CHAIN_ID = 43113;

export const ESCROW_ABI = [
  "function createJob(bytes32 jobId, address provider, uint256 maxAmount, uint256 durationTimeoutSeconds) external payable",
  "function completeJob(bytes32 jobId, uint256 actualAmount, uint256 executionTimeMs, bytes calldata verifierSignature) external",
  "function refundJob(bytes32 jobId) external",
  "function cancelJob(bytes32 jobId) external",
  "function getJob(bytes32 jobId) external view returns (tuple(bytes32 id, address developer, address provider, uint256 maxAmount, uint256 actualAmount, uint256 createdAt, uint256 timeoutAt, uint256 completedAt, uint8 status, bool isNative))",
  "function paymentToken() external view returns (address)",
  "function verifierAddress() external view returns (address)",
  "event JobCreated(bytes32 indexed jobId, address indexed developer, address indexed provider, uint256 maxAmount, uint256 timeoutAt)",
  "event JobCompleted(bytes32 indexed jobId, address indexed provider, uint256 actualAmount, uint256 refundAmount)",
  "event JobRefunded(bytes32 indexed jobId, address indexed developer, uint256 refundAmount)"
];

export const TOKEN_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function faucet() external",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event FaucetClaimed(address indexed recipient, uint256 amount)"
];

export const REGISTRY_ABI = [
  "function registerProvider(string memory gpuModel, uint256 vramMB, uint256 pricePerHour, string memory endpoint) external",
  "function updateProvider(string memory gpuModel, uint256 vramMB, uint256 pricePerHour, string memory endpoint) external",
  "function setAvailability(bool isAvailable) external",
  "function getProvider(address provider) external view returns (tuple(address wallet, string gpuModel, uint256 vramMB, uint256 pricePerHour, string endpoint, bool isAvailable, bool isActive, uint256 registeredAt, uint256 reputationScore))",
  "function getAllProviders() external view returns (tuple(address wallet, string gpuModel, uint256 vramMB, uint256 pricePerHour, string endpoint, bool isAvailable, bool isActive, uint256 registeredAt, uint256 reputationScore)[])",
  "event ProviderRegistered(address indexed provider, string gpuModel, uint256 vramMB, uint256 pricePerHour, string endpoint)",
  "event ProviderAvailabilityChanged(address indexed provider, bool isAvailable)"
];

export const REPUTATION_ABI = [
  "function getReputationScore(address provider) external view returns (uint256)",
  "function getProviderStatistics(address provider) external view returns (uint256 completed, uint256 failed, uint256 avgTime, uint256 lastJob, uint256 score)"
];

export function getFujiJsonRpcProvider() {
  return new ethers.JsonRpcProvider(FUJI_RPC);
}

export function getEscrowContract(runner: ethers.ContractRunner) {
  return new ethers.Contract(CONTRACT_ADDRESSES.escrow, ESCROW_ABI, runner);
}

export function getTokenContract(runner: ethers.ContractRunner) {
  return new ethers.Contract(CONTRACT_ADDRESSES.token, TOKEN_ABI, runner);
}

export function getRegistryContract(runner: ethers.ContractRunner) {
  return new ethers.Contract(CONTRACT_ADDRESSES.registry, REGISTRY_ABI, runner);
}

export function getReputationContract(runner: ethers.ContractRunner) {
  return new ethers.Contract(CONTRACT_ADDRESSES.reputation, REPUTATION_ABI, runner);
}
