// Boots a live facilitator + demo Fractal Tools API and stays up — so external clients
// (e.g. the Python agent) can hit a real x402-gated endpoint. Creates a merchant+service in-process.
import { buildFacilitator } from "../facilitator/server.js";
import { buildDemoServer } from "../examples/demo-server.js";
import { pool } from "../facilitator/db.js";
import { createService } from "../facilitator/service.js";
import { newMerchant } from "../core/fb.js";
import { cfg } from "../config.js";

async function main() {
  const fac = await buildFacilitator();
  fac.listen(cfg.facilitatorPort);
  const m = await pool.query(
    `insert into merchants(address) values($1) on conflict (address) do update set address=excluded.address returning id`,
    [cfg.payerAddress]);
  const merchant = newMerchant();
  const service = await createService(m.rows[0].id, "Python demo service", merchant.xpub, 1000);
  buildDemoServer(service.api_key, cfg.facilitatorUrl).listen(4055);
  console.log(`DEMO_URL=http://127.0.0.1:4055/tools/balance?address=${cfg.payerAddress}`);
  console.log("STACK_READY");
}
main().catch((e) => { console.error(e); process.exit(1); });
