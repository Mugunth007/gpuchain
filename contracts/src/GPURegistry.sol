// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ProviderReputation} from "./ProviderReputation.sol";

/**
 * @title GPURegistry
 * @notice On-chain registry for decentralized GPU hardware providers on Avalanche Fuji.
 *         Allows independent compute nodes to advertise model inference capacity and pricing.
 */
contract GPURegistry is Ownable {
    struct ProviderInfo {
        address wallet;
        string gpuModel;
        uint256 vramMB;
        uint256 pricePerHour; // In payment token wei
        string endpoint;
        bool isAvailable;
        bool isActive;
        uint256 registeredAt;
        uint256 reputationScore;
    }

    ProviderReputation public reputationContract;

    mapping(address => ProviderInfo) private _providers;
    address[] private _providerAddresses;
    mapping(address => bool) private _isKnownProvider;

    event ProviderRegistered(
        address indexed provider,
        string gpuModel,
        uint256 vramMB,
        uint256 pricePerHour,
        string endpoint
    );
    event ProviderUpdated(
        address indexed provider,
        string gpuModel,
        uint256 vramMB,
        uint256 pricePerHour,
        string endpoint
    );
    event ProviderAvailabilityChanged(address indexed provider, bool isAvailable);
    event ProviderDeactivated(address indexed provider);
    event ReputationContractUpdated(address indexed newReputationContract);

    error ProviderAlreadyExists();
    error ProviderNotFound();
    error ProviderInactive();
    error InvalidParameters();

    constructor(address _reputationContract) Ownable(msg.sender) {
        if (_reputationContract != address(0)) {
            reputationContract = ProviderReputation(_reputationContract);
        }
    }

    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = ProviderReputation(_reputationContract);
        emit ReputationContractUpdated(_reputationContract);
    }

    /**
     * @notice Register a new GPU worker node with hardware specs and hourly pricing
     */
    function registerProvider(
        string memory gpuModel,
        uint256 vramMB,
        uint256 pricePerHour,
        string memory endpoint
    ) external {
        if (bytes(gpuModel).length == 0 || vramMB == 0 || pricePerHour == 0) {
            revert InvalidParameters();
        }

        if (_isKnownProvider[msg.sender] && _providers[msg.sender].isActive) {
            revert ProviderAlreadyExists();
        }

        uint256 initialScore = 100;
        if (address(reputationContract) != address(0)) {
            initialScore = reputationContract.getReputation(msg.sender);
        }

        _providers[msg.sender] = ProviderInfo({
            wallet: msg.sender,
            gpuModel: gpuModel,
            vramMB: vramMB,
            pricePerHour: pricePerHour,
            endpoint: endpoint,
            isAvailable: true,
            isActive: true,
            registeredAt: block.timestamp,
            reputationScore: initialScore
        });

        if (!_isKnownProvider[msg.sender]) {
            _providerAddresses.push(msg.sender);
            _isKnownProvider[msg.sender] = true;
        }

        emit ProviderRegistered(msg.sender, gpuModel, vramMB, pricePerHour, endpoint);
    }

    /**
     * @notice Update hardware specs or pricing for existing provider
     */
    function updateProvider(
        string memory gpuModel,
        uint256 vramMB,
        uint256 pricePerHour,
        string memory endpoint
    ) external {
        if (!_isKnownProvider[msg.sender] || !_providers[msg.sender].isActive) {
            revert ProviderNotFound();
        }
        if (bytes(gpuModel).length == 0 || vramMB == 0 || pricePerHour == 0) {
            revert InvalidParameters();
        }

        ProviderInfo storage p = _providers[msg.sender];
        p.gpuModel = gpuModel;
        p.vramMB = vramMB;
        p.pricePerHour = pricePerHour;
        p.endpoint = endpoint;

        emit ProviderUpdated(msg.sender, gpuModel, vramMB, pricePerHour, endpoint);
    }

    /**
     * @notice Toggle worker availability (e.g. during maintenance or job saturation)
     */
    function updateAvailability(bool isAvailable) external {
        if (!_isKnownProvider[msg.sender] || !_providers[msg.sender].isActive) {
            revert ProviderNotFound();
        }

        _providers[msg.sender].isAvailable = isAvailable;
        emit ProviderAvailabilityChanged(msg.sender, isAvailable);
    }

    /**
     * @notice Deactivate provider node from the network
     */
    function deactivateProvider() external {
        if (!_isKnownProvider[msg.sender] || !_providers[msg.sender].isActive) {
            revert ProviderNotFound();
        }

        _providers[msg.sender].isActive = false;
        _providers[msg.sender].isAvailable = false;
        emit ProviderDeactivated(msg.sender);
    }

    /**
     * @notice Get details for a single provider
     */
    function getProvider(address provider) external view returns (ProviderInfo memory) {
        if (!_isKnownProvider[provider]) {
            revert ProviderNotFound();
        }
        ProviderInfo memory info = _providers[provider];
        if (address(reputationContract) != address(0)) {
            info.reputationScore = reputationContract.getReputation(provider);
        }
        return info;
    }

    /**
     * @notice Get all registered providers with real-time reputation scores
     */
    function getAllProviders() external view returns (ProviderInfo[] memory) {
        uint256 count = _providerAddresses.length;
        ProviderInfo[] memory all = new ProviderInfo[](count);

        for (uint256 i = 0; i < count; i++) {
            address addr = _providerAddresses[i];
            ProviderInfo memory info = _providers[addr];
            if (address(reputationContract) != address(0)) {
                info.reputationScore = reputationContract.getReputation(addr);
            }
            all[i] = info;
        }
        return all;
    }

    /**
     * @notice Return total registered providers count
     */
    function getProviderCount() external view returns (uint256) {
        return _providerAddresses.length;
    }
}
