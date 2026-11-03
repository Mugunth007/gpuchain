"""
GPUChain Worker Heartbeat Daemon
Sends periodic GPU telemetry to the backend orchestrator every 15 seconds.
"""

import time
import threading
import logging
from typing import Optional, Callable
from hardware_detection import detect_hardware
from api_client import GPUChainAPIClient

logger = logging.getLogger("GPUChain.Heartbeat")

class HeartbeatDaemon:
    def __init__(
        self,
        api_client: GPUChainAPIClient,
        provider_id: str,
        wallet_address: str,
        interval_seconds: int = 15,
        on_error: Optional[Callable[[Exception], None]] = None
    ):
        self.api_client = api_client
        self.provider_id = provider_id
        self.wallet_address = wallet_address
        self.interval_seconds = interval_seconds
        self.on_error = on_error
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        """Starts the background heartbeat thread."""
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True, name="HeartbeatDaemon")
        self._thread.start()
        logger.info(f"Heartbeat daemon started (interval: {self.interval_seconds}s)")

    def stop(self):
        """Stops the heartbeat thread."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=3)
        logger.info("Heartbeat daemon stopped.")

    def _run(self):
        while not self._stop_event.is_set():
            try:
                hardware_info = detect_hardware()
                payload = {
                    "providerId": self.provider_id,
                    "walletAddress": self.wallet_address,
                    "timestamp": int(time.time()),
                    "telemetry": {
                        "gpuName": hardware_info.get("gpu_name"),
                        "vramTotalMb": hardware_info.get("vram_total_mb"),
                        "vramUsedMb": hardware_info.get("vram_used_mb"),
                        "vramFreeMb": hardware_info.get("vram_free_mb"),
                        "utilizationPct": hardware_info.get("utilization_pct"),
                        "temperatureC": hardware_info.get("temperature_c"),
                        "powerDrawW": hardware_info.get("power_draw_w"),
                        "isEmulated": hardware_info.get("is_emulated", False)
                    }
                }
                self.api_client.send_heartbeat(payload)
                logger.debug(f"Heartbeat sent for provider {self.provider_id}")
            except Exception as e:
                logger.warning(f"Failed to send heartbeat: {e}")
                if self.on_error:
                    self.on_error(e)

            # Wait for interval or until stopped
            self._stop_event.wait(self.interval_seconds)
