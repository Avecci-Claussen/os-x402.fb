// x402 "fb-exact" scheme: the payer-side 2-output transaction builder.
import * as bitcoin from "bitcoinjs-lib";
import { ECPair, FB_NETWORK } from "./fb.js";
import { getCardinalUtxos, broadcast } from "./unisat.js";
import type { PaymentRequirements } from "./types.js";

export type { PaymentRequirements } from "./types.js";

const DUST = 330;

// Build an UNSIGNED 2-output PSBT (merchant + fee + change) for a browser wallet (UniSat) to sign.
// Keeps the UniSat API key server-side; the browser only signs + broadcasts.
export async function buildUnsignedPsbtHex(
  payerAddress: string, payTo: string, amount: number, feeTo: string, feeAmount: number, feeRate: number,
): Promise<string> {
  const utxos = await getCardinalUtxos(payerAddress);
  if (!utxos.length) throw new Error("no cardinal UTXOs for payer");
  const need = amount + feeAmount;
  const psbt = new bitcoin.Psbt({ network: FB_NETWORK });
  let inSum = 0, count = 0;
  for (const u of utxos) {
    psbt.addInput({ hash: u.txid, index: u.vout, witnessUtxo: { script: Buffer.from(u.scriptPk, "hex"), value: u.satoshi } });
    inSum += u.satoshi; count++;
    if (inSum >= need + (count * 68 + 3 * 31 + 11) * feeRate + DUST) break;
  }
  const networkFee = Math.ceil((count * 68 + 3 * 31 + 11) * feeRate);
  const change = inSum - need - networkFee;
  if (change < 0) throw new Error(`insufficient funds: have ${inSum}, need ${need + networkFee}`);
  psbt.addOutput({ address: payTo, value: amount });
  psbt.addOutput({ address: feeTo, value: feeAmount });
  if (change >= DUST) psbt.addOutput({ address: payerAddress, value: change });
  return psbt.toHex();
}

// Build, sign and broadcast ONE FB tx with two payment outputs (merchant + facilitator fee) + change.
export async function buildAndBroadcastPayment(
  reqr: PaymentRequirements, payerWif: string, payerAddress: string, feeRate: number,
): Promise<string> {
  const keyPair = ECPair.fromWIF(payerWif, FB_NETWORK);
  const utxos = await getCardinalUtxos(payerAddress);
  if (!utxos.length) throw new Error("no cardinal (non-inscription) UTXOs to spend");

  const need = reqr.amount + reqr.facilitatorFee.amount;
  const psbt = new bitcoin.Psbt({ network: FB_NETWORK });
  let inSum = 0, count = 0;
  for (const u of utxos) {
    psbt.addInput({ hash: u.txid, index: u.vout, witnessUtxo: { script: Buffer.from(u.scriptPk, "hex"), value: u.satoshi } });
    inSum += u.satoshi; count++;
    if (inSum >= need + (count * 68 + 3 * 31 + 11) * feeRate + DUST) break;
  }
  const networkFee = Math.ceil((count * 68 + 3 * 31 + 11) * feeRate);
  const change = inSum - need - networkFee;
  if (change < 0) throw new Error(`insufficient funds: have ${inSum}, need ${need + networkFee}`);

  psbt.addOutput({ address: reqr.payTo, value: reqr.amount });
  psbt.addOutput({ address: reqr.facilitatorFee.payTo, value: reqr.facilitatorFee.amount });
  if (change >= DUST) psbt.addOutput({ address: payerAddress, value: change });
  for (let i = 0; i < count; i++) psbt.signInput(i, keyPair);
  psbt.finalizeAllInputs();
  return broadcast(psbt.extractTransaction().toHex());
}
