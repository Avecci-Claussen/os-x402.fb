# `fb-exact` — x402 payment scheme for Fractal Bitcoin (v1)

A concrete [x402](https://x402.org) payment scheme that settles **per-request HTTP payments on Fractal
Bitcoin (FB)**, on-chain and non-custodial. This document defines the wire format and verification rules
so any client or server can interoperate. For x402 concepts in general (the `402 Payment Required` flow,
`accepts` arrays) see the upstream x402 standard; this spec defines only the FB-specific scheme.

- **Scheme id:** `fb-exact`
- **Asset:** `FB` (native Fractal Bitcoin)
- **Network:** `fractal-mainnet`
- **Status:** v1 (draft, but proven on Fractal mainnet)

## 1. Safety invariant (read first)

Fractal mainnet reuses **Bitcoin mainnet's exact address and key encodings** (`bc1…` bech32, base58
`1…`/`3…`, identical xpub/xprv version bytes). **A Fractal address is byte-for-byte indistinguishable
from a Bitcoin address.** Implementations MUST track network out-of-band and MUST set
`"network": "fractal-mainnet"` on every requirement. Sending BTC to an FB-intended address (or vice
versa) moves funds on the *other* chain. This is the #1 source of fund-loss bugs.

## 2. The 402 response

When a caller requests a paid resource without valid payment, the server responds `402` with:

```json
{
  "x402Version": 1,
  "error": "payment required",
  "accepts": [
    {
      "scheme": "fb-exact",
      "asset": "FB",
      "network": "fractal-mainnet",
      "payTo": "bc1q…",
      "amount": 10000,
      "facilitatorFee": { "payTo": "bc1q…", "amount": 1000 },
      "resource": "/v1/inference",
      "nonce": "b86a04c58bfebaa7",
      "expiresAt": 1782086629943
    }
  ]
}
```

| Field | Type | Meaning |
|---|---|---|
| `scheme` | `"fb-exact"` | This scheme. |
| `asset` | `"FB"` | Native Fractal Bitcoin, denominated in **satoshis**. |
| `network` | `"fractal-mainnet"` | Required. (`fractal-testnet`/`fractal-regtest` reserved.) |
| `payTo` | string | A **fresh** address derived from the provider's xpub (one per requirement). |
| `amount` | integer | Sats owed to the provider. MUST be `> 0` and `>= 330` (dust). |
| `facilitatorFee.payTo` | string | The operator's fee address. |
| `facilitatorFee.amount` | integer | Sats owed to the operator. MUST be `>= 330` (dust) on fee-paying txs. |
| `resource` | string | The path being purchased. |
| `nonce` | string | One-time, binds the payment to this requirement. |
| `expiresAt` | integer | Epoch ms after which the requirement is stale. |

## 3. The payment

The caller MUST broadcast **one FB transaction** containing at least two outputs:

1. an output paying **`payTo`** with value **`>= amount`**, and
2. an output paying **`facilitatorFee.payTo`** with value **`>= facilitatorFee.amount`**.

A change output back to the payer is allowed. Inputs MUST be **cardinal UTXOs** (no inscriptions/assets)
to avoid spending ordinals/BRC-20/Runes UTXOs. The transaction is standard Bitcoin-style; FB uses stock
Bitcoin Core consensus, SegWit, and Taproot, so PSBT and `bitcoinjs-lib` work unchanged against FB.

Because `payTo` is unique per requirement (derived at a fresh index from the provider's xpub), a paying
transaction is cryptographically bound to exactly one requirement.

## 4. Proof of payment

The caller retries the original request with headers:

```
X-PAYMENT-NONCE: <nonce>
X-PAYMENT-TXID:  <broadcast txid>
```

## 5. Verification (server / facilitator)

The verifier:

1. Looks up the requirement by `nonce`. If unknown or expired → reject.
2. If already settled → return success (idempotent; replay-safe).
3. Fetches the transaction `txid`'s outputs from a Fractal indexer.
4. Confirms an output pays `payTo` with `>= amount` **AND** an output pays `facilitatorFee.payTo` with
   `>= facilitatorFee.amount`. If either is missing → reject.
5. On success, mark the requirement settled with `txid` and serve the resource.

### 5.1 Hardening (RECOMMENDED for production — not all enforced in the v1 reference impl)

- **Confirmation depth:** require ≥1 confirmation before settling (Fractal's ~30s blocks make this cheap).
  The v1 reference relies on indexer visibility and does not enforce an explicit depth — a known gap.
- **Single-oracle risk:** the reference verifies via one indexer (UniSat). Production SHOULD cross-check
  or run its own node.
- **Amount/expiry:** enforce `expiresAt`; treat `>= amount` (overpayment allowed, underpayment rejected).
- **Rate limiting / abuse** on requirement issuance.

## 6. Non-custodial guarantee

The facilitator stores only the provider's **xpub** and derives fresh **watch-only** receive addresses
(`m/84'/0'/0'/0/i` style). It holds **no private keys** and cannot move funds — payments settle directly
from payer to provider. The operator's only on-chain interest is the fee output. This is what keeps the
operator out of custody (and out of money-transmitter/MSB/VASP licensing).

## 7. Versioning

`fb-exact` is v1. Breaking changes increment the scheme name (`fb-exact-2`). The `x402Version` field
tracks the outer x402 envelope version independently.
