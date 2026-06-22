// Pluggable LLM: prefer Anthropic if a key is set (premium), else a FREE local Ollama model (no key).
// This is what lets the showcase run a *real* model for free — the provider's choice, behind the paywall.
import axios from "axios";
import Anthropic from "@anthropic-ai/sdk";
import { cfg } from "../config.js";

const OLLAMA = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

export interface LlmResult { text: string; model: string; }

export async function complete(system: string, user: string, maxTokens = 400): Promise<LlmResult> {
  if (cfg.anthropicKey) {
    const claude = new Anthropic({ apiKey: cfg.anthropicKey });
    const msg = await claude.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, system,
      messages: [{ role: "user", content: user }],
    });
    const p = msg.content.find((c) => c.type === "text");
    return { text: p && p.type === "text" ? p.text : "", model: "claude-haiku-4-5" };
  }
  // Free, local, no API key.
  const r = await axios.post(`${OLLAMA}/api/chat`, {
    model: OLLAMA_MODEL, stream: false,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    options: { num_predict: maxTokens, temperature: 0.3 },
  }, { timeout: 120000 });
  return { text: (r.data?.message?.content || "").trim(), model: `ollama:${OLLAMA_MODEL}` };
}

// Which model would complete() use right now, or null if none reachable.
export async function llmAvailable(): Promise<string | null> {
  if (cfg.anthropicKey) return "claude-haiku-4-5";
  try { await axios.get(`${OLLAMA}/api/tags`, { timeout: 2500 }); return `ollama:${OLLAMA_MODEL}`; }
  catch { return null; }
}
