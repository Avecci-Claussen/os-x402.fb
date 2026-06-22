// AI e2e on Fractal MAINNET: the full agent loop with a REAL Claude call behind the paywall.
//   facilitator boots -> merchant signs in (BIP322) + registers a service (xpub)
//   -> demo "Fractal Tools API" runs /ai/summary behind the SDK (provider's Claude key, server-side)
//   -> agent GETs it, hits 402, pays a real 2-output FB tx -> facilitator verifies
//   -> provider fetches live FB data, Claude summarizes it -> agent gets real model output.
// COSTS REAL FB: 10,000 sats to merchant + facilitator fee, from PAYER_WIF. Needs ANTHROPIC_API_KEY.
import axios from "axios";
import { Signer } from "bip322-js";
import { buildFacilitator } from "../facilitator/server.js";
import { buildDemoServer } from "../examples/demo-server.js";
import { payAndFetch } from "../sdk/agent.js";
import { newMerchant } from "../core/fb.js";
import { cfg } from "../config.js";

async function main() {
  if (!cfg.anthropicKey) throw new Error("Set ANTHROPIC_API_KEY in .env to run the real-Claude e2e.");

  const fac = (await buildFacilitator()).listen(cfg.facilitatorPort);
  await new Promise((r) => setTimeout(r, 400));
  const F = axios.create({ baseURL: cfg.facilitatorUrl });

  const { message } = (await F.post("/v1/auth/challenge", { address: cfg.payerAddress })).data;
  const signature = Signer.sign(cfg.payerWif, cfg.payerAddress, message).toString();
  const { token } = (await F.post("/v1/auth/wallet", { address: cfg.payerAddress, signature })).data;

  const merchant = newMerchant();
  const service = (await F.post("/v1/services", { name: "AI Wallet Analyst", xpub: merchant.xpub, feeBps: 1000 },
    { headers: { authorization: `Bearer ${token}` } })).data;

  const demo = buildDemoServer(service.api_key, cfg.facilitatorUrl).listen(4055);
  await new Promise((r) => setTimeout(r, 300));

  console.log("\n--- Agent pays FB for /ai/summary; provider runs Claude on live on-chain data ---");
  const result = await payAndFetch(`http://127.0.0.1:4055/ai/summary?address=${cfg.payerAddress}`);
  console.log("MODEL:", result.data.model);
  console.log("CLAUDE SUMMARY:\n" + result.data.summary);
  console.log(`\npaid ${result.paid} sats to merchant, ${result.fee} sats facilitator fee, tx ${result.txid}`);

  demo.close(); fac.close();
  const ok = result?.data?.summary && result?.txid && result.data.model.startsWith("claude");
  console.log(ok ? "\n✅ AI E2E PASSED — real Claude output served for a real FB payment" : "\n❌ FAILED");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error("ERROR:", e?.response?.data || e?.message || e); process.exit(1); });
