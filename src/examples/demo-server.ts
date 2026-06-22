// Showcase service provider: a "Fractal Tools API" for AI agents — each tool call is paid in FB via x402.
// Backed by real Fractal data (UniSat). A provider plugs in their own valuable service the same way.
import express from "express";
import cors from "cors";
import { requirePayment } from "../sdk/middleware.js";
import {
  getAddressBalance, getTxDetail, getInscriptionSummary, getBrc20Summary, getRunesBalances, getChainInfo,
} from "../core/unisat.js";
import { complete } from "../core/llm.js";

// The catalog — single source of truth for both discovery (/tools) and routing.
const CATALOG = [
  { path: "/tools/balance",      price: 2_000,  desc: "FB balance, spendable sats, UTXO + inscription counts for an address" },
  { path: "/tools/inscriptions", price: 2_000,  desc: "Ordinals/inscriptions held by an address (count + sample)" },
  { path: "/tools/brc20",        price: 2_000,  desc: "BRC-20 token balances for an address" },
  { path: "/tools/runes",        price: 2_000,  desc: "Runes balances for an address" },
  { path: "/tools/tx",           price: 2_000,  desc: "Transaction detail (txid → size, in/out sats, confirmations)" },
  { path: "/tools/chain",        price: 1_000,  desc: "Fractal chain tip — height, best block hash, median time" },
  { path: "/ai/summary",         price: 10_000, desc: "AI analyst: plain-English summary of an address (real Claude call)" },
] as const;

export function buildDemoServer(apiKey: string, facilitatorUrl: string) {
  const app = express();
  // Browser clients (the dashboard Playground) call these endpoints cross-origin; allow it, and expose
  // the x402 payment headers so a wallet-driven pay→retry works from the browser. This is what fixes
  // the "Failed to fetch" you hit — the provider must opt browsers in.
  app.use(cors({ exposedHeaders: ["X-PAYMENT-CONFIRMED"], allowedHeaders: ["Content-Type", "X-PAYMENT-NONCE", "X-PAYMENT-TXID"] }));

  const pay = (price: number) => requirePayment({ facilitatorUrl, apiKey, price });

  // Free discovery — what an agent reads to find and price the tools.
  app.get("/tools", (_q, res) => res.json({
    service: "Fractal Tools API",
    asset: "FB",
    tools: CATALOG.map((t) => ({ ...t, price_sats: t.price })),
  }));

  // Paid tools (FB per call)
  app.get("/tools/balance",      pay(2_000), async (req, res) => res.json(await getAddressBalance(String(req.query.address))));
  app.get("/tools/inscriptions", pay(2_000), async (req, res) => res.json(await getInscriptionSummary(String(req.query.address))));
  app.get("/tools/brc20",        pay(2_000), async (req, res) => res.json(await getBrc20Summary(String(req.query.address))));
  app.get("/tools/runes",        pay(2_000), async (req, res) => res.json(await getRunesBalances(String(req.query.address))));
  app.get("/tools/tx",           pay(2_000), async (req, res) => res.json(await getTxDetail(String(req.query.txid))));
  app.get("/tools/chain",        pay(1_000), async (_req, res) => res.json(await getChainInfo()));
  app.get("/ai/summary",         pay(10_000), async (req, res) => {
    const b = await getAddressBalance(String(req.query.address));
    const { text, model } = await complete(
      "You are a Fractal Bitcoin on-chain analyst. Using ONLY the JSON given, write a concise (2-3 sentence) " +
        "plain-English summary of what this address is doing. Be concrete; never invent data not given.",
      `Fractal wallet data:\n${JSON.stringify(b, null, 2)}`, 300);
    res.json({ address: b.address, model, summary: text });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , apiKey, facilitatorUrl = "http://127.0.0.1:4040"] = process.argv;
  if (!apiKey) throw new Error("usage: tsx demo-server.ts <serviceApiKey> [facilitatorUrl]");
  buildDemoServer(apiKey, facilitatorUrl).listen(4055, () => console.log("Fractal Tools API → http://127.0.0.1:4055"));
}
