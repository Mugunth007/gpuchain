import test from "node:test";
import assert from "node:assert";
import http from "http";
import { app, server } from "./index";
import { ethers } from "ethers";

const PORT = 5001;

async function request(path: string, options: any = {}) {
  const url = `http://localhost:${PORT}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

test("Backend API Suite", async (t) => {
  // Start server on test port
  await new Promise<void>((resolve) => {
    server.close(() => {
      server.listen(PORT, () => resolve());
    });
  });

  await t.test("GET /health returns 200 OK", async () => {
    const res = await request("/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "ok");
    assert.ok(res.data.network);
  });

  await t.test("GET /api/config returns contract addresses and Fuji chainId", async () => {
    const res = await request("/api/config");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.chainId, 43113);
    assert.ok(res.data.contracts.escrow);
    assert.ok(res.data.contracts.registry);
    assert.ok(res.data.contracts.token);
  });

  await t.test("GET /api/providers returns list and supports filters", async () => {
    const res = await request("/api/providers");
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.total >= 3);
    assert.ok(res.data.providers.some((p: any) => p.gpuModel.includes("A10G")));

    // Test filter
    const filterRes = await request("/api/providers?model=A10G");
    assert.strictEqual(filterRes.status, 200);
    assert.ok(filterRes.data.providers.every((p: any) => p.gpuModel.includes("A10G")));
  });

  await t.test("POST /api/providers/register creates or updates provider", async () => {
    const testWallet = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
    const regRes = await request("/api/providers/register", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: testWallet,
        gpuModel: "NVIDIA RTX 3080",
        vramMb: 10240,
        pricePerJob: "0.15"
      })
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.data.provider.gpuModel, "NVIDIA RTX 3080");

    // Heartbeat
    const hbRes = await request("/api/providers/heartbeat", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: testWallet,
        telemetry: { utilizationPct: 45, temperatureC: 60 }
      })
    });
    assert.strictEqual(hbRes.status, 200);
    assert.strictEqual(hbRes.data.status, "alive");
  });

  await t.test("POST /api/inference executes job and generates verifier signature", async () => {
    const devWallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const infRes = await request("/api/inference", {
      method: "POST",
      body: JSON.stringify({
        developerAddress: devWallet,
        prompt: "Avalanche Fuji decentralized AI inference test",
        model: "gpt2",
        maxTokens: 30
      })
    });

    assert.strictEqual(infRes.status, 200);
    assert.strictEqual(infRes.data.success, true);
    assert.ok(infRes.data.output);
    assert.ok(infRes.data.metrics.tokensPerSec > 0);
    assert.ok(infRes.data.verifierSignature.startsWith("0x"));
    assert.ok(infRes.data.job.status === "COMPLETED");
  });

  await t.test("GET /api/analytics/network returns valid network telemetry", async () => {
    const res = await request("/api/analytics/network");
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.totalGpus >= 3);
    assert.ok(res.data.totalComputeHours > 0);
    assert.ok(Array.isArray(res.data.hourlyUtilization));
  });

  await t.test("Auth flow: Nonce request and verification", async () => {
    const wallet = ethers.Wallet.createRandom();
    const nonceRes = await request(`/api/auth/nonce?address=${wallet.address}`);
    assert.strictEqual(nonceRes.status, 200);
    assert.ok(nonceRes.data.nonce);

    const signature = await wallet.signMessage(nonceRes.data.nonce);
    const verifyRes = await request("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({
        address: wallet.address,
        nonce: nonceRes.data.nonce,
        signature
      })
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.data.success, true);
    assert.ok(verifyRes.data.token);
  });

  // Teardown
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});
