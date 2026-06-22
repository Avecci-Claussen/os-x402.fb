# Licensing & the open-core boundary

OS-x402 is **open core**. This document is the explicit, on-paper answer to: *what is free and
self-hostable, what is the commercial service, and why open-sourcing the protocol does not destroy the
business.*

## The one idea

> **Your API key is not access to secret code. It is access to a service you operate.**

Nobody pays Supabase, Sentry, PostHog, GitLab, or hosted BTCPay for *secrecy* — all of them are open
source and fully self-hostable. People pay because **running and operating the thing yourself is more
work than paying.** OS-x402 is the same: the protocol and SDKs are MIT and self-hostable forever; the
**hosted facilitator and managed services** are the product.

A payment SDK must be open — nobody integrates a payment library they can't inspect, least of all in
Bitcoin. So the protocol and SDK are MIT by design. The value is in **operating the service**, not in
withholding code.

## The boundary

| Component | License | Where it lives | Why |
|---|---|---|---|
| `fb-exact` protocol spec | **MIT (open)** | [`SPEC.md`](SPEC.md) | A standard nobody can read isn't a standard. |
| Provider SDK (`requirePayment`) | **MIT (open)** | `src/sdk/`, npm `os-x402` | Adoption engine. Must be inspectable. |
| Agent SDKs (TS + Python `payAndFetch`) | **MIT (open)** | `src/sdk/agent.ts`, `python/` | Same — drives integration. |
| Core (scheme, tx build, on-chain verify, llm) | **MIT (open)** | `src/core/` | Just Bitcoin tx construction; no secret sauce exists here. |
| Reference facilitator (self-host) | **MIT (open)** | `src/facilitator/` | Lets anyone self-host → makes us the standard. |
| Merchant dashboard | **MIT (open)** | `dashboard/` | Convenience; not a moat. |
| **Multi-tenant marketplace & discovery network** | **Hosted-only** | (separate, not in this repo) | The network effect is the value — operated, not protected. |
| **Managed operations** | **Hosted / paid** | infra | Managed UniSat keys, uptime, analytics, fiat-pricing oracle, reputation/verified providers, rate limits, support. |

**The line is not "secret vs public code." It is "code anyone can run" vs "a network and service only we
operate."**

## What the hosted service offers

Self-hosting is free and supported. The hosted facilitator exists for teams who'd rather not run
infrastructure — it provides a maintained indexer connection, zero-ops uptime, and (over time) managed
conveniences like analytics and fiat-denominated pricing. Self-hosters are first-class either way.

## Practical rules

- Keep BTCPay/upstream and third-party copyright notices intact (MIT obligation).
- Anything in this repo is MIT. The marketplace/managed services are deliberately **not** in this repo.
- Self-hosters are welcome and encouraged — including publishing into the public marketplace, because
  more listings make the network stronger.
