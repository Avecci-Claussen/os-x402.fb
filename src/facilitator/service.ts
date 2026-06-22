// Facilitator business logic: merchants/services, requirement issuance (HD derive + persist),
// non-custodial verification (UniSat), and fee accounting.
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Verifier } from "bip322-js";
import { pool } from "./db.js";
import { cfg } from "../config.js";
import { addressFromXpub } from "../core/fb.js";
import { getTxOuts } from "../core/unisat.js";
import { buildUnsignedPsbtHex, type PaymentRequirements } from "../core/scheme.js";

const sign = (merchantId: string) => jwt.sign({ merchantId }, cfg.jwtSecret, { expiresIn: "7d" });
export const verifyToken = (token: string): string => (jwt.verify(token, cfg.jwtSecret) as any).merchantId;

// --- Wallet sign-in (UniSat): connect -> sign a challenge -> verify signature -> JWT. No passwords. ---
export async function challenge(address: string) {
  if (!address) throw new Error("address required");
  const nonce = crypto.randomBytes(12).toString("hex");
  const message =
    `Turnpike login\naddress: ${address}\nnonce: ${nonce}\nissued: ${new Date().toISOString()}`;
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

export async function createService(merchantId: string, name: string, xpub: string, feeBps = 1000) {
  if (!name || !xpub) throw new Error("name and xpub required");
  const apiKey = "ssk_" + crypto.randomBytes(24).toString("hex");
  const r = await pool.query(
    `insert into services(merchant_id,name,xpub,fee_bps,api_key)
     values($1,$2,$3,$4,$5) returning id,name,xpub,fee_bps,api_key,deriv_index,created_at`,
    [merchantId, name, xpub, feeBps, apiKey]);
  return r.rows[0];
}
export const listServices = async (merchantId: string) =>
  (await pool.query(`select id,name,xpub,fee_bps,api_key,deriv_index,created_at from services where merchant_id=$1 order by created_at desc`, [merchantId])).rows;
const serviceByApiKey = async (apiKey: string) =>
  (await pool.query(`select * from services where api_key=$1`, [apiKey])).rows[0];

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
  await pool.query(
    `insert into payments(service_id,nonce,resource,pay_to,amount,fee_amount,fee_address) values($1,$2,$3,$4,$5,$6,$7)`,
    [svc.id, nonce, resource, payTo, price, fee, cfg.feeAddress]);
  return {
    scheme: "fb-exact", asset: "FB", network: "fractal-mainnet",
    payTo, amount: price, facilitatorFee: { payTo: cfg.feeAddress, amount: fee },
    resource, nonce, expiresAt: Date.now() + 10 * 60_000,
  };
}

// Build an unsigned PSBT for a browser wallet to sign (uses the requirement stored under `nonce`).
export async function buildPayment(nonce: string, payerAddress: string) {
  const p = (await pool.query(`select * from payments where nonce=$1`, [nonce])).rows[0];
  if (!p) throw new Error("unknown nonce");
  if (!payerAddress) throw new Error("payerAddress required");
  const feeRate = Number(process.env.FEE_RATE_SAT_VB || "4");
  const psbtHex = await buildUnsignedPsbtHex(payerAddress, p.pay_to, Number(p.amount), p.fee_address, Number(p.fee_amount), feeRate);
  return { psbtHex };
}

export async function verifyPayment(apiKey: string, nonce: string, txid: string) {
  const svc = await serviceByApiKey(apiKey);
  if (!svc) throw new Error("invalid service api key");
  const p = (await pool.query(`select * from payments where nonce=$1 and service_id=$2`, [nonce, svc.id])).rows[0];
  if (!p) return { ok: false, status: "unknown" };
  if (p.status === "paid") return { ok: true, status: "paid", txid: p.txid };
  const outs = await getTxOuts(txid);
  if (!outs) return { ok: false, status: "pending" };
  const merchantPaid = outs.some((o) => o.address === p.pay_to && o.satoshi >= Number(p.amount));
  const feePaid = outs.some((o) => o.address === p.fee_address && o.satoshi >= Number(p.fee_amount));
  if (!merchantPaid || !feePaid) return { ok: false, status: "invalid" };
  await pool.query(`update payments set status='paid', txid=$1, paid_at=now() where id=$2`, [txid, p.id]);
  return { ok: true, status: "paid", txid };
}

export const stats = async (merchantId: string) => (await pool.query(`
  select count(*) filter (where p.status='paid')::int as paid_calls,
         coalesce(sum(p.amount) filter (where p.status='paid'),0)::bigint as earned_to_merchant,
         coalesce(sum(p.fee_amount) filter (where p.status='paid'),0)::bigint as facilitator_fees
  from payments p join services s on s.id=p.service_id where s.merchant_id=$1`, [merchantId])).rows[0];
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
