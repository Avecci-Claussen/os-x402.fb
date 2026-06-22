"use client";
import { FACILITATOR_URL } from "./brand";

export async function getUnisat(): Promise<any> {
  const u = (window as any).unisat;
  if (!u) throw new Error("UniSat wallet not found — install the extension and switch it to Fractal.");
  return u;
}

// Pay an x402 endpoint with the connected UniSat wallet:
// 402 -> facilitator builds an unsigned PSBT -> UniSat signs + pushes -> retry with proof.
export async function payAndFetch(url: string): Promise<any> {
  const unisat = await getUnisat();
  const [address] = await unisat.requestAccounts();

  const r = await fetch(url);
  if (r.status !== 402) return { data: await r.json(), paid: 0 };
  const reqr = (await r.json()).accepts[0];

  const { psbtHex, error } = await (await fetch(`${FACILITATOR_URL}/v1/build-payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nonce: reqr.nonce, payerAddress: address }),
  })).json();
  if (!psbtHex) throw new Error(error || "could not build payment");

  const signed = await unisat.signPsbt(psbtHex);     // UniSat signs the inputs it owns
  const txid = await unisat.pushPsbt(signed);          // broadcast

  const r2 = await fetch(url, { headers: { "X-PAYMENT-NONCE": reqr.nonce, "X-PAYMENT-TXID": txid } });
  return { data: await r2.json(), txid, paid: reqr.amount, fee: reqr.facilitatorFee.amount, address };
}
