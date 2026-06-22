// Showcase service provider: a "Fractal Tools API" for AI agents — each tool call is paid in FB via x402.
// Backed by real Fractal data (UniSat). A provider plugs in their own valuable service the same way.
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requirePayment } from "../sdk/middleware.js";
import { getAddressBalance, getTxDetail } from "../core/unisat.js";
import { cfg } from "../config.js";

// Provider's own LLM, server-side. The caller pays FB per call (x402); the provider runs the model and
// can price the call above model cost. No key set => fall back to the static template (e2e still works).
const claude = cfg.anthropicKey ? new Anthropic({ apiKey: cfg.anthropicKey }) : null;

async function aiWalletSummary(b: Awaited<ReturnType<typeof getAddressBalance>>): Promise<string> {
  if (!claude) {
    return `This Fractal address holds ${b.fb} FB (${b.spendableSatoshi} spendable sats) across ${b.utxoCount} ` +
      `UTXOs, including ${b.inscriptionUtxoCount} inscription/asset UTXOs. (Set ANTHROPIC_API_KEY for a real LLM summary.)`;
  }
  const msg = await claude.messages.create({
    model: "claude-haiku-4-5-20251001", // cheap; bump to "claude-opus-4-8" for deeper analysis
    max_tokens: 300,
    system: "You are a Fractal Bitcoin on-chain analyst. Given a wallet's stats, write a concise, plain-English " +
      "summary (2-3 sentences) of what this address is doing. Be concrete; never invent data not given.",
    messages: [{ role: "user", content: `Fractal wallet data (JSON):\n${JSON.stringify(b, null, 2)}` }],
  });
  const part = msg.content.find((c) => c.type === "text");
  return part && part.type === "text" ? part.text : "(no summary)";
}

export function buildDemoServer(apiKey: string, facilitatorUrl: string) {
  const app = express();
  const pay = (price: number) => requirePayment({ facilitatorUrl, apiKey, price });

  // Free: list of tools (discovery)
  app.get("/tools", (_q, res) => res.json({
    tools: [
      { path: "/tools/balance?address=", price_sats: 2_000, desc: "FB balance + UTXO/inscription summary for an address" },
      { path: "/tools/tx?txid=",         price_sats: 2_000, desc: "Transaction detail (size, in/out sats, confirmations)" },
      { path: "/ai/summary?address=",    price_sats: 10_000, desc: "AI-style wallet summary (plug in your LLM)" },
    ],
  }));

  // Paid tools (FB per call)
  app.get("/tools/balance", pay(2_000), async (req, res) => {
    res.json(await getAddressBalance(String(req.query.address)));
  });
  app.get("/tools/tx", pay(2_000), async (req, res) => {
    res.json(await getTxDetail(String(req.query.txid)));
  });
  app.get("/ai/summary", pay(10_000), async (req, res) => {
    const b = await getAddressBalance(String(req.query.address));
    res.json({
      address: b.address,
      model: claude ? "claude-haiku-4-5" : "template",
      summary: await aiWalletSummary(b),
    });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , apiKey, facilitatorUrl = "http://127.0.0.1:4040"] = process.argv;
  if (!apiKey) throw new Error("usage: tsx demo-server.ts <serviceApiKey> [facilitatorUrl]");
  buildDemoServer(apiKey, facilitatorUrl).listen(4055, () => console.log("Fractal Tools API → http://127.0.0.1:4055"));
}
