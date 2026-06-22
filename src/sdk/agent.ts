// Agent/consumer SDK: GET a resource; on HTTP 402, auto-pay (2-output FB tx) and retry.
import axios from "axios";
import { buildAndBroadcastPayment, type PaymentRequirements } from "../core/scheme.js";
import { cfg } from "../config.js";

export async function payAndFetch(url: string) {
  try {
    return { data: (await axios.get(url)).data, paid: 0 };
  } catch (e: any) {
    if (e.response?.status !== 402) throw e;
    const reqr: PaymentRequirements = e.response.data.accepts[0];
    const txid = await buildAndBroadcastPayment(reqr, cfg.payerWif, cfg.payerAddress, cfg.feeRate);
    const r2 = await axios.get(url, { headers: { "X-PAYMENT-NONCE": reqr.nonce, "X-PAYMENT-TXID": txid }, timeout: 200000 });
    return { data: r2.data, txid, paid: reqr.amount, fee: reqr.facilitatorFee.amount, merchant: reqr.payTo };
  }
}
