#!/usr/bin/env npx tsx
/**
 * OpenClaw-style thin runner: list heroes from tools.json, pay & call with payAndFetch.
 *
 *   npx tsx wrapper.ts list
 *   npx tsx wrapper.ts call balance --address=bc1q…
 */
const API = (process.env.X402_API_URL || process.env.API_PUBLIC_URL || "http://127.0.0.1:4050").replace(/\/$/, "");
const MAX = Number(process.env.MAX_AMOUNT_SATS || "50000");
const MAX_FEE = Number(process.env.MAX_FEE_SATS || "5000");

async function toolsJson() {
  const r = await fetch(`${API}/v1/tools.json`);
  if (!r.ok) throw new Error(`tools.json ${r.status}`);
  return r.json();
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const [cmd, heroId, ...rest] = process.argv.slice(2);
  const flags = parseArgs(rest);

  if (!cmd || cmd === "help") {
    console.log(`Usage:
  wrapper.ts list
  wrapper.ts call <heroId> [--address=…] [--txid=…]
API: ${API}`);
    return;
  }

  const pack = await toolsJson();
  const heroes: any[] = pack.heroes || [];

  if (cmd === "list") {
    for (const h of heroes) {
      console.log(`${h.live ? "●" : "○"} ${h.id.padEnd(14)} ${String(h.price_sats).padStart(6)} sat  ${h.name}`);
      if (h.endpoint) console.log(`   ${h.endpoint}`);
    }
    if (pack.settle) console.log("\nsettle:", pack.settle.prefer, "—", pack.settle.note);
    return;
  }

  if (cmd === "call") {
    // Lazy-load so `list` works without local .env / DB
    const { payAndFetch } = await import("../../api/src/sdk/agent.js");
    const h = heroes.find((x) => x.id === heroId);
    if (!h?.endpoint) throw new Error(`unknown or offline hero: ${heroId}`);
    const u = new URL(h.endpoint);
    for (const [k, v] of Object.entries(flags)) u.searchParams.set(k, v);
    console.log("→", u.toString());
    const r = await payAndFetch(u.toString(), {
      maxAmountSats: MAX,
      maxFeeSats: MAX_FEE,
    });
    console.log(JSON.stringify({ paid: r.paid, fee: r.fee, txid: r.txid, binding: r.binding, data: r.data }, null, 2));
    return;
  }

  throw new Error(`unknown command ${cmd}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
