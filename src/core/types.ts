// Public, runtime-free types for the x402 "fb-exact" scheme. No imports → safe to pull into the
// browser/SDK bundle without dragging in node-only deps (bitcoinjs, pg, config, …).

export interface FacilitatorFee {
  payTo: string;
  amount: number; // sats of FB
}

// The body a server returns with HTTP 402, telling a caller exactly how to pay.
export interface PaymentRequirements {
  scheme: "fb-exact";
  asset: "FB";
  network: "fractal-mainnet";
  payTo: string;        // fresh address derived from the provider's xpub
  amount: number;       // sats of FB owed to the provider
  facilitatorFee: FacilitatorFee;
  resource: string;     // the path being purchased
  nonce: string;        // one-time ticket binding this payment to this request
  expiresAt: number;    // epoch ms
  /** sha256 hex binding resource+amount+payTo+fee — reject settle if mismatched */
  binding?: string;
  /** confirmations required before unlock (0 = mempool/seen outs ok) */
  confirmations?: number;
}

/** Canonical request binding preimage for fb-exact (BSV-inspired). */
export function paymentBinding(parts: {
  resource: string; amount: number; payTo: string; feeAmount: number; feeAddress: string;
}): string {
  return `fb-exact|${parts.resource}|${parts.amount}|${parts.payTo}|${parts.feeAmount}|${parts.feeAddress}`;
}
