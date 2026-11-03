"""
GPUChain Hardware Detection Module
Queries nvidia-smi for NVIDIA GPU telemetry (model, VRAM total, VRAM used, utilization, temperature, power)
with robust fallback simulation for environments without physical NVIDIA GPUs.
"""

import os
import shutil
import subprocess
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("GPUChain.Hardware")

def query_nvidia_smi() -> Optional[Dict[str, Any]]:
    """
    Executes nvidia-smi command and parses structured GPU telemetry.
    Returns None if nvidia-smi is not found or fails.
    """
    nvidia_smi_path = shutil.which("nvidia-smi")
    if not nvidia_smi_path:
        # Check standard Windows paths
        win_path = r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe"
        if os.path.exists(win_path):
            nvidia_smi_path = win_path

    if not nvidia_smi_path:
        return None

    try:
        cmd = [
            nvidia_smi_path,
            "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw",
            "--format=csv,noheader,nounits"
        ]
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
            check=True
        )
        output = result.stdout.strip()
        if not output:
            return None

        lines = output.splitlines()
        first_gpu = lines[0].split(",")
        if len(first_gpu) >= 6:
            name = first_gpu[0].strip()
            total_vram_mb = int(float(first_gpu[1].strip()))
            used_vram_mb = int(float(first_gpu[2].strip()))
            free_vram_mb = int(float(first_gpu[3].strip()))
            utilization_pct = int(float(first_gpu[4].strip()))
            temp_c = int(float(first_gpu[5].strip()))
            power_w = float(first_gpu[6].strip()) if len(first_gpu) > 6 else 65.0

            return {
                "detected": True,
                "gpu_name": name,
                "vram_total_mb": total_vram_mb,
                "vram_used_mb": used_vram_mb,
                "vram_free_mb": free_vram_mb,
                "utilization_pct": utilization_pct,
                "temperature_c": temp_c,
                "power_draw_w": round(power_w, 1),
                "is_emulated": False
            }
    except Exception as e:
        logger.warning(f"Error querying nvidia-smi: {e}")
        return None

    return None


def detect_hardware(preferred_model: Optional[str] = None) -> Dict[str, Any]:
    """
    Detects GPU hardware or returns emulated A10G/RTX4090 telemetry.
    """
    real_gpu = query_nvidia_smi()
    if real_gpu:
        return real_gpu

    # Emulated hardware profile for testing and environments without physical NVIDIA GPUs
    model_name = preferred_model or os.getenv("GPU_MODEL", "NVIDIA A10G Tensor Core")
    total_vram = int(os.getenv("GPU_VRAM_MB", "24576")) # 24GB
    
    import random
    # Dynamic slight jitter for realistic telemetry monitoring
    util_jitter = random.randint(12, 28)
    temp_jitter = random.randint(48, 58)
    power_jitter = round(random.uniform(68.0, 95.0), 1)
    vram_used = random.randint(2400, 3800)

    return {
        "detected": True,
        "gpu_name": model_name,
        "vram_total_mb": total_vram,
        "vram_used_mb": vram_used,
        "vram_free_mb": total_vram - vram_used,
        "utilization_pct": util_jitter,
        "temperature_c": temp_c if 'temp_c' in locals() else temp_jitter,
        "power_draw_w": power_jitter,
        "is_emulated": True
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    hw = detect_hardware()
    print("Detected Hardware Telemetry:")
    for k, v in hw.items():
        print(f"  {k}: {v}")
