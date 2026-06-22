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
