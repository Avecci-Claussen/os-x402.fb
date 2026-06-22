// Show-the-interface demo — NO payment, NO FB spent, NO Claude key needed.
// Boots the real facilitator + demo API, registers a service, then shows exactly what a consumer/agent
// sees: the free discovery list, and the HTTP 402 "payment required" interface for a paid endpoint.
import axios from "axios";
import { Signer } from "bip322-js";
import { buildFacilitator } from "../facilitator/server.js";
import { buildDemoServer } from "../examples/demo-server.js";
import { newMerchant } from "../core/fb.js";
import { cfg } from "../config.js";

async function main() {
  const fac = (await buildFacilitator()).listen(cfg.facilitatorPort);
  await new Promise((r) => setTimeout(r, 400));
  const F = axios.create({ baseURL: cfg.facilitatorUrl });

  // operator/merchant setup (one-time, what the dashboard does for you)
  const { message } = (await F.post("/v1/auth/challenge", { address: cfg.payerAddress })).data;
  const signature = Signer.sign(cfg.payerWif, cfg.payerAddress, message).toString();
  const { token } = (await F.post("/v1/auth/wallet", { address: cfg.payerAddress, signature })).data;
  const merchant = newMerchant();
  const service = (await F.post("/v1/services", { name: "Fractal Tools API", xpub: merchant.xpub, feeBps: 1000 },
    { headers: { authorization: `Bearer ${token}` } })).data;
  const demo = buildDemoServer(service.api_key, cfg.facilitatorUrl).listen(4055);
  await new Promise((r) => setTimeout(r, 300));

  console.log("\n================ WHAT A USER/AGENT SEES ================\n");

  console.log("1) FREE discovery — GET /tools (no payment):");
  console.log(JSON.stringify((await axios.get("http://127.0.0.1:4055/tools")).data, null, 2));

  console.log("\n2) PAID call WITHOUT paying — GET /ai/summary -> the x402 interface:");
  try {
    await axios.get(`http://127.0.0.1:4055/ai/summary?address=${cfg.payerAddress}`);
  } catch (e: any) {
    if (e.response?.status !== 402) throw e;
    console.log("   HTTP 402 Payment Required. Body the agent receives:");
    console.log(JSON.stringify(e.response.data, null, 2));
    const r = e.response.data.accepts[0];
    console.log(`\n   => Agent must send a Fractal tx paying ${r.amount} sats to ${r.payTo}`);
    console.log(`      + ${r.facilitatorFee.amount} sats facilitator fee to ${r.facilitatorFee.address} (operator's cut),`);
    console.log(`      then retry with headers X-PAYMENT-NONCE / X-PAYMENT-TXID. No payment was made here.`);
  }

  console.log("\n=======================================================\n");
  demo.close(); fac.close(); process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e?.response?.data || e?.message || e); process.exit(1); });
