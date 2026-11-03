// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProviderReputation
 * @notice Tracks on-chain performance statistics and reputation scores for GPU providers.
 *         Only authorized verifiers or the JobEscrow contract may record job outcomes.
 */
contract ProviderReputation is Ownable {
    struct ProviderStats {
        uint256 completedJobs;
        uint256 failedJobs;
        uint256 totalExecutionTimeMs;
        uint256 lastUpdated;
    }

    mapping(address => ProviderStats) private _stats;
    mapping(address => bool) public authorizedCallers;

    event CallerAuthorized(address indexed caller, bool authorized);
    event JobCompletedRecorded(
        address indexed provider,
        uint256 executionTimeMs,
        uint256 totalCompleted,
        uint256 reliabilityScore
    );
    event JobFailedRecorded(
        address indexed provider,
        uint256 totalFailed,
        uint256 reliabilityScore
    );

    error UnauthorizedCaller();
    error ZeroAddress();

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor() Ownable(msg.sender) {
        authorizedCallers[msg.sender] = true;
    }

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert ZeroAddress();
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }

    /**
     * @notice Record a successfully completed inference job
     */
    function recordCompletedJob(address provider, uint256 executionTimeMs) external onlyAuthorized {
        if (provider == address(0)) revert ZeroAddress();
        ProviderStats storage stats = _stats[provider];
        stats.completedJobs += 1;
        stats.totalExecutionTimeMs += executionTimeMs;
        stats.lastUpdated = block.timestamp;

        emit JobCompletedRecorded(
            provider,
            executionTimeMs,
            stats.completedJobs,
            getReputation(provider)
        );
    }

    /**
     * @notice Record a failed or timed-out inference job
     */
    function recordFailedJob(address provider) external onlyAuthorized {
        if (provider == address(0)) revert ZeroAddress();
        ProviderStats storage stats = _stats[provider];
        stats.failedJobs += 1;
        stats.lastUpdated = block.timestamp;

        emit JobFailedRecorded(provider, stats.failedJobs, getReputation(provider));
    }

    /**
     * @notice Get normalized reputation score (0 - 100)
     *         Default for new providers with zero jobs is 100.
     */
    function getReputation(address provider) public view returns (uint256) {
        ProviderStats memory stats = _stats[provider];
        uint256 total = stats.completedJobs + stats.failedJobs;
        if (total == 0) {
            return 100;
        }
        return (stats.completedJobs * 100) / total;
    }

    /**
     * @notice Retrieve full provider performance metrics
     */
    function getProviderStatistics(address provider)
        external
        view
        returns (
            uint256 completedJobs,
            uint256 failedJobs,
            uint256 totalExecutionTimeMs,
            uint256 avgExecutionTimeMs,
            uint256 reliabilityScore
        )
    {
        ProviderStats memory stats = _stats[provider];
        completedJobs = stats.completedJobs;
        failedJobs = stats.failedJobs;
        totalExecutionTimeMs = stats.totalExecutionTimeMs;
        avgExecutionTimeMs = stats.completedJobs > 0
            ? stats.totalExecutionTimeMs / stats.completedJobs
            : 0;
        reliabilityScore = getReputation(provider);
    }
}
