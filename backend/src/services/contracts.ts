import { ethers } from "ethers";
import { CONFIG } from "../config";

export class AvalancheContractService {
  private provider: ethers.JsonRpcProvider;
  private verifierWallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.AVALANCHE_RPC);
    this.verifierWallet = new ethers.Wallet(CONFIG.VERIFIER_PRIVATE_KEY, this.provider);
  }

  getVerifierAddress(): string {
    return this.verifierWallet.address;
  }

  /**
   * Generates a verifiable EIP-191 ECDSA signature matching JobEscrow.sol requirement:
   * abi.encodePacked(jobId, job.provider, actualAmount, executionTimeMs, block.chainid)
   */
  async signJobCompletion(
    jobId: string | number,
    developerAddress: string,
    providerAddress: string,
    amountWei: bigint | string,
    outputHash: string,
    executionTimeMs: number = 420,
    chainId?: number
  ): Promise<string> {
    const effectiveChainId = chainId || CONFIG.CHAIN_ID;
    
    // Convert jobId to bytes32 format
    const jobIdBytes32 = typeof jobId === "string" && jobId.startsWith("0x") && jobId.length === 66
      ? jobId
      : ethers.keccak256(ethers.toUtf8Bytes(jobId.toString()));

    const packedHash = ethers.solidityPackedKeccak256(
      ["bytes32", "address", "uint256", "uint256", "uint256"],
      [
        jobIdBytes32,
        providerAddress,
        amountWei.toString(),
        executionTimeMs,
        effectiveChainId
      ]
    );

    const signature = await this.verifierWallet.signMessage(ethers.getBytes(packedHash));
    return signature;
  }

  /**
   * Directly completes the escrow job on Avalanche Fuji using the Verifier wallet.
   * Releases payment to provider and refunds any difference to developer.
   */
  async completeJobOnChain(
    jobId: string | number,
    actualAmountWei: bigint | string,
    executionTimeMs: number = 420
  ): Promise<string | null> {
    try {
      const jobIdBytes32 = typeof jobId === "string" && jobId.startsWith("0x") && jobId.length === 66
        ? jobId
        : ethers.keccak256(ethers.toUtf8Bytes(jobId.toString()));

      const escrowAbi = [
        "function completeJob(bytes32 jobId, uint256 actualAmount, uint256 executionTimeMs, bytes calldata verifierSignature) external",
        "function getJob(bytes32 jobId) external view returns (tuple(bytes32 id, address developer, address provider, uint256 maxAmount, uint256 actualAmount, uint256 createdAt, uint256 timeoutAt, uint256 completedAt, uint8 status, bool isNative))"
      ];

      const escrowContract = new ethers.Contract(CONFIG.ESCROW_ADDRESS, escrowAbi, this.verifierWallet);

      // Check if job exists in escrow on-chain
      const onChainJob = await escrowContract.getJob(jobIdBytes32);
      if (onChainJob && Number(onChainJob.status) >= 1 && Number(onChainJob.status) <= 3) {
        console.log(`[Escrow] Settling on-chain job ${jobIdBytes32} on Fuji...`);
        const tx = await escrowContract.completeJob(jobIdBytes32, actualAmountWei, executionTimeMs, "0x");
        const receipt = await tx.wait(1);
        console.log(`[Escrow] Settled on Fuji! TxHash: ${receipt.hash}`);
        return receipt.hash;
      }
    } catch (e: any) {
      console.warn("[Escrow] On-chain settlement notice:", e.message || e);
    }
    return null;
  }

  /**
   * Verifies an arbitrary wallet signature against an expected nonce or message.
   */
  verifyWalletSignature(address: string, message: string, signature: string): boolean {
    try {
      const recovered = ethers.verifyMessage(message, signature);
      return recovered.toLowerCase() === address.toLowerCase();
    } catch (e) {
      return false;
    }
  }

  /**
   * Returns current contract deployment addresses and chain metadata.
   */
  getContractMetadata() {
    return {
      chainId: CONFIG.CHAIN_ID,
      rpcUrl: CONFIG.AVALANCHE_RPC,
      networkName: CONFIG.CHAIN_ID === 43113 ? "Avalanche Fuji Testnet" : "Avalanche Local / Anvil",
      currency: "AVAX",
      contracts: {
        token: CONFIG.TOKEN_ADDRESS,
        reputation: CONFIG.REPUTATION_ADDRESS,
        registry: CONFIG.REGISTRY_ADDRESS,
        escrow: CONFIG.ESCROW_ADDRESS,
        verifier: this.verifierWallet.address
      }
    };
  }
}

export const avalancheService = new AvalancheContractService();
