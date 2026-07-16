// Agent/consumer SDK: GET a resource; on HTTP 402, auto-pay (2-output FB tx) and retry.
// Safety for autonomous agents:
//   - spend caps (maxAmountSats / maxFeeSats) — refuse to overpay a misbehaving endpoint
//   - the built tx is asserted to pay exactly the 402's payTo + fee before broadcast (see scheme.ts),
//     so even a tampered/misdirecting facilitator can't move funds anywhere else.
import axios from "axios";
import { buildAndBroadcastPayment, type PaymentRequirements } from "../core/scheme.js";
import { resolveFeeRateSatVb } from "../core/unisat.js";
import { cfg } from "../config.js";

export interface PayOpts {
  wif?: string; address?: string; feeRate?: number;
  maxAmountSats?: number;   // refuse if the provider asks more than this
  maxFeeSats?: number;      // refuse if the facilitator fee is higher than this
}

export async function payAndFetch(url: string, opts: PayOpts = {}) {
  const wif = opts.wif || cfg.payerWif;
  const address = opts.address || cfg.payerAddress;
  const feeRate = opts.feeRate ?? await resolveFeeRateSatVb();
  try {
    return { data: (await axios.get(url)).data, paid: 0 };
  } catch (e: any) {
    if (e.response?.status !== 402) throw e;
    const reqr: PaymentRequirements = e.response.data.accepts[0];
    if (opts.maxAmountSats != null && reqr.amount > opts.maxAmountSats)
      throw new Error(`provider wants ${reqr.amount} sat which exceeds your max of ${opts.maxAmountSats}`);
    if (opts.maxFeeSats != null && reqr.facilitatorFee.amount > opts.maxFeeSats)
      throw new Error(`facilitator fee ${reqr.facilitatorFee.amount} sat exceeds your max of ${opts.maxFeeSats}`);
    // buildAndBroadcastPayment asserts the tx pays exactly reqr.payTo + reqr.facilitatorFee before broadcast
    const { txid, rawTx } = await buildAndBroadcastPayment(reqr, wif, address, feeRate);
    const headers: Record<string, string> = {
      "X-PAYMENT-NONCE": reqr.nonce,
      "X-PAYMENT-TXID": txid,
      "X-PAYMENT-RAWTX": rawTx,
    };
    if (reqr.binding) headers["X-PAYMENT-BINDING"] = reqr.binding;
    const r2 = await axios.get(url, { headers, timeout: 200000 });
    return {
      data: r2.data, txid, rawTx, paid: reqr.amount, fee: reqr.facilitatorFee.amount,
      merchant: reqr.payTo, binding: reqr.binding,
    };
  }
}
