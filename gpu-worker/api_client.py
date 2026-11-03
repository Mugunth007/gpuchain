"""
GPUChain Worker API Client
Handles REST communication with the GPUChain Backend orchestrator.
"""

import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger("GPUChain.APIClient")

class GPUChainAPIClient:
    def __init__(self, backend_url: str = "http://localhost:5000", api_key: Optional[str] = None):
        self.backend_url = backend_url.rstrip("/")
        self.api_key = api_key
        self.session = requests.Session()
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self.session.headers.update(headers)

    def register(self, provider_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Registers GPU worker node with backend."""
        url = f"{self.backend_url}/api/providers/register"
        logger.info(f"Registering provider at {url}...")
        resp = self.session.post(url, json=provider_payload, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def send_heartbeat(self, heartbeat_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Sends periodic hardware telemetry heartbeat."""
        url = f"{self.backend_url}/api/providers/heartbeat"
        resp = self.session.post(url, json=heartbeat_payload, timeout=8)
        resp.raise_for_status()
        return resp.json()

    def get_pending_jobs(self, provider_id: str) -> list:
        """Polls for newly assigned inference jobs for this provider."""
        url = f"{self.backend_url}/api/jobs"
        params = {"providerId": provider_id, "status": "ASSIGNED"}
        resp = self.session.get(url, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "jobs" in data:
            return data["jobs"]
        return data if isinstance(data, list) else []

    def complete_job(self, job_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Submits inference output and execution receipt for job completion and escrow release."""
        url = f"{self.backend_url}/api/jobs/{job_id}/complete"
        resp = self.session.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def fail_job(self, job_id: str, error_message: str) -> Dict[str, Any]:
        """Reports job execution failure."""
        url = f"{self.backend_url}/api/jobs/{job_id}/fail"
        resp = self.session.post(url, json={"error": error_message}, timeout=10)
        resp.raise_for_status()
        return resp.json()
