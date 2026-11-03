// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ProviderReputation} from "./ProviderReputation.sol";

/**
 * @title JobEscrow
 * @notice Trust-minimized escrow contract for AI compute jobs on Avalanche Fuji.
 *         Locks developer funds upon job submission, releases payments upon verified inference execution,
 *         and provides guaranteed refunds for failed or timed-out compute sessions.
 */
contract JobEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    enum JobStatus {
        NONE,        // 0
        CREATED,     // 1: Created by developer, awaiting provider assignment
        ASSIGNED,    // 2: Provider assigned, awaiting run
        RUNNING,     // 3: Inference execution underway on worker
        COMPLETED,   // 4: Successfully finished and settled
        FAILED,      // 5: Execution failed
        REFUNDED     // 6: Funds returned to developer
    }

    struct Job {
        bytes32 id;
        address developer;
        address provider;
        uint256 maxAmount;
        uint256 actualAmount;
        uint256 createdAt;
        uint256 timeoutAt;
        uint256 completedAt;
        JobStatus status;
        bool isNative;
    }

    IERC20 public paymentToken;
    ProviderReputation public reputationContract;
    address public verifierAddress;

    mapping(bytes32 => Job) public jobs;

    event JobCreated(
        bytes32 indexed jobId,
        address indexed developer,
        address indexed provider,
        uint256 maxAmount,
        uint256 timeoutAt
    );
    event JobAssigned(bytes32 indexed jobId, address indexed provider);
    event JobStarted(bytes32 indexed jobId);
    event JobCompleted(
        bytes32 indexed jobId,
        address indexed provider,
        uint256 actualAmount,
        uint256 refundAmount
    );
    event JobRefunded(bytes32 indexed jobId, address indexed developer, uint256 refundAmount);
    event JobFailed(bytes32 indexed jobId, address indexed provider, string reason);
    event PaymentTokenUpdated(address indexed newToken);
    event VerifierUpdated(address indexed newVerifier);
    event ReputationContractUpdated(address indexed newReputationContract);

    error JobAlreadyExists();
    error JobNotFound();
    error InvalidJobStatus();
    error InvalidAmount();
    error InvalidAddress();
    error UnauthorizedCaller();
    error JobTimeoutNotReached();
    error AmountExceedsMax();
    error InvalidSignature();

    modifier onlyVerifierOrOwner() {
        if (msg.sender != verifierAddress && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(
        address _paymentToken,
        address _reputationContract,
        address _verifierAddress
    ) Ownable(msg.sender) {
        if (_paymentToken == address(0)) revert InvalidAddress();
        paymentToken = IERC20(_paymentToken);

        if (_reputationContract != address(0)) {
            reputationContract = ProviderReputation(_reputationContract);
        }

        verifierAddress = _verifierAddress != address(0) ? _verifierAddress : msg.sender;
    }

    function setPaymentToken(address _paymentToken) external onlyOwner {
        if (_paymentToken == address(0)) revert InvalidAddress();
        paymentToken = IERC20(_paymentToken);
        emit PaymentTokenUpdated(_paymentToken);
    }

    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidAddress();
        verifierAddress = _verifier;
        emit VerifierUpdated(_verifier);
    }

    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = ProviderReputation(_reputationContract);
        emit ReputationContractUpdated(_reputationContract);
    }

    receive() external payable {}

    /**
     * @notice Deposit funds into escrow to create an AI compute job. Supports both native AVAX (via msg.value) and ERC-20 payment token.
     * @param jobId Unique identifier for the job
     * @param provider Optional designated provider address (can be address(0) for marketplace auto-assignment)
     * @param maxAmount Maximum budget locked for this job (ignored if msg.value > 0)
     * @param durationTimeoutSeconds Allowed duration before refund eligibility
     */
    function createJob(
        bytes32 jobId,
        address provider,
        uint256 maxAmount,
        uint256 durationTimeoutSeconds
    ) external payable nonReentrant {
        if (jobs[jobId].status != JobStatus.NONE) revert JobAlreadyExists();
        if (durationTimeoutSeconds < 10 seconds) revert InvalidAmount();

        bool isNative = msg.value > 0;
        uint256 lockedAmount = isNative ? msg.value : maxAmount;
        if (lockedAmount == 0) revert InvalidAmount();

        // Lock payment from developer if using ERC-20
        if (!isNative) {
            paymentToken.safeTransferFrom(msg.sender, address(this), lockedAmount);
        }

        JobStatus initialStatus = provider != address(0) ? JobStatus.ASSIGNED : JobStatus.CREATED;
        uint256 timeoutAt = block.timestamp + durationTimeoutSeconds;

        jobs[jobId] = Job({
            id: jobId,
            developer: msg.sender,
            provider: provider,
            maxAmount: lockedAmount,
            actualAmount: 0,
            createdAt: block.timestamp,
            timeoutAt: timeoutAt,
            completedAt: 0,
            status: initialStatus,
            isNative: isNative
        });

        emit JobCreated(jobId, msg.sender, provider, lockedAmount, timeoutAt);
    }

    /**
     * @notice Assign a provider to a CREATED job
     */
    function assignProvider(bytes32 jobId, address provider) external {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.CREATED) revert InvalidJobStatus();
        if (msg.sender != job.developer && msg.sender != verifierAddress && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        if (provider == address(0)) revert InvalidAddress();

        job.provider = provider;
        job.status = JobStatus.ASSIGNED;

        emit JobAssigned(jobId, provider);
    }

    /**
     * @notice Provider or verifier marks inference as active/running
     */
    function startJob(bytes32 jobId) external {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.ASSIGNED) revert InvalidJobStatus();
        if (msg.sender != job.provider && msg.sender != verifierAddress && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }

        job.status = JobStatus.RUNNING;
        emit JobStarted(jobId);
    }

    /**
     * @notice Complete job and disburse payment to provider, refunding any unused budget to developer
     * @param jobId Job identifier
     * @param actualAmount Final compute charge (must be <= maxAmount)
     * @param executionTimeMs Execution duration reported by worker for reputation tracking
     * @param verifierSignature Optional signature from designated verifier (empty if called directly by verifier/owner)
     */
    function completeJob(
        bytes32 jobId,
        uint256 actualAmount,
        uint256 executionTimeMs,
        bytes calldata verifierSignature
    ) external nonReentrant {
        Job storage job = jobs[jobId];

        if (job.status != JobStatus.ASSIGNED && job.status != JobStatus.RUNNING) {
            revert InvalidJobStatus();
        }
        if (actualAmount > job.maxAmount) revert AmountExceedsMax();

        // Verify authorization: either caller is verifier/owner, or valid verifier signature provided
        if (msg.sender != verifierAddress && msg.sender != owner()) {
            bytes32 messageHash = keccak256(
                abi.encodePacked(jobId, job.provider, actualAmount, executionTimeMs, block.chainid)
            );
            bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
            address signer = ECDSA.recover(ethSignedMessageHash, verifierSignature);
            if (signer != verifierAddress) revert InvalidSignature();
        }

        // Checks-Effects
        job.status = JobStatus.COMPLETED;
        job.actualAmount = actualAmount;
        job.completedAt = block.timestamp;

        uint256 refundAmount = job.maxAmount - actualAmount;

        // Interactions: Payout to provider
        if (actualAmount > 0) {
            if (job.isNative) {
                (bool success, ) = payable(job.provider).call{value: actualAmount}("");
                require(success, "Provider payout failed");
            } else {
                paymentToken.safeTransfer(job.provider, actualAmount);
            }
        }

        // Payout unused balance to developer
        if (refundAmount > 0) {
            if (job.isNative) {
                (bool success, ) = payable(job.developer).call{value: refundAmount}("");
                require(success, "Developer refund failed");
            } else {
                paymentToken.safeTransfer(job.developer, refundAmount);
            }
        }

        // Update reputation
        if (address(reputationContract) != address(0) && job.provider != address(0)) {
            reputationContract.recordCompletedJob(job.provider, executionTimeMs);
        }

        emit JobCompleted(jobId, job.provider, actualAmount, refundAmount);
    }

    /**
     * @notice Claim a refund if job timed out or failed to execute
     */
    function refundJob(bytes32 jobId) external nonReentrant {
        Job storage job = jobs[jobId];

        if (
            job.status != JobStatus.CREATED &&
            job.status != JobStatus.ASSIGNED &&
            job.status != JobStatus.RUNNING
        ) {
            revert InvalidJobStatus();
        }

        bool isTimedOut = block.timestamp >= job.timeoutAt;
        bool isVerifier = (msg.sender == verifierAddress || msg.sender == owner());

        // Either caller is verifier cancelling failed job, or timeout has passed
        if (!isTimedOut && !isVerifier) {
            revert JobTimeoutNotReached();
        }

        address provider = job.provider;
        job.status = JobStatus.REFUNDED;

        uint256 refundAmount = job.maxAmount;
        if (job.isNative) {
            (bool success, ) = payable(job.developer).call{value: refundAmount}("");
            require(success, "Refund transfer failed");
        } else {
            paymentToken.safeTransfer(job.developer, refundAmount);
        }

        // Record failure against provider if assigned
        if (address(reputationContract) != address(0) && provider != address(0)) {
            reputationContract.recordFailedJob(provider);
        }

        emit JobRefunded(jobId, job.developer, refundAmount);
    }

    /**
     * @notice Developer can cancel an unassigned job before any provider picks it up
     */
    function cancelJob(bytes32 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.status != JobStatus.CREATED) revert InvalidJobStatus();
        if (msg.sender != job.developer && msg.sender != owner()) revert UnauthorizedCaller();

        job.status = JobStatus.REFUNDED;
        uint256 refundAmount = job.maxAmount;
        if (job.isNative) {
            (bool success, ) = payable(job.developer).call{value: refundAmount}("");
            require(success, "Cancel refund failed");
        } else {
            paymentToken.safeTransfer(job.developer, refundAmount);
        }

        emit JobRefunded(jobId, job.developer, refundAmount);
    }

    /**
     * @notice Query job details
     */
    function getJob(bytes32 jobId) external view returns (Job memory) {
        if (jobs[jobId].status == JobStatus.NONE) revert JobNotFound();
        return jobs[jobId];
    }
}
