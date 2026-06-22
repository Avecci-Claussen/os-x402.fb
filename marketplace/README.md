# Marketplace (Phase 2 — to build)

The two-sided network that turns the open OS-x402 rail into a defensible business: **agents discover**
paid Fractal capabilities and **providers reach buyers**. The protocol (`../src`) is a commodity by
design; this layer is the moat. See [`../VISION.md`](../VISION.md) §7.

## What goes here

- **Provider registry** — providers list a capability once (name, description, endpoint, machine-readable
  pricing, sample I/O). Backed by the facilitator's existing `services` table + xpub-only model.
- **Discovery API for agents** — `GET /v1/discover?q=…` returns matching paid capabilities with their
  `fb-exact` payment requirements, so an agent can find *and* pay a provider it had no prior deal with.
- **Reputation** — honored-payment history, uptime, ratings. Non-custodial-compatible trust signals.
- **Directory site** — human-browsable catalog (extends `../dashboard`).
- **Value-adds (Phase 3)** — fiat-priced listings via FB rate oracle, verified-provider program, analytics.

## Design constraints (inherited, non-negotiable)

- **Non-custodial.** Registry stores provider *metadata + xpub*, never keys or funds.
- **Network safety.** Every listing and requirement carries `network: fractal-mainnet`; FB and BTC
  addresses are byte-identical, so the network is always tracked out-of-band.
- **Open protocol, hosted network.** A self-hoster can still publish to the public registry — discovery
  is the value, and more listings make the network stronger.

> Status: skeleton. Implementation starts after the Phase 1 OSS launch (see roadmap in `../VISION.md`).
