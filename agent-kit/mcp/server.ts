#!/usr/bin/env npx tsx
/**
 * MCP server: one tool per live hero from GET /v1/tools.json.
 * Env: X402_API_URL, PAYER_WIF, PAYER_ADDRESS, optional MAX_AMOUNT_SATS / MAX_FEE_SATS
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { payAndFetch } from "../../api/src/sdk/agent.js";

const API = (process.env.X402_API_URL || process.env.API_PUBLIC_URL || "http://127.0.0.1:4050").replace(/\/$/, "");
const MAX = Number(process.env.MAX_AMOUNT_SATS || "50000");
const MAX_FEE = Number(process.env.MAX_FEE_SATS || "5000");

type Hero = {
  id: string; name: string; description: string; endpoint: string | null;
  price_sats: number; requires: string[]; live: boolean; sample_query?: string;
};

async function loadHeroes(): Promise<Hero[]> {
  const r = await fetch(`${API}/v1/tools.json`);
  if (!r.ok) throw new Error(`tools.json ${r.status}`);
  const j = await r.json();
  return (j.heroes || []).filter((h: Hero) => h.live && h.endpoint);
}

function toolName(id: string) {
  return `x402_${id.replace(/[^a-z0-9_]/gi, "_")}`;
}

const server = new Server(
  { name: "x402fb", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const heroes = await loadHeroes();
  return {
    tools: heroes.map((h) => ({
      name: toolName(h.id),
      description: `${h.name} — ${h.description} (${h.price_sats} sat FB via x402)`,
      inputSchema: {
        type: "object",
        properties: Object.fromEntries(
          (h.requires || []).map((k) => [k, { type: "string", description: k }]),
        ),
        required: h.requires || [],
      },
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const heroes = await loadHeroes();
  const h = heroes.find((x) => toolName(x.id) === req.params.name);
  if (!h?.endpoint) {
    return { content: [{ type: "text", text: `Unknown tool ${req.params.name}` }], isError: true };
  }
  const u = new URL(h.endpoint);
  const args = (req.params.arguments || {}) as Record<string, string>;
  for (const [k, v] of Object.entries(args)) {
    if (v != null && v !== "") u.searchParams.set(k, String(v));
  }
  try {
    const r = await payAndFetch(u.toString(), { maxAmountSats: MAX, maxFeeSats: MAX_FEE });
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          paid: r.paid, fee: r.fee, txid: r.txid, binding: r.binding, data: r.data,
        }, null, 2),
      }],
    };
  } catch (e: any) {
    return { content: [{ type: "text", text: String(e.message || e) }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => { console.error(e); process.exit(1); });
