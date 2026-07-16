---
name: x402-fb
description: Pay Fractal Bitcoin x402 endpoints (fb-exact). Discover tools via /v1/tools.json, pay one 2-output FB tx, retry with rawTx for local settlement.
---

# x402.fb — Fractal agent payments

## When to use

User wants on-chain Fractal data/AI without API keys: balance, BRC-20, tx detail, swap overview, wallet analyst, or any marketplace listing.

## Ritual

1. `GET {X402_API_URL}/v1/tools.json` — list heroes (`endpoint`, `price_sats`, optional `price_usd_approx`, `requires`).
2. Optional: `GET {X402_API_URL}/v1/price/fb` for FB/USDT → ≈ USD display (settlement stays sats).
3. Call the `endpoint` (+ query). Expect **HTTP 402** with `accepts[0]` (`payTo`, `amount`, `nonce`, `binding`, `confirmations`).
4. Pay with UniSat PSBT or `payAndFetch` from `os-x402` / this repo's `api/src/sdk/agent.ts`.
5. Retry with headers:
   - `X-PAYMENT-NONCE`
   - `X-PAYMENT-TXID`
   - `X-PAYMENT-RAWTX` (prefer — local verify)
   - `X-PAYMENT-BINDING` (from challenge)

## Spend caps

Refuse if `amount > MAX_AMOUNT_SATS` or facilitator fee exceeds `MAX_FEE_SATS`.

## Trust copy

Non-custodial (xpub payTo + fee out). Settlement is **locally verified** when rawTx is provided. Do not claim full consensus trustlessness. USD from FB/USDT is **estimate only**.

## Quick commands

```bash
curl -s "$X402_API_URL/v1/tools.json" | jq '.heroes[] | {id,price_sats,price_usd_approx,endpoint,live}'
curl -s "$X402_API_URL/v1/price/fb" | jq .
npx tsx agent-kit/openclaw/wrapper.ts call balance --address=bc1q…
```
