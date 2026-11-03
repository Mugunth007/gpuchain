// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {GPURegistry} from "../src/GPURegistry.sol";
import {ProviderReputation} from "../src/ProviderReputation.sol";

contract GPURegistryTest is Test {
    GPURegistry public registry;
    ProviderReputation public reputation;

    address public owner = address(this);
    address public provider1 = address(0x101);
    address public provider2 = address(0x102);

    function setUp() public {
        reputation = new ProviderReputation();
        registry = new GPURegistry(address(reputation));
    }

    function testRegisterProvider() public {
        vm.prank(provider1);
        registry.registerProvider("NVIDIA A10G", 24576, 5 * 10 ** 17, "https://node1.gpuchain.network");

        GPURegistry.ProviderInfo memory info = registry.getProvider(provider1);
        assertEq(info.wallet, provider1);
        assertEq(info.gpuModel, "NVIDIA A10G");
        assertEq(info.vramMB, 24576);
        assertEq(info.pricePerHour, 5 * 10 ** 17);
        assertTrue(info.isAvailable);
        assertTrue(info.isActive);
        assertEq(info.reputationScore, 100);
    }

    function test_RevertWhen_DuplicateRegistration() public {
        vm.startPrank(provider1);
        registry.registerProvider("NVIDIA A10G", 24576, 5 * 10 ** 17, "https://node1.gpuchain.network");
        // Second registration must fail
        vm.expectRevert(GPURegistry.ProviderAlreadyExists.selector);
        registry.registerProvider("NVIDIA RTX 4090", 24576, 4 * 10 ** 17, "https://node1.gpuchain.network");
        vm.stopPrank();
    }

    function testUpdateProvider() public {
        vm.prank(provider1);
        registry.registerProvider("NVIDIA A10G", 24576, 5 * 10 ** 17, "https://node1.gpuchain.network");

        vm.prank(provider1);
        registry.updateProvider("NVIDIA A100-80GB", 81920, 20 * 10 ** 17, "https://node1-upgraded.gpuchain.network");

        GPURegistry.ProviderInfo memory info = registry.getProvider(provider1);
        assertEq(info.gpuModel, "NVIDIA A100-80GB");
        assertEq(info.vramMB, 81920);
        assertEq(info.pricePerHour, 20 * 10 ** 17);
    }

    function testUpdateAvailabilityAndDeactivate() public {
        vm.startPrank(provider1);
        registry.registerProvider("NVIDIA RTX 4090", 24576, 4 * 10 ** 17, "https://node1.gpuchain.network");
        
        registry.updateAvailability(false);
        assertFalse(registry.getProvider(provider1).isAvailable);

        registry.updateAvailability(true);
        assertTrue(registry.getProvider(provider1).isAvailable);

        registry.deactivateProvider();
        assertFalse(registry.getProvider(provider1).isActive);
        assertFalse(registry.getProvider(provider1).isAvailable);
        vm.stopPrank();
    }

    function testGetAllProviders() public {
        vm.prank(provider1);
        registry.registerProvider("NVIDIA A10G", 24576, 5 * 10 ** 17, "https://node1.gpuchain.network");

        vm.prank(provider2);
        registry.registerProvider("NVIDIA RTX 4090", 24576, 4 * 10 ** 17, "https://node2.gpuchain.network");

        GPURegistry.ProviderInfo[] memory all = registry.getAllProviders();
        assertEq(all.length, 2);
        assertEq(all[0].wallet, provider1);
        assertEq(all[1].wallet, provider2);
    }
}
