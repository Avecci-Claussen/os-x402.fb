// Facilitator business logic: merchants/services, requirement issuance (HD derive + persist),
// non-custodial verification (UniSat), and fee accounting.
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Verifier } from "bip322-js";
import { pool } from "./db.js";
import { cfg } from "../config.js";
import { addressFromXpub } from "../core/fb.js";
import { getTxOuts, getTxConfirmations, resolveFeeRateSatVb } from "../core/unisat.js";
import { buildUnsignedPsbtHex, type PaymentRequirements } from "../core/scheme.js";
import { paymentBinding } from "../core/types.js";
import { assertRawTxPaysRequirements, assertPsbtPaysRequirements } from "../core/psbt-verify.js";
import * as bitcoin from "bitcoinjs-lib";

const sign = (merchantId: string) => jwt.sign({ merchantId }, cfg.jwtSecret, { expiresIn: "7d" });
export const verifyToken = (token: string): string => (jwt.verify(token, cfg.jwtSecret) as any).merchantId;

// Service API keys are stored ONLY as a SHA-256 hash (like a password). The raw key is shown once at
// creation and never persisted — a DB dump leaks no usable keys.
const hashKey = (k: string) => crypto.createHash("sha256").update(k).digest("hex");

// --- Wallet sign-in (UniSat): connect -> sign a challenge -> verify signature -> JWT. No passwords. ---
export async function challenge(address: string) {
  if (!address) throw new Error("address required");
  const nonce = crypto.randomBytes(12).toString("hex");
  const message =
    `x402.fb login\naddress: ${address}\nnonce: ${nonce}\nissued: ${new Date().toISOString()}`;
  await pool.query(`delete from auth_challenges where address=$1 or expires_at < now()`, [address]);
  await pool.query(`insert into auth_challenges(address,message,expires_at) values($1,$2, now() + interval '10 minutes')`,
    [address, message]);
  return { message };
}

export async function walletLogin(address: string, signature: string) {
  if (!address || !signature) throw new Error("address and signature required");
  const c = (await pool.query(
    `select message from auth_challenges where address=$1 and expires_at > now() order by expires_at desc limit 1`, [address])).rows[0];
  if (!c) throw new Error("no active challenge — request one first");
  // BIP322 — verifies P2WPKH (bc1q), Taproot (bc1p), P2SH-P2WPKH and legacy signatures.
  let ok = false;
  try { ok = Verifier.verifySignature(address, c.message, signature); } catch { ok = false; }
  if (!ok) throw new Error("invalid signature");
  await pool.query(`delete from auth_challenges where address=$1`, [address]);
  const m = await pool.query(
    `insert into merchants(address) values($1) on conflict (address) do update set address=excluded.address returning id,address`,
    [address]);
  return { token: sign(m.rows[0].id), merchant: m.rows[0] };
}

export async function getMerchant(merchantId: string) {
  const r = await pool.query(`select id, address from merchants where id=$1`, [merchantId]);
  if (!r.rows[0]) throw new Error("merchant not found");
  return r.rows[0];
}

export async function createService(merchantId: string, name: string, xpub: string, feeBps = 1000) {
  if (!name || !xpub) throw new Error("name and xpub required");
  const apiKey = "ssk_" + crypto.randomBytes(24).toString("hex");
  const prefix = apiKey.slice(0, 12);
  const r = await pool.query(
    `insert into services(merchant_id,name,xpub,fee_bps,api_key_hash,api_key_prefix)
     values($1,$2,$3,$4,$5,$6) returning id,name,xpub,fee_bps,api_key_prefix,deriv_index,created_at`,
    [merchantId, name, xpub, feeBps, hashKey(apiKey), prefix]);
  return { ...r.rows[0], api_key: apiKey }; // raw key returned ONCE, never stored
}
export const listServices = async (merchantId: string) =>
  (await pool.query(`select id,name,xpub,fee_bps,api_key_prefix,deriv_index,created_at from services where merchant_id=$1 order by created_at desc`, [merchantId])).rows;
const serviceByApiKey = async (apiKey: string) =>
  (await pool.query(`select * from services where api_key_hash=$1`, [hashKey(apiKey)])).rows[0];

// --- API key management (owner-scoped) ---
async function ownedService(merchantId: string, serviceId: string) {
  const s = (await pool.query(`select * from services where id=$1 and merchant_id=$2`, [serviceId, merchantId])).rows[0];
  if (!s) throw new Error("service not found");
  return s;
}
export async function getService(merchantId: string, serviceId: string) {
  const s = await ownedService(merchantId, serviceId);
  return { id: s.id, name: s.name, xpub: s.xpub, fee_bps: s.fee_bps, api_key_prefix: s.api_key_prefix, deriv_index: s.deriv_index, created_at: s.created_at };
}
// Rotate: old key stops working immediately; new raw key returned ONCE.
export async function regenerateServiceKey(merchantId: string, serviceId: string) {
  await ownedService(merchantId, serviceId);
  const apiKey = "ssk_" + crypto.randomBytes(24).toString("hex");
  const prefix = apiKey.slice(0, 12);
  await pool.query(`update services set api_key_hash=$1, api_key_prefix=$2 where id=$3 and merchant_id=$4`,
    [hashKey(apiKey), prefix, serviceId, merchantId]);
  return { api_key: apiKey, api_key_prefix: prefix };
}
export async function deleteService(merchantId: string, serviceId: string) {
  await ownedService(merchantId, serviceId);
  await pool.query(`delete from services where id=$1 and merchant_id=$2`, [serviceId, merchantId]);
  return { ok: true };
}

export async function createRequirement(apiKey: string, resource: string, price: number): Promise<PaymentRequirements> {
  const svc = await serviceByApiKey(apiKey);
  if (!svc) throw new Error("invalid service api key");
  if (!(price > 0)) throw new Error("price must be > 0");
  const idxRow = await pool.query(`update services set deriv_index = deriv_index + 1 where id=$1 returning deriv_index`, [svc.id]);
  const idx = idxRow.rows[0].deriv_index - 1;
  const payTo = addressFromXpub(svc.xpub, idx);
  const nonce = crypto.randomBytes(8).toString("hex");
  const DUST = 330; // outputs below dust are rejected by the network on fee-paying txs
  const fee = Math.max(DUST, Math.floor((price * svc.fee_bps) / 10000));
  const binding = crypto.createHash("sha256")
    .update(paymentBinding({ resource, amount: price, payTo, feeAmount: fee, feeAddress: cfg.feeAddress }))
    .digest("hex");
  const confirmations = price >= cfg.highValueSats ? cfg.confirmationsHigh : cfg.confirmationsDefault;
  await pool.query(
    `insert into payments(service_id,nonce,resource,pay_to,amount,fee_amount,fee_address,binding) values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [svc.id, nonce, resource, payTo, price, fee, cfg.feeAddress, binding]);
  return {
    scheme: "fb-exact", asset: "FB", network: "fractal-mainnet",
    payTo, amount: price, facilitatorFee: { payTo: cfg.feeAddress, amount: fee },
    resource, nonce, expiresAt: Date.now() + 10 * 60_000,
    binding, confirmations,
  };
}

// Build an unsigned PSBT for a browser wallet to sign (uses the requirement stored under `nonce`).
export async function buildPayment(nonce: string, payerAddress: string) {
  const p = (await pool.query(`select * from payments where nonce=$1`, [nonce])).rows[0];
  if (!p) throw new Error("unknown nonce");
  if (!payerAddress) throw new Error("payerAddress required");
  await pool.query(`update payments set payer=$1 where nonce=$2 and payer is null`, [payerAddress, nonce]);
  const feeRate = await resolveFeeRateSatVb();
  const psbtHex = await buildUnsignedPsbtHex(payerAddress, p.pay_to, Number(p.amount), p.fee_address, Number(p.fee_amount), feeRate);
  return { psbtHex, feeRateSatVb: feeRate };
}

export interface VerifyOpts {
  payer?: string;
  rawTx?: string;
  signedPsbt?: string;
  /** Must match the protected request (stops cross-endpoint replay of the same nonce/txid). */
  resource?: string;
  binding?: string;
}

export async function verifyPayment(apiKey: string, nonce: string, txid: string, opts: VerifyOpts | string = {}) {
  // Back-compat: older callers passed payer as 4th arg
  const o: VerifyOpts = typeof opts === "string" ? { payer: opts } : (opts || {});
  const svc = await serviceByApiKey(apiKey);
  if (!svc) throw new Error("invalid service api key");
  const p = (await pool.query(`select * from payments where nonce=$1 and service_id=$2`, [nonce, svc.id])).rows[0];
  if (!p) return { ok: false, status: "unknown" };
  if (p.status === "paid") return { ok: true, status: "paid", txid: p.txid, binding: p.binding, verified: "cached" };

  // Request binding: payment is locked to the resource that issued the 402.
  if (o.resource && o.resource !== p.resource) return { ok: false, status: "binding_mismatch" };
  const expectedBinding = p.binding || crypto.createHash("sha256")
    .update(paymentBinding({
      resource: p.resource, amount: Number(p.amount), payTo: p.pay_to,
      feeAmount: Number(p.fee_amount), feeAddress: p.fee_address,
    })).digest("hex");
  if (o.binding && o.binding !== expectedBinding) return { ok: false, status: "binding_mismatch" };

  const reqr = {
    payTo: p.pay_to, amount: Number(p.amount),
    facilitatorFee: { payTo: p.fee_address, amount: Number(p.fee_amount) },
  };

  let verified: "rawTx" | "unisat" = "unisat";
  let localOk = false;
  let rawTx = o.rawTx?.replace(/^0x/i, "").trim() || "";
  if (!rawTx && o.signedPsbt) {
    try {
      const psbt = bitcoin.Psbt.fromHex(o.signedPsbt.replace(/^0x/i, ""));
      try { rawTx = psbt.extractTransaction().toHex(); }
      catch {
        assertPsbtPaysRequirements(o.signedPsbt, reqr);
        localOk = true;
        verified = "rawTx";
      }
    } catch {
      return { ok: false, status: "invalid" };
    }
  }

  if (rawTx) {
    try {
      assertRawTxPaysRequirements(rawTx, reqr);
      verified = "rawTx";
      localOk = true;
    } catch {
      return { ok: false, status: "invalid" };
    }
  } else if (!localOk) {
    // UniSat outs = fallback only when client did not supply rawTx / signedPsbt
    const outs = await getTxOuts(txid);
    if (!outs) return { ok: false, status: "pending" };
    const merchantPaid = outs.some((x) => x.address === p.pay_to && x.satoshi >= Number(p.amount));
    const feePaid = outs.some((x) => x.address === p.fee_address && x.satoshi >= Number(p.fee_amount));
    if (!merchantPaid || !feePaid) return { ok: false, status: "invalid" };
  }

  const needConfs = Number(p.amount) >= cfg.highValueSats ? cfg.confirmationsHigh : cfg.confirmationsDefault;
  if (needConfs > 0) {
    const confs = await getTxConfirmations(txid);
    if (confs == null) return { ok: false, status: "pending", confirmations: null, required: needConfs };
    if (confs < needConfs) return { ok: false, status: "pending", confirmations: confs, required: needConfs };
  }

  try {
    await pool.query(
      `update payments set status='paid', txid=$1, paid_at=now(), payer=coalesce(payer,$3), binding=coalesce(binding,$4)
       where id=$2 and status<>'paid'`,
      [txid, p.id, o.payer || null, expectedBinding]);
  } catch (e: any) {
    // Unique txid: same chain tx cannot settle two nonces
    if (String(e?.message || e).includes("payments_txid_unique") || e?.code === "23505")
      return { ok: false, status: "replay" };
    throw e;
  }
  return { ok: true, status: "paid", txid, binding: expectedBinding, verified };
}

export const stats = async (merchantId: string) => (await pool.query(`
  select count(*) filter (where p.status='paid')::int as paid_calls,
         coalesce(sum(p.amount) filter (where p.status='paid'),0)::bigint as earned_to_merchant,
         coalesce(sum(p.fee_amount) filter (where p.status='paid'),0)::bigint as facilitator_fees
  from payments p join services s on s.id=p.service_id where s.merchant_id=$1`, [merchantId])).rows[0];

// A merchant's own last-30-days, real numbers.
export const stats30d = async (merchantId: string) => (await pool.query(`
  select count(*)::int as transactions,
         coalesce(sum(p.amount),0)::bigint as volume,
         count(distinct p.payer)::int as buyers,
         count(distinct p.service_id)::int as services
  from payments p join services s on s.id=p.service_id
  where s.merchant_id=$1 and p.status='paid' and p.paid_at > now() - interval '30 days'`, [merchantId])).rows[0];

// Ecosystem-wide last-30-days aggregate (all merchants) — real on-chain totals, no fabrication.
// Public marketing-style stats (like the x402.org homepage), computed from settled payments.
export const ecosystemStats = async () => (await pool.query(`
  select count(*)::int as transactions,
         coalesce(sum(p.amount),0)::bigint as volume,
         coalesce(sum(p.fee_amount),0)::bigint as fees,
         count(distinct p.payer)::int as buyers,
         count(distinct s.merchant_id)::int as sellers
  from payments p join services s on s.id=p.service_id
  where p.status='paid' and p.paid_at > now() - interval '30 days'`)).rows[0];
export const servicePayments = async (merchantId: string, serviceId: string) => (await pool.query(
  `select p.* from payments p join services s on s.id=p.service_id
   where s.merchant_id=$1 and p.service_id=$2 order by p.created_at desc limit 50`, [merchantId, serviceId])).rows;

// Daily paid-call counts + fees for the last 14 days (dashboard usage chart).
export const usage = async (merchantId: string) => (await pool.query(`
  select to_char(date_trunc('day', p.paid_at), 'YYYY-MM-DD') as day,
         count(*)::int as calls,
         coalesce(sum(p.fee_amount),0)::bigint as fees
  from payments p join services s on s.id=p.service_id
  where s.merchant_id=$1 and p.status='paid' and p.paid_at > now() - interval '14 days'
  group by 1 order by 1`, [merchantId])).rows;
