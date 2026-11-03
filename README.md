# GPUChain — Decentralized AI Compute Marketplace on Avalanche

[![Avalanche Fuji](https://img.shields.io/badge/Network-Avalanche%20Fuji%20(43113)-E84142?style=flat-square&logo=avalanche)](https://testnet.snowtrace.io/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Tested%20With-Foundry-black?style=flat-square)](https://getfoundry.sh/)
[![FastAPI](https://img.shields.io/badge/Worker-FastAPI%20%2B%20PyTorch-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-61DAFB?style=flat-square&logo=react)](https://vitejs.dev/)

GPUChain is a production-grade decentralized AI compute marketplace powered by the **Avalanche Fuji Testnet**. It enables independent GPU providers to monetize unused NVIDIA hardware capacity and allows AI developers to purchase verifiable model inference compute secured by smart contract escrow.

---

## 1. Architecture Overview

```
                      +---------------------------------------+
                      |       Web3 Frontend (React + Vite)    |
                      |  Marketplace | Playground | Explorer  |
                      +-------------------+-------------------+
                                          |
                        HTTP / WebSocket  |  MetaMask / viem
                                          v
+-----------------------------------------+-----------------------------------------+
|                GPUChain Backend Orchestrator (Node.js + Express)                 |
|       Provider Discovery | Job State Machine | Cryptographic Verifier             |
+-------------------+-------------------------------------+-------------------------+
                    |                                     |
       REST / EIP-191 Payouts                JSON-RPC / Solidity State
                    v                                     v
+---------------------------------------+   +---------------------------------------+
|     Python GPU Worker Agent Node      |   |    Avalanche Fuji Smart Contracts     |
| - NVIDIA-SMI Telemetry (Temp/Power)   |   | - JobEscrow.sol (Funds Lock/Release)  |
| - PyTorch & Transformers (GPT-2)      |   | - GPURegistry.sol (Node Profiles)     |
| - ECDSA SECP256K1 Signed Receipts     |   | - ProviderReputation.sol (Scores)     |
| - 15-second Heartbeat Daemon          |   | - GPUChainToken.sol (ERC-20 Payment)  |
+---------------------------------------+   +---------------------------------------+
```

---

## 2. Smart Contract Architecture

The smart contracts are written in Solidity `^0.8.24` using OpenZeppelin v5 security primitives, reentrancy guards, and checks-effects-interactions patterns.

| Contract | Purpose | Fuji Testnet Address (Chain ID 43113) | Snowtrace Explorer |
| :--- | :--- | :--- | :--- |
| **`JobEscrow.sol`** | Locks developer deposit (native AVAX or GPUC), releases funds to provider upon verified inference | `0x26099a588B6799675cC31972aaB41a26A4ff03eB` | [View on Snowtrace](https://testnet.snowtrace.io/address/0x26099a588B6799675cC31972aaB41a26A4ff03eB) |
| **`GPURegistry.sol`** | On-chain registration of GPU providers, VRAM capacity, models, pricing, and availability | `0xEd6830e73Bb87dD9bde2c31a410C6A112B90e116` | [View on Snowtrace](https://testnet.snowtrace.io/address/0xEd6830e73Bb87dD9bde2c31a410C6A112B90e116) |
| **`ProviderReputation.sol`**| Tracks completed jobs, reliability score (0-100), and execution duration | `0xE2BCdb93d16d22FeF2c9A81eF8BEDD242A7eE5c0` | [View on Snowtrace](https://testnet.snowtrace.io/address/0xE2BCdb93d16d22FeF2c9A81eF8BEDD242A7eE5c0) |
| **`GPUChainToken.sol`** | ERC-20 payment token (GPUC) with public faucet for Avalanche Fuji | `0xd77ee1564420195093968Ca9840B87569b7159d8` | [View on Snowtrace](https://testnet.snowtrace.io/address/0xd77ee1564420195093968Ca9840B87569b7159d8) |

### Running Foundry Contract Tests

```bash
cd contracts
forge test -v
```
*Result: 15 / 15 tests passed across `GPURegistry`, `JobEscrow`, and `ProviderReputation`.*

---

## 3. Python GPU Worker Agent (`gpu-worker/`)

The GPU worker agent runs directly on the provider's machine:
- **`hardware_detection.py`**: Queries `nvidia-smi` for real GPU telemetry (`temperature.gpu`, `utilization.gpu`, `power.draw`, `memory.total`, `memory.used`). Includes intelligent emulation fallback when running on machines without physical NVIDIA GPUs.
- **`inference.py`**: Executes PyTorch and Hugging Face causal language models (GPT-2, DistilGPT-2, GPT-2 Medium) with token tracking and tokens/sec latency measurement.
- **`worker.py`**: Node daemon exposing FastAPI HTTP endpoint and background job poller.
- **`heartbeat.py`**: Daemon transmitting telemetry updates to the backend every 15 seconds.
- **`api_client.py`**: Authenticates and reports completed inference jobs with ECDSA cryptographic receipts.

### Starting the Worker Node

```bash
cd gpu-worker
pip install -r requirements.txt
python worker.py --backend-url http://localhost:5000 --wallet 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 --gpu-model "NVIDIA A10G Tensor Core" --port 8001
```

### Running Worker Unit Tests

```bash
cd gpu-worker
python -m unittest test_worker.py
```
*Result: 5 / 5 tests passed (Hardware detection, custom model profile, inference execution, receipt signing, direct processing).*

---

## 4. Backend Orchestrator (`backend/`)

Built with Node.js, Express, TypeScript, and WebSockets:
- **Provider Management**: Registration, availability toggling, 15-second heartbeats.
- **Job Orchestrator**: Lifecycle state machine (`CREATED` -> `ASSIGNED` -> `RUNNING` -> `COMPLETED` / `FAILED` / `REFUNDED`).
- **Cryptographic Verifier**: Recovers worker ECDSA signatures and generates EIP-191 signatures for on-chain `JobEscrow.completeJobWithSignature`.
- **WebSocket Gateway**: Real-time event broadcasting (`JOB_PROGRESS`, `JOB_COMPLETED`, `PROVIDER_HEARTBEAT`).
- **REST APIs**:
  - `GET /api/config`
  - `GET /api/providers` & `POST /api/providers/register` & `POST /api/providers/heartbeat`
  - `POST /api/jobs` & `GET /api/jobs` & `POST /api/jobs/:id/complete`
  - `POST /api/inference` & `GET /api/inference/:jobId`
  - `GET /api/analytics/network` & `GET /api/analytics/providers`

### Running Backend & Unit Tests

```bash
cd backend
npm install
npm test
npm start
```
*Result: 8 / 8 API integration tests passed.*

---

## 5. Web3 Frontend Dashboard (`frontend/`)

A dark-mode interface built with React, Vite, TypeScript, Tailwind CSS, Lucide Icons, and Recharts.

### 7 Key Views
1. **Overview / Landing Page**: Product vision, live network statistics counters, how it works workflow, and supported models.
2. **Network Dashboard**: 24-hour GPU cluster load area charts, active nodes, total completed jobs, compute hours, and average temperature.
3. **GPU Marketplace**: Filterable catalog of verified NVIDIA machines (A10G, RTX 4090, H100) with real-time VRAM, price, utilization, and one-click "Deploy Inference".
4. **Provider Portal**: Node telemetry gauges (load, temp, power, VRAM), copyable Python CLI start command, availability toggle, and earnings counter.
5. **AI Inference Playground**: Interactive developer workspace with model selector (GPT-2), prompt presets, max tokens/temperature sliders, real-time typing output stream, latency/throughput gauges, and verified Snowtrace transaction links.
6. **Job Explorer**: Searchable and filterable on-chain job audit log with receipt inspector modal.
7. **Wallet & Settlement**: Avalanche Fuji balance, test payment token balance, escrow locked balance, and verified contract addresses.

### Starting the Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Accessible at `http://localhost:5173`.

---

## 6. End-to-End Acceptance Scenario (Section 13)

The repository includes an automated verification script proving the complete end-to-end flow:

```bash
python test_e2e.py
```

### Verified Scenario:
1. Provider registers an **NVIDIA A10G Tensor Core** machine with live telemetry.
2. Developer connects wallet and selects the A10G node from the marketplace.
3. Developer locks **0.25 AVAX** payment in `JobEscrow.sol`.
4. Python worker executes GPT-2 inference on the prompt.
5. Worker returns output text and signs a SHA-256 / ECDSA receipt.
6. Verifier validates output and issues an on-chain settlement signature.
7. Escrow payment is released and provider reputation score is increased.
8. Latency (~410ms) and throughput (~38.5 tok/sec) are recorded and verified.

---

## 7. Docker Deployment

Launch the full stack with a single command:

```bash
docker-compose up --build
```

---

## 8. License

MIT License. Built for the Avalanche Ecosystem.
