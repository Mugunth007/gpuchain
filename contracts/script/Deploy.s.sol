// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {GPUChainToken} from "../src/GPUChainToken.sol";
import {ProviderReputation} from "../src/ProviderReputation.sol";
import {GPURegistry} from "../src/GPURegistry.sol";
import {JobEscrow} from "../src/JobEscrow.sol";

contract DeployGPUChain is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying GPUChain on chain id:", block.chainid);
        console2.log("Deployer address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy test ERC-20 payment token
        GPUChainToken token = new GPUChainToken();
        console2.log("GPUChainToken deployed to:", address(token));

        // 2. Deploy reputation contract
        ProviderReputation reputation = new ProviderReputation();
        console2.log("ProviderReputation deployed to:", address(reputation));

        // 3. Deploy GPU registry
        GPURegistry registry = new GPURegistry(address(reputation));
        console2.log("GPURegistry deployed to:", address(registry));

        // 4. Deploy JobEscrow
        JobEscrow escrow = new JobEscrow(address(token), address(reputation), deployer);
        console2.log("JobEscrow deployed to:", address(escrow));

        // Authorize escrow to update reputation
        reputation.setAuthorizedCaller(address(escrow), true);
        console2.log("Authorized JobEscrow in ProviderReputation");

        vm.stopBroadcast();
    }
}
