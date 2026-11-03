"""
Unit and Integration Tests for GPU Worker
Tests hardware detection, inference execution, receipt signing, and health endpoints.
"""

import unittest
from hardware_detection import detect_hardware, query_nvidia_smi
from inference import execute_inference, ALLOWED_MODELS
from worker import WorkerSigner, GPUWorker, DirectInferenceRequest

class TestGPUWorker(unittest.TestCase):
    def test_hardware_detection(self):
        hw = detect_hardware()
        self.assertIn("gpu_name", hw)
        self.assertIn("vram_total_mb", hw)
        self.assertIn("utilization_pct", hw)
        self.assertGreaterEqual(hw["vram_total_mb"], 1024)
        self.assertTrue(hw["detected"])

    def test_hardware_detection_custom_model(self):
        hw = detect_hardware(preferred_model="NVIDIA RTX 4090")
        self.assertIn("RTX 4090", hw["gpu_name"])

    def test_inference_execution(self):
        result = execute_inference("Decentralized AI on Avalanche Fuji", model_key="gpt2", max_new_tokens=25)
        self.assertTrue(result["success"])
        self.assertIn("Decentralized AI", result["output"])
        self.assertGreater(result["completion_tokens"], 0)
        self.assertGreater(result["duration_ms"], 0)
        self.assertGreater(result["tokens_per_sec"], 0)

    def test_receipt_signing(self):
        signer = WorkerSigner()
        receipt = {
            "jobId": "job-test-123",
            "providerAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "model": "gpt2",
            "outputHash": "0x1234567890abcdef",
            "promptTokens": 10,
            "completionTokens": 25,
            "durationMs": 150.0,
            "completedAt": 1700000000
        }
        sig = signer.sign_receipt(receipt)
        self.assertTrue(sig.startswith("0x"))
        self.assertGreater(len(sig), 20)

    def test_process_job(self):
        worker = GPUWorker(
            backend_url="http://localhost:5000",
            provider_wallet="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            gpu_model="NVIDIA A10G Tensor Core"
        )
        job_payload = {
            "id": "job-unit-001",
            "prompt": "Decentralized GPU marketplace",
            "model": "gpt2",
            "maxTokens": 20
        }
        res = worker.process_job(job_payload)
        self.assertTrue(res["success"])
        self.assertEqual(res["jobId"], "job-unit-001")
        self.assertIn("receipt", res)
        self.assertIn("signature", res)
        self.assertTrue(res["signature"].startswith("0x"))

if __name__ == "__main__":
    unittest.main()
