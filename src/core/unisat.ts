// UniSat Open API (Fractal mainnet): cardinal UTXOs, tx outputs (verification), broadcast.
import axios from "axios";
import { cfg } from "../config.js";

const http = axios.create({
  baseURL: cfg.unisatBase,
  headers: { Authorization: `Bearer ${cfg.unisatKey}` },
  timeout: 20000,
});

export interface Utxo { txid: string; vout: number; satoshi: number; scriptPk: string; }

// Cardinal (non-inscription) UTXOs only — never spend inscription/asset UTXOs.
export async function getCardinalUtxos(address: string): Promise<Utxo[]> {
  const r = await http.get(`/v1/indexer/address/${address}/utxo-data`, { params: { cursor: 0, size: 100 } });
  return ((r.data?.data?.utxo ?? []) as any[])
    .filter((u) => (u.inscriptionsCount ?? 0) === 0 && (!u.inscriptions || u.inscriptions.length === 0))
    .map((u) => ({ txid: u.txid, vout: u.vout, satoshi: u.satoshi, scriptPk: u.scriptPk }));
}

export interface TxOut { vout: number; address: string; satoshi: number; }
export async function getTxOuts(txid: string): Promise<TxOut[] | null> {
  try {
    const r = await http.get(`/v1/indexer/tx/${txid}/outs`);
    const outs = r.data?.data;
    return Array.isArray(outs) ? outs.map((o: any) => ({ vout: o.vout, address: o.address, satoshi: o.satoshi })) : null;
  } catch { return null; }
}

export async function broadcast(txHex: string): Promise<string> {
  const r = await http.post(`/v1/indexer/local_pushtx`, { txHex });
  if (r.data?.code !== 0) throw new Error(`broadcast failed: ${r.data?.msg}`);
  return r.data.data as string;
}

// --- Fractal data tools (showcase: things an AI agent pays per-call to read) ---
export async function getAddressBalance(address: string) {
  const r = await http.get(`/v1/indexer/address/${address}/balance`);
  const d = r.data?.data ?? {};
  return {
    address,
    fb: Number(d.satoshi || 0) / 1e8,
    satoshi: Number(d.satoshi || 0),
    spendableSatoshi: Number(d.btcSatoshi || 0),
    inscriptionUtxoCount: Number(d.inscriptionUtxoCount || 0),
    utxoCount: Number(d.utxoCount || 0),
  };
}

export async function getTxDetail(txid: string) {
  const r = await http.get(`/v1/indexer/tx/${txid}`);
  return r.data?.data ?? null;
}

/** Confirmation depth from UniSat tx detail (fallback oracle for policy only). */
export async function getTxConfirmations(txid: string): Promise<number | null> {
  try {
    const d = await getTxDetail(txid);
    if (!d) return null;
    if (typeof d.confirmations === "number") return d.confirmations;
    if (typeof d.height === "number" && d.height > 0) {
      // if only height is present, treat mined as ≥1
      return 1;
    }
    return 0;
  } catch {
    return null;
  }
}

// Inscriptions/ordinals held by an address (count + a sample).
export async function getInscriptionSummary(address: string) {
  const r = await http.get(`/v1/indexer/address/${address}/inscription-data`, { params: { cursor: 0, size: 5 } });
  const d = r.data?.data ?? {};
  return {
    address,
    totalInscriptions: Number(d.total || 0),
    confirmed: Number(d.totalConfirmed || 0),
    unconfirmed: Number(d.totalUnconfirmed || 0),
    sample: (d.inscription ?? []).map((i: any) => ({
      inscriptionId: i.inscriptions?.[0]?.inscriptionId, txid: i.utxo?.txid, sats: i.utxo?.satoshi,
    })),
  };
}

// BRC-20 token balances for an address.
export async function getBrc20Summary(address: string) {
  const r = await http.get(`/v1/indexer/address/${address}/brc20/summary`, { params: { cursor: 0, size: 40 } });
  const d = r.data?.data ?? {};
  return {
    address,
    height: Number(d.height || 0),
    tokenCount: Number(d.total || 0),
    tokens: (d.detail ?? []).map((t: any) => ({
      ticker: t.ticker, overall: t.overallBalance, transferable: t.transferableBalance, available: t.availableBalance,
    })),
  };
}

// Runes balances for an address.
export async function getRunesBalances(address: string) {
  const r = await http.get(`/v1/indexer/address/${address}/runes/balance-list`, { params: { cursor: 0, size: 40 } });
  const d = r.data?.data ?? {};
  return {
    address,
    runeCount: Number(d.total || 0),
    runes: (d.detail ?? []).map((x: any) => ({ rune: x.spacedRune || x.rune, amount: x.amount, divisibility: x.divisibility })),
  };
}

// Fractal chain tip / network status.
export async function getChainInfo() {
  const r = await http.get(`/v1/indexer/blockchain/info`);
  const d = r.data?.data ?? {};
  return { chain: d.chain, blocks: Number(d.blocks || 0), bestBlockHash: d.bestBlockHash, medianTime: Number(d.medianTime || 0) };
}

// --- comprehensive UniSat Fractal data surface (all endpoints verified live) ---
// Generic indexer GET that returns the unwrapped `data` (or throws on a non-zero UniSat code).
async function idx(path: string, params?: Record<string, any>) {
  const r = await http.get(path, params ? { params } : undefined);
  if (r.data?.code !== 0 && r.data?.code !== undefined) throw new Error(`unisat: ${r.data?.msg || "error"}`);
  return r.data?.data ?? null;
}

// network
export const getRecommendedFees = () => idx(`/v1/indexer/fees/recommended`);
export type FeeTier = "fastest" | "halfHour" | "hour" | "economy" | "minimum";

const FEE_TIER_FIELD: Record<FeeTier, string> = {
  fastest: "fastestFee", halfHour: "halfHourFee", hour: "hourFee", economy: "economyFee", minimum: "minimumFee",
};

let feeRateCache: { at: number; rate: number } | null = null;
const FEE_RATE_CACHE_MS = 60_000;

// Live sat/vB from UniSat's mempool-style fee endpoint (Fractal). Cached ~60s; falls back to cfg.feeRate.
export async function resolveFeeRateSatVb(override?: number): Promise<number> {
  if (override != null && override > 0) return Math.ceil(override);
  if (!cfg.feeRateDynamic) return cfg.feeRate;

  const now = Date.now();
  if (feeRateCache && now - feeRateCache.at < FEE_RATE_CACHE_MS) return feeRateCache.rate;

  try {
    const data = await getRecommendedFees();
    const field = FEE_TIER_FIELD[cfg.feeRateTier];
    const rate = Math.ceil(Number((data as any)?.[field]));
    if (rate > 0 && Number.isFinite(rate)) {
      feeRateCache = { at: now, rate };
      return rate;
    }
  } catch { /* fall through to static fallback */ }
  return cfg.feeRate;
}

export const getBrc20Status = () => idx(`/v1/indexer/brc20/status`, { start: 0, limit: 10 });

// address — spendable (cardinal) UTXO summary
export async function getAddressUtxos(address: string) {
  const d = await idx(`/v1/indexer/address/${address}/utxo-data`, { cursor: 0, size: 20 });
  return {
    address, totalUtxos: Number(d?.total || 0),
    confirmed: Number(d?.totalConfirmed || 0), unconfirmed: Number(d?.totalUnconfirmed || 0),
    utxos: (d?.utxo ?? []).map((u: any) => ({ txid: u.txid, vout: u.vout, satoshi: u.satoshi, height: u.height, inscriptions: u.inscriptionsCount || 0 })),
  };
}
// address — asset-bearing (NON-spendable) inscription UTXOs
export async function getAddressAssetUtxos(address: string) {
  const d = await idx(`/v1/indexer/address/${address}/inscription-utxo-data`, { cursor: 0, size: 20 });
  return {
    address, totalAssetUtxos: Number(d?.total || 0),
    utxos: (d?.utxo ?? []).map((u: any) => ({ txid: u.txid, vout: u.vout, satoshi: u.satoshi, inscriptions: (u.inscriptions ?? []).map((i: any) => i.inscriptionId) })),
  };
}
// address — recent transaction history
export async function getAddressHistory(address: string) {
  const d = await idx(`/v1/indexer/address/${address}/history`, { cursor: 0, size: 20 });
  return { address, total: Number(d?.total || 0), history: d?.detail ?? [] };
}

// transactions
export const getTxOutspends = (txid: string) => idx(`/v1/indexer/tx/${txid}/outs`);

// inscriptions
export const getInscriptionInfo = (inscriptionId: string) => idx(`/v1/indexer/inscription/info/${inscriptionId}`);

// brc-20 token-level
export async function getBrc20List() {
  const d = await idx(`/v1/indexer/brc20/list`, { start: 0, limit: 40 });
  return { total: Number(d?.total || 0), tickers: d?.detail ?? [] };
}
export const getBrc20TokenInfo = (ticker: string) => idx(`/v1/indexer/brc20/${encodeURIComponent(ticker)}/info`);
export async function getBrc20Holders(ticker: string) {
  const d = await idx(`/v1/indexer/brc20/${encodeURIComponent(ticker)}/holders`, { start: 0, limit: 20 });
  return { ticker, total: Number(d?.total || 0), holders: d?.detail ?? [] };
}

// --- inscribe / write surface (UniSat Inscribe API; creates orders to execute on-chain) ---
async function postIdx(path: string, body: any) {
  const r = await http.post(path, body);
  if (r.data?.code !== 0 && r.data?.code !== undefined) throw new Error(`unisat: ${r.data?.msg || "error"}`);
  return r.data?.data ?? null;
}
// generic inscription (text/file) order
export const createInscribeOrder = (body: any) => postIdx(`/v2/inscribe/order/create`, body);
// brc-20 deploy | mint | transfer order
export const createBrc20InscribeOrder = (kind: "deploy" | "mint" | "transfer", body: any) =>
  postIdx(`/v2/inscribe/order/create/brc20-${kind}`, body);
// query an order's status by id
export const getInscribeOrder = (orderId: string) => idx(`/v2/inscribe/order/${orderId}`);

// runes token-level
export async function getRunesList() {
  const d = await idx(`/v1/indexer/runes/info-list`, { start: 0, limit: 40 });
  return { total: Number(d?.total || 0), runes: d?.detail ?? [] };
}
export const getRuneInfo = (runeid: string) => idx(`/v1/indexer/runes/${encodeURIComponent(runeid)}/info`);
export async function getRuneHolders(runeid: string) {
  const d = await idx(`/v1/indexer/runes/${encodeURIComponent(runeid)}/holders`, { start: 0, limit: 20 });
  return { runeid, total: Number(d?.total || 0), holders: d?.detail ?? [] };
}

// --- BRC-20 Swap (InSwap module balances, LP, portfolio USD) ---
export async function getBrc20SwapAllBalances(address: string) {
  const d = await idx(`/v1/brc20-swap/all_balance`, { address });
  const tokens = Object.entries(d ?? {}).map(([tick, v]: [string, any]) => ({
    tick,
    assetType: v?.assetType ?? "brc20",
    moduleBalance: v?.balance?.module ?? "0",
    swapBalance: v?.balance?.swap ?? "0",
    pendingSwap: v?.balance?.pendingSwap ?? "0",
    pendingAvailable: v?.balance?.pendingAvailable ?? "0",
    available: v?.balance?.available ?? "0",
    decimal: Number(v?.decimal ?? 18),
    priceUsd: Number(v?.price ?? 0),
  }));
  return { address, tokenCount: tokens.length, tokens };
}

export async function getBrc20SwapMyPools(address: string, start = 0, limit = 20) {
  const d = await idx(`/v1/brc20-swap/my_pool_list`, { address, start, limit });
  return {
    address,
    poolCount: Number(d?.total || 0),
    totalLpUsd: d?.totalLpUSD ?? "0",
    pools: (d?.list ?? []).map((p: any) => ({
      tick: p.tick, lpAmount: p.lpAmount, lpUsd: p.lpUSD, tick0: p.tick0, tick1: p.tick1,
    })),
  };
}

export async function getBrc20SwapAddressUsd(address: string) {
  const d = await idx(`/v1/brc20-swap/address_usd`, { address });
  return { address, assetsUsd: d?.assetsUSD ?? "0", lpUsd: d?.lpUSD ?? "0" };
}

export const getBrc20SwapOverview = () => idx(`/v1/brc20-swap/overview`);
export const getBrc20SwapPoolList = (start = 0, limit = 20) => idx(`/v1/brc20-swap/pool_list`, { start, limit });

// --- Ordinals collections (v3 marketplace on Fractal; collection-indexer returns 404 on fractal API) ---
async function postMkt(path: string, body: Record<string, unknown>) {
  const r = await http.post(path, body);
  if (r.data?.code !== 0 && r.data?.code !== undefined) throw new Error(`unisat: ${r.data?.msg || "error"}`);
  return r.data?.data ?? null;
}

export async function getAddressCollectionSummary(address: string, firstCollectionId?: string) {
  const d = await postMkt(`/v3/market/collection/auction/collection_summary`, { address, ...(firstCollectionId ? { firstCollectionId } : {}) });
  const collections = (d?.list ?? []).map((c: any) => ({
    collectionId: c.collectionId,
    name: c.name,
    itemCount: Array.isArray(c.ids) ? c.ids.length : Number(c.total || 0),
    icon: c.icon,
  }));
  return { address, collectionCount: collections.length, collections };
}

// Collection indexer (Experience Stage — may 404 on Fractal; kept for parity with UniSat swagger)
export async function getAddressCollectionListIndexer(address: string, start = 0, limit = 20) {
  const d = await idx(`/v1/collection-indexer/address/${address}/collection/list`, { start, limit });
  return {
    address,
    total: Number(d?.total || 0),
    collections: (d?.list ?? []).map((c: any) => ({
      name: c.name, count: c.count, iconUrl: c.iconUrl, supply: c.supply,
    })),
  };
}
