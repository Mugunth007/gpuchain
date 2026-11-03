"""
GPUChain Standalone Worker Agent
Handles provider registration, automated NVIDIA-SMI detection, heartbeat loop,
inference job execution, and cryptographic execution receipt signing.
"""

import os
import sys
import time
import json
import hashlib
import logging
import argparse
import threading
from typing import Dict, Any, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel

from hardware_detection import detect_hardware
from inference import execute_inference, ALLOWED_MODELS
from api_client import GPUChainAPIClient
from heartbeat import HeartbeatDaemon

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("GPUChain.Worker")

class WorkerSigner:
    """Signs inference receipts using ECDSA SECP256K1 or sha256 HMAC."""
    def __init__(self, private_key_hex: Optional[str] = None):
        self.private_key_hex = private_key_hex or os.getenv(
            "PROVIDER_PRIVATE_KEY",
            "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" # Foundry Account #1 default
        )

    def sign_receipt(self, receipt_data: Dict[str, Any]) -> str:
        data_str = json.dumps(receipt_data, sort_keys=True)
        raw_hash = hashlib.sha256(data_str.encode()).digest()
        
        try:
            from cryptography.hazmat.primitives.asymmetric import ec
            from cryptography.hazmat.primitives import hashes
            
            # Derive deterministic key from private_key_hex
            clean_hex = self.private_key_hex[2:] if self.private_key_hex.startswith("0x") else self.private_key_hex
            key_int = int(clean_hex, 16)
            priv_key = ec.derive_private_key(key_int, ec.SECP256K1())
            signature = priv_key.sign(raw_hash, ec.ECDSA(hashes.SHA256()))
            return "0x" + signature.hex()
        except Exception as e:
            # Fallback HMAC signature
            import hmac
            sig = hmac.new(self.private_key_hex.encode(), raw_hash, hashlib.sha256).hexdigest()
            return "0x" + sig


class DirectInferenceRequest(BaseModel):
    jobId: str
    prompt: str
    model: Optional[str] = "gpt2"
    maxNewTokens: Optional[int] = 60
    temperature: Optional[float] = 0.7


class GPUWorker:
    def __init__(
        self,
        backend_url: str = "http://localhost:5000",
        provider_wallet: str = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        gpu_model: Optional[str] = None,
        price_per_job: str = "1.0", # 1 GPUC / AVAX
        port: int = 8001
    ):
        self.backend_url = backend_url
        self.provider_wallet = provider_wallet
        self.gpu_model = gpu_model or os.getenv("GPU_MODEL", "NVIDIA A10G Tensor Core")
        self.price_per_job = price_per_job
        self.port = port
        self.provider_id: Optional[str] = None
        
        self.api_client = GPUChainAPIClient(backend_url)
        self.signer = WorkerSigner()
        self.heartbeat_daemon: Optional[HeartbeatDaemon] = None
        self._running = False
        self._poll_thread: Optional[threading.Thread] = None

    def initialize_and_register(self) -> Dict[str, Any]:
        """Detects hardware and registers provider with GPUChain backend."""
        logger.info(f"Detecting GPU hardware (preferred model: {self.gpu_model})...")
        hardware = detect_hardware(preferred_model=self.gpu_model)
        logger.info(
            f"Hardware detected: {hardware['gpu_name']} | "
            f"VRAM: {hardware['vram_total_mb']}MB | "
            f"Emulated: {hardware.get('is_emulated', False)}"
        )

        reg_payload = {
            "walletAddress": self.provider_wallet,
            "gpuModel": hardware["gpu_name"],
            "vramMb": hardware["vram_total_mb"],
            "pricePerJob": self.price_per_job,
            "endpointUrl": f"http://localhost:{self.port}",
            "supportedModels": list(ALLOWED_MODELS.keys()),
            "telemetry": hardware
        }

        try:
            res = self.api_client.register(reg_payload)
            self.provider_id = res.get("id") or res.get("provider", {}).get("id") or self.provider_wallet
            logger.info(f"Registered provider successfully! Provider ID: {self.provider_id}")
            return res
        except Exception as e:
            logger.warning(f"Could not connect to backend at {self.backend_url} ({e}). Running in standalone/ready mode.")
            self.provider_id = self.provider_wallet
            return {"status": "offline_registered", "id": self.provider_id}

    def start_heartbeat(self):
        """Starts 15-second telemetry heartbeat loop."""
        if not self.provider_id:
            return
        self.heartbeat_daemon = HeartbeatDaemon(
            api_client=self.api_client,
            provider_id=self.provider_id,
            wallet_address=self.provider_wallet,
            interval_seconds=15
        )
        self.heartbeat_daemon.start()

    def process_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Executes inference for a single job and signs execution receipt."""
        job_id = job_data.get("id") or job_data.get("jobId")
        prompt = job_data.get("prompt", "Decentralized AI inference on Avalanche")
        model = job_data.get("model", "gpt2")
        max_tokens = job_data.get("maxTokens") or job_data.get("maxNewTokens", 60)
        temp = job_data.get("temperature", 0.7)

        logger.info(f"Executing inference for Job [{job_id}] | Model: {model} | Prompt: '{prompt[:40]}...'")

        # Execute inference using PyTorch / Transformers
        inference_result = execute_inference(
            prompt=prompt,
            model_key=model,
            max_new_tokens=int(max_tokens),
            temperature=float(temp)
        )

        output_text = inference_result["output"]
        output_hash = "0x" + hashlib.sha256(output_text.encode("utf-8")).hexdigest()

        # Build execution receipt
        receipt_payload = {
            "jobId": job_id,
            "providerAddress": self.provider_wallet,
            "model": model,
            "outputHash": output_hash,
            "promptTokens": inference_result["prompt_tokens"],
            "completionTokens": inference_result["completion_tokens"],
            "totalTokens": inference_result["total_tokens"],
            "durationMs": inference_result["duration_ms"],
            "tokensPerSec": inference_result["tokens_per_sec"],
            "completedAt": int(time.time())
        }

        signature = self.signer.sign_receipt(receipt_payload)

        final_response = {
            "success": True,
            "jobId": job_id,
            "output": output_text,
            "completion": inference_result["completion"],
            "receipt": receipt_payload,
            "signature": signature,
            "metrics": {
                "durationMs": inference_result["duration_ms"],
                "tokensPerSec": inference_result["tokens_per_sec"],
                "promptTokens": inference_result["prompt_tokens"],
                "completionTokens": inference_result["completion_tokens"]
            }
        }

        # Submit to backend if connected
        try:
            self.api_client.complete_job(job_id, final_response)
            logger.info(f"Reported completion for Job [{job_id}] to backend.")
        except Exception as e:
            logger.debug(f"Direct push response delivered (backend callback optional: {e})")

        return final_response

    def _poll_jobs_loop(self):
        """Background poller for assigned jobs."""
        logger.info("Started background job poller...")
        while self._running:
            try:
                if self.provider_id:
                    jobs = self.api_client.get_pending_jobs(self.provider_id)
                    for job in jobs:
                        self.process_job(job)
            except Exception as e:
                pass
            time.sleep(3)

    def start(self, enable_polling: bool = True):
        self._running = True
        self.initialize_and_register()
        self.start_heartbeat()
        if enable_polling:
            self._poll_thread = threading.Thread(target=self._poll_jobs_loop, daemon=True)
            self._poll_thread.start()

    def stop(self):
        self._running = False
        if self.heartbeat_daemon:
            self.heartbeat_daemon.stop()
        logger.info("Worker stopped.")


def create_worker_app(worker: GPUWorker) -> FastAPI:
    """FastAPI app providing direct execution endpoint and health checks."""
    app = FastAPI(title="GPUChain Node Worker API", version="1.0.0")

    @app.get("/health")
    def health():
        hardware = detect_hardware(preferred_model=worker.gpu_model)
        return {
            "status": "online",
            "providerWallet": worker.provider_wallet,
            "gpuModel": hardware["gpu_name"],
            "vramMb": hardware["vram_total_mb"],
            "utilizationPct": hardware["utilization_pct"],
            "isEmulated": hardware.get("is_emulated", False)
        }

    @app.post("/execute")
    def execute(req: DirectInferenceRequest):
        try:
            return worker.process_job(req.model_dump())
        except Exception as e:
            logger.error(f"Execution error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return app


def main():
    parser = argparse.ArgumentParser(description="GPUChain Python GPU Worker")
    parser.add_argument("--backend-url", default="http://localhost:5000", help="GPUChain backend URL")
    parser.add_argument("--wallet", default="0x70997970C51812dc3A010C7d01b50e0d17dc79C8", help="Provider wallet address")
    parser.add_argument("--gpu-model", default="NVIDIA A10G Tensor Core", help="GPU model identifier")
    parser.add_argument("--port", type=int, default=8001, help="Worker HTTP port")
    parser.add_argument("--price", default="1.0", help="Price per inference job")
    args = parser.parse_args()

    worker = GPUWorker(
        backend_url=args.backend_url,
        provider_wallet=args.wallet,
        gpu_model=args.gpu_model,
        price_per_job=args.price,
        port=args.port
    )
    worker.start(enable_polling=True)

    app = create_worker_app(worker)
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
