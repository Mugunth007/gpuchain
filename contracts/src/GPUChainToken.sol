// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GPUChainToken
 * @notice Configurable test payment token (GPUC) used for job escrow settlements on Avalanche Fuji.
 *         Includes a public faucet function for rapid testing and demonstrations.
 */
contract GPUChainToken is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 500 * 10 ** 18; // 500 GPUC per request
    mapping(address => uint256) public lastFaucetRequest;
    uint256 public constant FAUCET_COOLDOWN = 1 minutes;

    event FaucetClaimed(address indexed recipient, uint256 amount);

    constructor() ERC20("GPUChain USD", "GPUC") Ownable(msg.sender) {
        // Mint initial liquidity to deployer
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    /**
     * @notice Claim free test GPUC tokens for interacting with the marketplace
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetRequest[msg.sender] + FAUCET_COOLDOWN,
            "Faucet cooldown active"
        );
        lastFaucetRequest[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Admin mint function
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
