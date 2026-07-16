/** FB/USDT spot oracle — display-only USD estimates. Settlement stays in sats. */
const CACHE_MS = 45_000;
const MEXC = "https://api.mexc.com/api/v3/ticker/price?symbol=FBUSDT";
const COINEX = "https://api.coinex.com/v2/spot/ticker?market=FBUSDT";

export type PriceSource = { exchange: string; usdPerFb: number; ok: boolean; error?: string };
export type FbPrice = {
  usdPerFb: number;
  satsPerUsd: number;
  sources: PriceSource[];
  asOf: string;
  note: string;
};

let cache: { at: number; value: FbPrice } | null = null;

async function fetchJson(url: string, ms = 8_000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function mexc(): Promise<PriceSource> {
  try {
    const j = await fetchJson(MEXC);
    const n = Number(j?.price);
    if (!Number.isFinite(n) || n <= 0) throw new Error("bad price");
    return { exchange: "mexc", usdPerFb: n, ok: true };
  } catch (e: any) {
    return { exchange: "mexc", usdPerFb: 0, ok: false, error: e?.message || String(e) };
  }
}

async function coinex(): Promise<PriceSource> {
  try {
    const j = await fetchJson(COINEX);
    const row = Array.isArray(j?.data) ? j.data[0] : j?.data;
    const n = Number(row?.last ?? row?.close);
    if (!Number.isFinite(n) || n <= 0) throw new Error("bad price");
    return { exchange: "coinex", usdPerFb: n, ok: true };
  } catch (e: any) {
    return { exchange: "coinex", usdPerFb: 0, ok: false, error: e?.message || String(e) };
  }
}

function median(nums: number[]): number {
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}

/** Cached dual-source FB/USDT median, treated as ≈ USD for display. */
export async function getFbUsdPrice(): Promise<FbPrice> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const sources = await Promise.all([mexc(), coinex()]);
  const ok = sources.filter((s) => s.ok && s.usdPerFb > 0).map((s) => s.usdPerFb);
  if (!ok.length) {
    if (cache) return cache.value;
    throw new Error("FB/USDT price unavailable from MEXC and CoinEx");
  }

  const usdPerFb = Number(median(ok).toFixed(8));
  const value: FbPrice = {
    usdPerFb,
    satsPerUsd: Math.round(1e8 / usdPerFb),
    sources,
    asOf: new Date().toISOString(),
    note: "USD estimate from FB/USDT spot (USDT ≈ USD). Settlement is always in FB sats.",
  };
  cache = { at: Date.now(), value };
  return value;
}

/** Convert sat amount to approximate USD using a known usdPerFb. */
export function satsToUsd(sats: number, usdPerFb: number): number {
  return (Number(sats) / 1e8) * usdPerFb;
}
