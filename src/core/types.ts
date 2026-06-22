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
}
