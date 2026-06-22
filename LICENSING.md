# Licensing & the open-core boundary

OS-x402 is **open core**. This document is the explicit, on-paper answer to: *what is free and
self-hostable, what is the commercial service, and why open-sourcing the protocol does not destroy the
business.*

## The one idea

> **Your API key is not access to secret code. It is access to a service you operate.**

Nobody pays Supabase, Sentry, PostHog, GitLab, or hosted BTCPay for *secrecy* — all of them are open
source and fully self-hostable. People pay because **running and operating the thing yourself is more
work than paying.** OS-x402 is the same: the protocol and SDKs are MIT and self-hostable forever; the
**hosted facilitator and the marketplace network** are the product.

A *closed* payment SDK is a non-starter — especially in Bitcoin, nobody integrates a payment library
they can't inspect. So the SDK and protocol **must** be open. Monetization that depended on the protocol
being secret was never defensible anyway (it gets forked day one). We monetize **operation and network**,
not secrecy.

## The boundary

| Component | License | Where it lives | Why |
|---|---|---|---|
| `fb-exact` protocol spec | **MIT (open)** | [`SPEC.md`](SPEC.md) | A standard nobody can read isn't a standard. |
| Provider SDK (`requirePayment`) | **MIT (open)** | `src/sdk/`, npm `os-x402` | Adoption engine. Must be inspectable. |
| Agent SDKs (TS + Python `payAndFetch`) | **MIT (open)** | `src/sdk/agent.ts`, `python/` | Same — drives integration. |
| Core (scheme, tx build, on-chain verify, llm) | **MIT (open)** | `src/core/` | Just Bitcoin tx construction; no secret sauce exists here. |
| Reference facilitator (self-host) | **MIT (open)** | `src/facilitator/` | Lets anyone self-host → makes us the standard. |
| Merchant dashboard | **MIT (open)** | `dashboard/` | Convenience; not a moat. |
| **Multi-tenant marketplace & discovery network** | **Hosted-only** | `marketplace/` (to build) | The network effect *is* the moat — operated, not protected. |
| **Managed operations** | **Hosted / paid** | infra | Managed UniSat keys, uptime, analytics, fiat-pricing oracle, reputation/verified providers, rate limits, support. |

**The line is not "secret vs public code." It is "code anyone can run" vs "a network and service only we
operate."**

## Why the hosted API key still gets paid for

Even with everything above open, a paying customer's API key to the **hosted facilitator** buys:

- a maintained **UniSat indexer key** (costs money, rate-limited — we absorb it),
- **zero ops**: no server, no Postgres, no uptime duty, no upgrades,
- **the marketplace**: their endpoint is discoverable by agents (only exists on the hosted side),
- (later) **fiat-denominated pricing**, **reputation**, **analytics**, **SLAs**.

A solo dev with one paid endpoint uses the hosted key rather than stand up infrastructure. A high-volume
provider may self-host to avoid the fee — **that is expected and fine**: we don't lose a customer we'd
have monetized much, and they still speak our protocol, which grows the network we *do* monetize.

## Practical rules

- Keep BTCPay/upstream and third-party copyright notices intact (MIT obligation).
- Anything in this repo is MIT. The marketplace/managed services are deliberately **not** in this repo.
- Self-hosters are welcome and encouraged — including publishing into the public marketplace, because
  more listings make the network stronger.
