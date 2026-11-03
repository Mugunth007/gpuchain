// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {ProviderReputation} from "../src/ProviderReputation.sol";

contract ProviderReputationTest is Test {
    ProviderReputation public reputation;
    address public verifier = address(0xAA1);
    address public provider = address(0xBB1);
    address public attacker = address(0xBAD);

    function setUp() public {
        reputation = new ProviderReputation();
        reputation.setAuthorizedCaller(verifier, true);
    }

    function testDefaultReputationScore() public view {
        assertEq(reputation.getReputation(provider), 100);
    }

    function testRecordCompletedJobs() public {
        vm.startPrank(verifier);
        reputation.recordCompletedJob(provider, 1500);
        reputation.recordCompletedJob(provider, 2500);
        vm.stopPrank();

        (
            uint256 completed,
            uint256 failed,
            uint256 totalTime,
            uint256 avgTime,
            uint256 score
        ) = reputation.getProviderStatistics(provider);

        assertEq(completed, 2);
        assertEq(failed, 0);
        assertEq(totalTime, 4000);
        assertEq(avgTime, 2000);
        assertEq(score, 100);
    }

    function testRecordFailedJob() public {
        vm.startPrank(verifier);
        reputation.recordCompletedJob(provider, 1000);
        reputation.recordFailedJob(provider);
        vm.stopPrank();

        // 1 completed out of 2 total = 50%
        assertEq(reputation.getReputation(provider), 50);

        (uint256 completed, uint256 failed, , , uint256 score) = reputation.getProviderStatistics(provider);
        assertEq(completed, 1);
        assertEq(failed, 1);
        assertEq(score, 50);
    }

    function testUnauthorizedCallerReverts() public {
        vm.prank(attacker);
        vm.expectRevert(ProviderReputation.UnauthorizedCaller.selector);
        reputation.recordCompletedJob(provider, 1000);
    }
}
