"use client";
import { FACILITATOR_URL } from "./brand";

const TOKEN_KEY = "turnpike_token";
export const getToken = () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const logout = () => { localStorage.removeItem(TOKEN_KEY); location.href = "/connect"; };

async function call(path: string, opts: RequestInit = {}, auth = false) {
  const headers: Record<string, string> = { "content-type": "application/json", ...(opts.headers as any) };
  if (auth) {
    const t = getToken();
    if (!t) { location.href = "/connect"; throw new Error("not logged in"); }
    headers.authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${FACILITATOR_URL}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
  return data;
}

export const api = {
  // Wallet sign-in (UniSat)
  challenge: (address: string) => call("/v1/auth/challenge", { method: "POST", body: JSON.stringify({ address }) }),
  walletLogin: (address: string, signature: string) =>
    call("/v1/auth/wallet", { method: "POST", body: JSON.stringify({ address, signature }) }),
  // Merchant data
  stats: () => call("/v1/stats", {}, true),
  usage: () => call("/v1/usage", {}, true),
  services: () => call("/v1/services", {}, true),
  createService: (name: string, xpub: string, feeBps: number) =>
    call("/v1/services", { method: "POST", body: JSON.stringify({ name, xpub, feeBps }) }, true),
  payments: (id: string) => call(`/v1/services/${id}/payments`, {}, true),
};
