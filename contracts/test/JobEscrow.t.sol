// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {ProviderReputation} from "../src/ProviderReputation.sol";
import {GPUChainToken} from "../src/GPUChainToken.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract JobEscrowTest is Test {
    GPUChainToken public token;
    ProviderReputation public reputation;
    JobEscrow public escrow;

    uint256 internal verifierPrivateKey = 0xA11CE;
    address public verifier;
    address public developer = address(0xDE1);
    address public provider = address(0x991);
    address public attacker = address(0xBAD);

    bytes32 public sampleJobId = keccak256("job-001");

    function setUp() public {
        verifier = vm.addr(verifierPrivateKey);
        token = new GPUChainToken();
        reputation = new ProviderReputation();
        escrow = new JobEscrow(address(token), address(reputation), verifier);

        // Authorize escrow contract to update reputation
        reputation.setAuthorizedCaller(address(escrow), true);

        // Mint tokens to developer
        token.mint(developer, 100 * 10 ** 18);

        // Developer approves escrow contract
        vm.prank(developer);
        token.approve(address(escrow), type(uint256).max);
    }

    function testCreateJobLocksFunds() public {
        uint256 maxAmount = 10 * 10 ** 18;
        uint256 initialDevBalance = token.balanceOf(developer);

        vm.prank(developer);
        escrow.createJob(sampleJobId, provider, maxAmount, 300);

        assertEq(token.balanceOf(developer), initialDevBalance - maxAmount);
        assertEq(token.balanceOf(address(escrow)), maxAmount);

        JobEscrow.Job memory j = escrow.getJob(sampleJobId);
        assertEq(j.developer, developer);
        assertEq(j.provider, provider);
        assertEq(j.maxAmount, maxAmount);
        assertEq(uint8(j.status), uint8(JobEscrow.JobStatus.ASSIGNED));
    }

    function testCompleteJobAndDisbursePayment() public {
        uint256 maxAmount = 10 * 10 ** 18;
        uint256 actualAmount = 6 * 10 ** 18;
        uint256 expectedRefund = 4 * 10 ** 18;

        vm.prank(developer);
        escrow.createJob(sampleJobId, provider, maxAmount, 300);

        uint256 devBalBefore = token.balanceOf(developer);
        uint256 provBalBefore = token.balanceOf(provider);

        // Verifier completes job
        vm.prank(verifier);
        escrow.completeJob(sampleJobId, actualAmount, 2400, "");

        assertEq(token.balanceOf(provider), provBalBefore + actualAmount);
        assertEq(token.balanceOf(developer), devBalBefore + expectedRefund);
        assertEq(token.balanceOf(address(escrow)), 0);

        JobEscrow.Job memory j = escrow.getJob(sampleJobId);
        assertEq(uint8(j.status), uint8(JobEscrow.JobStatus.COMPLETED));
        assertEq(j.actualAmount, actualAmount);

        // Verify reputation updated
        (uint256 completed, , , , ) = reputation.getProviderStatistics(provider);
        assertEq(completed, 1);
    }

    function testPreventDuplicatePayout() public {
        uint256 maxAmount = 10 * 10 ** 18;
        vm.prank(developer);
        escrow.createJob(sampleJobId, provider, maxAmount, 300);

        vm.prank(verifier);
        escrow.completeJob(sampleJobId, maxAmount, 2000, "");

        // Second attempt to complete or payout must revert
        vm.prank(verifier);
        vm.expectRevert(JobEscrow.InvalidJobStatus.selector);
        escrow.completeJob(sampleJobId, maxAmount, 2000, "");
    }

    function testRefundAfterTimeout() public {
        uint256 maxAmount = 10 * 10 ** 18;
        uint256 devBalBefore = token.balanceOf(developer);

        vm.prank(developer);
        escrow.createJob(sampleJobId, provider, maxAmount, 60);

        // Cannot refund before timeout as developer
        vm.prank(developer);
        vm.expectRevert(JobEscrow.JobTimeoutNotReached.selector);
        escrow.refundJob(sampleJobId);

        // Advance time past timeout
        vm.warp(block.timestamp + 61);

        // Developer refunds
        vm.prank(developer);
        escrow.refundJob(sampleJobId);

        assertEq(token.balanceOf(developer), devBalBefore);
        assertEq(token.balanceOf(address(escrow)), 0);

        JobEscrow.Job memory j = escrow.getJob(sampleJobId);
        assertEq(uint8(j.status), uint8(JobEscrow.JobStatus.REFUNDED));

        // Verify provider recorded failure
        (, uint256 failed, , , ) = reputation.getProviderStatistics(provider);
        assertEq(failed, 1);
    }

    function testCancelUnassignedJob() public {
        bytes32 unassignedJobId = keccak256("unassigned-job");
        uint256 maxAmount = 5 * 10 ** 18;
        uint256 devBalBefore = token.balanceOf(developer);

        vm.prank(developer);
        escrow.createJob(unassignedJobId, address(0), maxAmount, 300);

        JobEscrow.Job memory j = escrow.getJob(unassignedJobId);
        assertEq(uint8(j.status), uint8(JobEscrow.JobStatus.CREATED));

        vm.prank(developer);
        escrow.cancelJob(unassignedJobId);

        assertEq(token.balanceOf(developer), devBalBefore);
    }

    function testCompleteJobWithVerifierSignature() public {
        uint256 maxAmount = 8 * 10 ** 18;
        uint256 actualAmount = 7 * 10 ** 18;
        uint256 executionTimeMs = 1850;

        vm.prank(developer);
        escrow.createJob(sampleJobId, provider, maxAmount, 300);

        // Generate ECDSA signature signed by verifier private key
        bytes32 messageHash = keccak256(
            abi.encodePacked(sampleJobId, provider, actualAmount, executionTimeMs, block.chainid)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Any address (e.g. developer or provider) can submit the transaction with the verifier's signature
        vm.prank(provider);
        escrow.completeJob(sampleJobId, actualAmount, executionTimeMs, signature);

        assertEq(token.balanceOf(provider), actualAmount);
        JobEscrow.Job memory j = escrow.getJob(sampleJobId);
        assertEq(uint8(j.status), uint8(JobEscrow.JobStatus.COMPLETED));
    }
}
