# OS-x402 — the open payment rail for autonomous agents on Fractal Bitcoin

> What this project is, how it works, and where it's going. **Owner:** The Lonely Bit
> (thelonelybit.org) · **License:** MIT · **Chain:** Fractal Bitcoin (FB), on-chain, non-custodial.

## The one-paragraph pitch

AI agents can now *act* on the internet, but they cannot *pay*. Every paid API assumes a human with an
account and a credit card — which an autonomous agent can't complete. **OS-x402 is the missing turnstile:
an open HTTP-402 standard that lets any software pay per request, on-chain, in Fractal Bitcoin, with no
account and no human in the loop.** A provider wraps any endpoint in three lines and starts charging; an
agent calls it, receives `402 Payment Required`, pays a single non-custodial FB transaction, and is let
through. The protocol and SDKs are open source so anyone can build on them — and become part of the same
standard.

## The problem

The agent economy has no payment layer. To charge a machine you must build accounts, API-key issuance,
billing, and a card processor — none of which onboard a bot, and none of which make sense for
fractions-of-a-cent calls. On the buyer side, an agent mid-task that needs a paid data point or tool call
simply can't get it. Fractal Bitcoin — fast (~30s) blocks, near-zero fees — is an ideal settlement layer
for machine micropayments, but had no payment-request standard or rail. OS-x402 is that rail.

## How it works

The entire protocol surface is one JSON response. A paid route, hit without payment, returns `402` with a
price, a fresh FB address derived from the provider's xpub, and a one-time nonce. The caller broadcasts
**one FB transaction with two outputs** (provider + a small network/operator fee), retries with proof, and
the server verifies it on-chain before serving. See [`SPEC.md`](SPEC.md) for the full `fb-exact` scheme.

**Non-custodial by construction:** the provider supplies an **xpub**; addresses are derived watch-only, so
funds settle directly to the provider's wallet and the rail never holds keys or money.

## Why Fractal Bitcoin

- **~30s blocks** → a paid call confirms in seconds, usable in a live agent loop.
- **Near-zero fees** → micropayments (hundreds of sats) are economically real.
- **Bitcoin-identical tooling** → built on battle-tested libraries (bitcoinjs-lib, BIP32, BIP322); no
  novel cryptography.
- **Ecosystem fit** → a decentralized, non-custodial payment processor, and a flagship use case that
  drives exactly the high-frequency, low-fee volume Fractal is built for.

## What exists today (proven on Fractal mainnet)

- **Core protocol** (`fb-exact`): 2-output non-custodial settlement + on-chain verification.
- **Multi-tenant facilitator**: wallet sign-in (BIP322), xpub-based address derivation, payment
  verification — holds no private keys.
- **Provider SDK** (`requirePayment`) and **agent SDKs** (TypeScript + Python `payAndFetch`).
- **Browser payments** (UniSat PSBT) and a **merchant dashboard**.
- **Example provider**: a "Fractal Tools API" (balance, inscriptions, BRC-20, runes, chain, AI summary),
  each paid per call in FB. The AI endpoint runs a real model (local Ollama, or Claude if configured).

All of the above has settled real transactions on Fractal mainnet.

## Roadmap

- **Phase 0 — done:** core protocol, facilitator, SDKs, browser pay, dashboard, example provider.
- **Phase 1 — OSS launch:** finalize the `fb-exact` spec, publish the npm + Python SDKs, one-command
  self-host, example providers, security notes.
- **Phase 2:** confirmation-depth + multi-oracle verification hardening; Taproot (`bc1p`) browser pay;
  fiat-denominated pricing via an FB rate oracle.
- **Phase 3 — ecosystem:** reference integrations (agent frameworks, MCP tool adapters) so any
  MCP-speaking agent can pay-to-call; push `fb-exact` as the canonical FB payment scheme.

## Open source & sustainability

The protocol, SDKs, and a self-hostable reference facilitator are MIT — the open rail belongs to the
ecosystem. The project follows the proven open-core model (free and self-hostable forever, with optional
hosted convenience for those who don't want to run infrastructure), and is **non-custodial by design** —
no pooled funds, no custody, no money-transmitter exposure. See [`LICENSING.md`](LICENSING.md).

---

*Non-custodial, on-chain, agent-native — the payment rail for autonomous software on Fractal Bitcoin.*
