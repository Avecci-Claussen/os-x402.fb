// Generates a test HD wallet, registers it as a service, prints credentials for testing.
import * as bip39 from "bip39";
import { bip32, FB_NETWORK, p2wpkh } from "../src/core/fb.js";
import { pool } from "../src/facilitator/db.js";
import { initDb } from "../src/facilitator/db.js";
import { createService } from "../src/facilitator/service.js";

async function main() {
  await initDb();
  const mnemonic = bip39.generateMnemonic();
  const acct = bip32.fromSeed(bip39.mnemonicToSeedSync(mnemonic), FB_NETWORK).derivePath("m/84'/0'/0'");
  const xprv = acct.toBase58();
  const xpub = acct.neutered().toBase58();
  const firstAddress = p2wpkh(acct.derive(0).derive(0).publicKey);

  const m = await pool.query(
    `insert into merchants(address) values($1) on conflict (address) do update set address=excluded.address returning id`,
    [firstAddress]);
  const svc = await createService(m.rows[0].id, "Test service", xpub, 1000);

  console.log(JSON.stringify({
    mnemonic, xprv, xpub, firstAddress, apiKey: svc.api_key, serviceId: svc.id,
    note: "xprv/xpub are BIP84 account-level (m/84'/0'/0'). Import the mnemonic/xprv to control received funds.",
  }, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
