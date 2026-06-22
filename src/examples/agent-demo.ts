// THE VALUE SHOWCASE — why x402 exists.
//
// A human asks one natural-language question. An autonomous agent answers it by BUYING the on-chain
// data it needs (real Fractal Bitcoin micro-payments via x402, no card, no signup, no human), then
// reasoning over what it purchased with a real model (free local Ollama, or Claude if a key is set).
//
//   $ npm run agent:demo "Is bc1q… an active wallet, and does it hold any tokens?"
//
// Spends real FB from PAYER_WIF (a few thousand sats). This is the difference between "calling an
// endpoint" and "an agent that pays for what it needs to get a job done."
import { payAndFetch } from "../sdk/agent.js";
import { complete, llmAvailable } from "../core/llm.js";
import { cfg } from "../config.js";

const API = process.env.DEMO_API || "http://127.0.0.1:4055";

async function main() {
  const question = process.argv.slice(2).join(" ") ||
    `What is Fractal address ${cfg.payerAddress} doing? Is it active, and does it hold ordinals or BRC-20 tokens?`;
  const address = question.match(/bc1[a-z0-9]+/i)?.[0] || cfg.payerAddress;

  const model = await llmAvailable();
  if (!model) throw new Error("No model available — run Ollama (ollama serve) or set ANTHROPIC_API_KEY in .env.");

  console.log(`\n🧑 user:  ${question}`);
  console.log(`🤖 agent: model=${model}  ·  paying from ${cfg.payerAddress}`);
  console.log(`          target address: ${address}\n`);

  // The agent decides what facts it needs, then PAYS for each via x402 (one real FB tx per tool).
  const tools = [
    { name: "balance",      url: `${API}/tools/balance?address=${address}` },
    { name: "inscriptions", url: `${API}/tools/inscriptions?address=${address}` },
    { name: "brc20",        url: `${API}/tools/brc20?address=${address}` },
  ];
  const facts: Record<string, any> = {};
  let spent = 0;
  for (const t of tools) {
    process.stdout.write(`  💸 buy ${t.name.padEnd(13)} `);
    const r = await payAndFetch(t.url);
    facts[t.name] = r.data;
    spent += (r.paid || 0) + (r.fee || 0);
    console.log(r.txid ? `paid ${r.paid}+${r.fee} sat  →  tx ${String(r.txid).slice(0, 16)}…` : "(free)");
  }
  console.log(`\n  total FB spent: ${spent} sat\n`);

  // The agent reasons over what it just purchased and answers the human.
  const { text } = await complete(
    "You are a Fractal Bitcoin analyst. Using ONLY the JSON data provided, answer the user's question in " +
      "3-5 concrete sentences. Never invent data that isn't present.",
    `Question: ${question}\n\nData the agent purchased on-chain:\n${JSON.stringify(facts, null, 2)}`, 500);

  console.log("🧠 agent answer:\n");
  console.log(text.split("\n").map((l) => "   " + l).join("\n") + "\n");
  process.exit(0);
}
main().catch((e) => { console.error("ERROR:", e?.response?.data || e?.message || e); process.exit(1); });
