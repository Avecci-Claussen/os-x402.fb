// FULL SaaS e2e on Fractal MAINNET:
//   facilitator boots -> merchant signs up -> creates a service (xpub) -> runs a demo API behind the SDK
//   -> an agent calls it, hits 402, pays a real 2-output FB tx -> facilitator verifies -> resource served
//   -> facilitator records the paid call + our fee.
import axios from "axios";
import { Signer } from "bip322-js";
import { buildFacilitator } from "../facilitator/server.js";
import { buildDemoServer } from "../examples/demo-server.js";
import { payAndFetch } from "../sdk/agent.js";
import { newMerchant } from "../core/fb.js";
import { cfg } from "../config.js";

async function main() {
  const facApp = await buildFacilitator();
  const fac = facApp.listen(cfg.facilitatorPort);
  await new Promise((r) => setTimeout(r, 400));
  const F = axios.create({ baseURL: cfg.facilitatorUrl });

  // 1. merchant signs in with their FB wallet (UniSat-style BIP322: challenge -> sign -> verify)
  const { message } = (await F.post("/v1/auth/challenge", { address: cfg.payerAddress })).data;
  const signature = Signer.sign(cfg.payerWif, cfg.payerAddress, message).toString();
  const { token } = (await F.post("/v1/auth/wallet", { address: cfg.payerAddress, signature })).data;
  console.log("wallet sign-in OK (BIP322) for", cfg.payerAddress);

  // 2. merchant registers a service with their own FB xpub (non-custodial)
  const merchant = newMerchant();
  console.log("merchant recovery mnemonic:", merchant.mnemonic);
  const service = (await F.post("/v1/services", { name: "Demo AI/API", xpub: merchant.xpub, feeBps: 1000 },
    { headers: { authorization: `Bearer ${token}` } })).data;
  console.log("service api key:", service.api_key);

  // 3. merchant runs their API behind the SDK middleware (points at the hosted facilitator)
  const demo = buildDemoServer(service.api_key, cfg.facilitatorUrl).listen(4055);
  await new Promise((r) => setTimeout(r, 300));

  // 4. an agent consumes a real paid tool, auto-paying the 402 on mainnet
  console.log("\n--- Agent calls the Fractal Tools API /tools/balance via the hosted facilitator ---");
  const result = await payAndFetch(`http://127.0.0.1:4055/tools/balance?address=${cfg.payerAddress}`);
  console.log("RESULT:\n" + JSON.stringify(result, null, 2));

  // 5. facilitator accounting
  const stats = (await F.get("/v1/stats", { headers: { authorization: `Bearer ${token}` } })).data;
  console.log("FACILITATOR STATS:\n" + JSON.stringify(stats, null, 2));

  demo.close(); fac.close();
  const ok = result?.data && result?.txid && Number(stats.paid_calls) >= 1 && Number(stats.facilitator_fees) > 0;
  console.log(ok
    ? `\n✅ FULL SaaS E2E PASSED — merchant earned ${result.paid} sats, facilitator fee ${result.fee} sats, tx ${result.txid}`
    : "\n❌ FAILED");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error("ERROR:", e?.response?.data || e?.message || e); process.exit(1); });
