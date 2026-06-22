// Pluggable LLM used by provider endpoints (server-side — never the caller's machine).
// Resolution order, all configured by the SERVER operator/provider, not the end user:
//   1. Anthropic (Claude)            — set ANTHROPIC_API_KEY
//   2. Any OpenAI-compatible host    — set LLM_API_BASE + LLM_API_KEY + LLM_MODEL
//      (works with free/cheap hosted providers: Groq, OpenRouter, Together, DeepInfra, …)
//   3. Local Ollama                  — local-dev fallback only (http://127.0.0.1:11434)
// For the public test playground, the operator sets one hosted key (option 2) so anyone can try it
// without running a model themselves.
import axios from "axios";
import Anthropic from "@anthropic-ai/sdk";
import { cfg } from "../config.js";

const LLM_API_BASE = process.env.LLM_API_BASE || "";          // e.g. https://api.groq.com/openai/v1
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "llama-3.1-8b-instant";
const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

export interface LlmResult { text: string; model: string; }

export async function complete(system: string, user: string, maxTokens = 400): Promise<LlmResult> {
  // 1. Anthropic
  if (cfg.anthropicKey) {
    const claude = new Anthropic({ apiKey: cfg.anthropicKey });
    const msg = await claude.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, system,
      messages: [{ role: "user", content: user }],
    });
    const p = msg.content.find((c) => c.type === "text");
    return { text: p && p.type === "text" ? p.text : "", model: "claude-haiku-4-5" };
  }
  // 2. Hosted, OpenAI-compatible (the recommended setup for a shared playground)
  if (LLM_API_BASE && LLM_API_KEY) {
    const r = await axios.post(`${LLM_API_BASE}/chat/completions`, {
      model: LLM_MODEL, max_tokens: maxTokens, temperature: 0.3,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }, { headers: { authorization: `Bearer ${LLM_API_KEY}` }, timeout: 60000 });
    return { text: (r.data?.choices?.[0]?.message?.content || "").trim(), model: LLM_MODEL };
  }
  // 3. Local Ollama (dev fallback)
  const r = await axios.post(`${OLLAMA}/api/chat`, {
    model: OLLAMA_MODEL, stream: false,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    options: { num_predict: maxTokens, temperature: 0.3 },
  }, { timeout: 120000 });
  return { text: (r.data?.message?.content || "").trim(), model: `ollama:${OLLAMA_MODEL}` };
}

// Which model complete() would use right now, or null if none reachable.
export async function llmAvailable(): Promise<string | null> {
  if (cfg.anthropicKey) return "claude-haiku-4-5";
  if (LLM_API_BASE && LLM_API_KEY) return LLM_MODEL;
  try { await axios.get(`${OLLAMA}/api/tags`, { timeout: 2500 }); return `ollama:${OLLAMA_MODEL}`; }
  catch { return null; }
}
