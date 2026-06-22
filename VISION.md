# OS-x402 — The Open Payment Rail & Marketplace for Autonomous Agents on Fractal Bitcoin

> One document: what we are building, why it matters, how it works, the roadmap, the
> business model, and why this deserves an ecosystem grant.
>
> **Project:** OS-x402  ·  **Owner:** Cyract / The Lonely Bit (thelonelybit.org)
> **License:** MIT (open core)  ·  **Chain:** Fractal Bitcoin (FB), on-chain, non-custodial
> **Status:** core protocol + multi-tenant facilitator + SDKs **proven end-to-end on Fractal mainnet**
> (real txids below). Marketplace layer: design complete, build starting.

---

## 1. The one-paragraph pitch

AI agents can now *do* things on the internet, but they cannot *buy* things. Every paid API on
earth is gated by a signup form, an email verification, a credit card, and an account — none of
which an autonomous agent can complete. **OS-x402 is the missing turnstile: an open HTTP-402
payment standard that lets any software pay per request, on-chain, in Fractal Bitcoin, with no
account and no human in the loop.** A provider wraps any endpoint in three lines and starts
charging; an agent calls it, receives `402 Payment Required`, pays a single non-custodial FB
transaction, and is let through. On top of this open rail we build the one thing that is *not*
copyable — a **two-sided marketplace** where agents discover paid capabilities and providers reach
buyers. The protocol is free and self-hostable so it becomes the standard; the marketplace and
hosted facilitator are the business.

---

## 2. The problem

**The agent economy has no payment layer.** The same week models learned to call tools, browse, and
chain actions, they hit a wall: the entire monetized web assumes a *human* is paying.

- **For sellers (API/data/compute/AI providers):** to charge a machine you must build accounts, API-key
  issuance, billing, fraud controls, and a card processor — weeks of work and a Stripe dependency that
  won't onboard a bot. Micro-priced calls (a fraction of a cent) are impossible under card economics
  (min fees, chargebacks).
- **For buyers (agents and the developers who run them):** an agent mid-task that needs a paid data
  point or tool call simply *can't get it*. It can't sign up, can't enter a card, can't click a
  verification email. The task stalls or the developer pre-wires a bespoke deal.
- **For Fractal Bitcoin specifically:** FB has fast (~30s) blocks and near-zero fees — technically the
  *ideal* settlement layer for high-frequency machine micropayments — but **no payment-request standard
  and no rail** that turns that capability into something developers can actually plug in.

x402 (HTTP 402 "Payment Required", a long-reserved status code being revived as an open payments
convention) is the right primitive. **Nobody has built a production, non-custodial x402 rail native to
Fractal.** We have.

---

## 3. The solution: an open rail + a marketplace (open core)

Two layers, deliberately split by what should be free vs. what is the business.

### Layer A — The open protocol & SDKs (MIT, free, self-hostable)
The wire format, the facilitator reference implementation, and drop-in libraries for **providers**
(sell) and **agents** (buy). We *want* people self-hosting: every self-hoster speaks our `fb-exact`
scheme, which makes OS-x402 the **de-facto standard** for paying in FB. Fighting self-hosting would
kill adoption; embracing it makes us the default even when we earn nothing on that specific call.

### Layer B — The marketplace & hosted facilitator (the business)
A two-sided network where **agents discover** paid Fractal capabilities and **providers list** them —
plus a hosted, zero-ops facilitator for the long tail who don't want to run Bitcoin infrastructure.
This is the part that is *not* copyable: a protocol can be forked in an afternoon, a network of buyers
and sellers cannot. Revenue is a small per-call facilitator fee and optional managed hosting — never
custody.

---

## 4. How it works (the actual mechanism)

The entire protocol surface is one JSON response. A provider's paid route, hit without payment, returns:

```json
{
  "x402Version": 1,
  "error": "payment required",
  "accepts": [{
    "scheme": "fb-exact",
    "asset": "FB",
    "network": "fractal-mainnet",
    "payTo": "bc1q…",                       // fresh address derived from the provider's xpub (their payout)
    "amount": 10000,                          // sats of FB owed
    "facilitatorFee": { "payTo": "bc1q…", "amount": 1000 },   // operator's cut (2nd output)
    "resource": "/ai/summary?address=…",
    "nonce": "b86a04c5…",                    // one-time ticket binding payment → this request
    "expiresAt": 1782086629943
  }]
}
```

The flow, with **no human and no custody** at any step:

1. **Agent** GETs a paid endpoint → server replies `402` with the block above.
2. **Agent** builds **one FB transaction with two outputs** — `amount` → provider, `facilitatorFee` →
   operator — and broadcasts it. (Wallet-to-wallet. The rail never touches the money.)
3. **Agent** retries the request with `X-PAYMENT-NONCE` + `X-PAYMENT-TXID` headers.
4. **Facilitator** verifies the transaction on-chain (correct outputs, amounts, nonce, not replayed),
   then signals OK.
5. **Provider** runs the actual work (data lookup, LLM call, compute) and returns the result.

**Non-custodial by construction:** the provider supplies an **xpub**; the facilitator derives a fresh
watch-only address per request and *cannot spend* — funds settle directly to the provider's own wallet.
The facilitator holds **no private keys** (only a read API key, a fee address, and a DB). This is the
core legal/safety property: **no custody → no money-transmitter/MSB/VASP licensing trigger.**

### The three roles (and who earns what)
| Role | Runs | Holds | Earns / pays |
|---|---|---|---|
| **Operator** | the facilitator / marketplace | fee address, read-only indexer key, DB | the per-call **facilitator fee** across *all* providers |
| **Provider** | their own API behind our SDK | their **xpub** + a service key | the call **price** → straight to their wallet |
| **Agent (consumer)** | the calling app/agent | a funded FB wallet | pays price + fee, per call, autonomously |

### What you can sell behind it (any purpose)
`requirePayment(...)` is content-agnostic. The same three lines monetize anything an HTTP request
returns: **live data** (balances, tx/ordinals lookups), **an LLM call you run** ("AI analysis, 10k
sats/call"), **compute** (render/transcode/scrape), **downloads/unlocks**, or **a tool an agent calls
mid-task.** The provider writes "do my thing, return JSON"; the consumer writes `payAndFetch(url)`.

---

## 5. Why Fractal Bitcoin

This rail is possible *because* of Fractal's parameters, not in spite of them:

- **~30s blocks** → a paid call confirms in seconds, not the ~10 min Bitcoin would impose. Usable in a
  live agent loop.
- **Near-zero fees** → micropayments (hundreds of sats) are economically real; on most chains the fee
  would dwarf the payment.
- **Bitcoin-identical tooling** → FB reuses Bitcoin's address/key/PSBT/descriptor formats, so the rail
  is built on battle-tested libraries (bitcoinjs-lib, BIP32 xpub derivation, BIP322 signing) with no
  novel cryptography to audit.
- **Ecosystem fit** → maps directly to the Fractal "decentralized payment processor" wishlist and gives
  the chain a flagship use case: **the settlement layer for the autonomous agent economy.**

OS-x402 gives Fractal something no amount of marketing can: a concrete, working reason for high-frequency
on-chain volume.

---

## 6. What already exists (proven, not vaporware)

All of the following runs **today on Fractal mainnet** with real transactions:

- **Core protocol** (`src/core`): `fb-exact` scheme, 2-output non-custodial payment construction,
  on-chain verification via the UniSat Fractal indexer, cardinal-UTXO-safe coin selection (never spends
  inscription/asset UTXOs), dust-aware fee flooring.
- **Multi-tenant facilitator** (`src/facilitator`): Postgres-backed REST API — wallet sign-in (BIP322,
  works for SegWit *and* Taproot), service registration (xpub, fee bps), per-request address derivation,
  payment verification, replay protection, fee accounting, usage stats. **Holds no private keys.**
- **Provider SDK** (`src/sdk/middleware.ts`): `requirePayment({ price })` Express middleware — wrap any
  route, charge FB per call, zero crypto on the provider's side.
- **Agent SDKs**: TypeScript (`src/sdk/agent.ts` `payAndFetch`) and **Python** (`python/`, native FB
  P2WPKH signing) — both proven paying real mainnet txs.
- **Browser payments**: server builds an unsigned 2-output PSBT; UniSat extension signs + broadcasts
  (key stays with the user). `/dashboard/playground` page.
- **Dashboard** (`dashboard/`, Next.js): wallet connect, create service (paste xpub → get key + snippet),
  live earnings, usage charts, payments table.
- **Example product** (`src/examples/demo-server.ts`): a "Fractal Tools API" — `/tools/balance`,
  `/tools/tx`, and `/ai/summary` (now wired to a **real Claude call** that analyzes live on-chain data),
  each paid per call in FB.
- **Deploy**: Dockerfile + docker-compose (postgres + facilitator + dashboard) + Caddy auto-HTTPS.

**Mainnet proof (real txids):**
- First end-to-end paid call: `62d216267bf06ac76872b1302bf5eee82ea79509050c2d0587847119d401691f`
- Multi-tenant facilitator e2e: `bf8f37655ee8c3ee…`
- Live-data tool purchase: `bce7384b8c8d…`  ·  Python agent pay: `20c4aa3de34a85bb…`
- BIP322 (Taproot-capable) wallet sign-in e2e: `70f241cc…`

> Translation for a grant reviewer: the hard, risky part — **non-custodial on-chain micropayments that
> actually settle on Fractal mainnet** — is *done and demonstrable*. The grant funds productionization
> and the marketplace, not a science experiment.

---

## 7. The marketplace — the part that earns "huge"

The protocol alone is a commodity (a determined dev can self-host it; that's by design). Defensibility
comes from the **two-sided network** built on top:

- **For agents — discovery:** a registry/API where an agent can *find* paid Fractal capabilities at
  runtime ("get me a wallet-risk score", "summarize this tx", "fetch this dataset"), with machine-readable
  pricing and a uniform pay-to-use contract. An agent points at one endpoint and can buy from thousands
  of providers.
- **For providers — distribution:** list a capability once and reach every agent on the network. The
  reason a provider joins *us* instead of self-hosting is the **buyers are already here.**
- **Trust & reputation:** verified providers, honored-payment history, ratings — non-custodial-compatible
  trust signals that are hard to bootstrap and harder to fork.
- **Value-adds the long tail can't easily replicate:** fiat-denominated pricing with an FB rate oracle
  (price in USD, settle in FB), analytics, uptime, higher rate limits, fee-split routing.

This is the Stripe lesson: charging a card isn't hard — *everyone already being on Stripe* is the moat.
We are building the place agents and providers are already on, for Fractal.

---

## 8. Business model (open core, never custody)

| Layer | What | Pricing | Why this split |
|---|---|---|---|
| Protocol + SDKs + agent libs | MIT, self-hostable | **Free** | Adoption engine → makes us the standard. |
| Hosted facilitator | Zero-ops rail for the long tail | **Per-call fee** (the 2nd output) | Same as hosted BTCPay: most won't run Bitcoin infra. |
| Marketplace | Discovery + distribution + trust | **Per-call fee + listing/premium** | The non-copyable network. The real business. |
| Premium / enterprise | SLAs, fiat pricing oracle, analytics, custom splits | **Subscription** | Services self-hosters *can't* trivially replicate. |

**Hard line: we never take custody.** No pooled funds, no user balances we control, no spending keys.
Revenue is a transparent on-chain fee output + hosting/marketplace services. This keeps us out of
money-transmitter/MSB/VASP licensing — the same sustainability posture as BTCPay Server and the sibling
SoloSatPay project. (Honest caveat: a determined high-volume provider *can* self-host to avoid the fee.
That's fine and expected — we monetize the long tail and the marketplace network, not a captive audience.)

---

## 9. Roadmap

**Phase 0 — Done (proven on mainnet).** Core `fb-exact` protocol, non-custodial 2-output settlement,
multi-tenant facilitator, provider + TS/Python agent SDKs, browser PSBT pay, dashboard, BIP322 auth,
real-Claude example endpoint. *(See §6 for txids.)*

**Phase 1 — Open-source launch (weeks 1–4).** Harden and publish OS-x402 as a clean MIT monorepo:
finalized protocol **spec document** (`fb-exact` v1), packaged SDKs (`npm`, `pip`), one-command
self-host (`docker compose up`), example providers, security notes (replay, dust, nonce expiry,
xpub-only invariant), and the **"FB ≠ BTC address" safety doc** (byte-identical encodings → must track
network out-of-band). Goal: a stranger self-hosts a paid endpoint in <15 minutes.

**Phase 2 — Marketplace MVP (weeks 4–10).** Provider registry + machine-readable discovery API for
agents; capability search; per-provider reputation/honored-payment history; hosted facilitator with
fee accounting; a public directory site. Goal: an agent discovers and pays a provider it had no
prior arrangement with.

**Phase 3 — Trust, pricing & scale (weeks 10–20).** Fiat-denominated pricing via an FB rate oracle
(price in USD, settle in FB); verified-provider program; rate limits/quotas; Taproot (bc1p) PSBT
browser payments; analytics; prepaid-credits mode for ultra-high-frequency callers. Goal: production
volume from real third-party providers and agents.

**Phase 4 — Ecosystem & standard (ongoing).** Reference integrations (agent frameworks, MCP tool
adapters so any MCP-speaking agent can pay-to-call), grants/bounties for providers, push `fb-exact` as
the canonical FB payment scheme, interop with the broader x402 standard. Goal: OS-x402 is *the* way
software pays in Fractal Bitcoin.

---

## 10. Why this deserves an ecosystem grant

- **Direct wishlist fit.** A decentralized, non-custodial **payment processor / settlement rail** is an
  explicit Fractal ecosystem need. OS-x402 delivers it *and* a flagship use case (agent payments) that
  drives exactly the high-frequency, low-fee, fast-confirmation volume Fractal's parameters were built
  for.
- **De-risked.** The hardest part — non-custodial micropayments settling on Fractal mainnet — is already
  working with public txids. The grant funds productionization and network-building, not unproven R&D.
- **Public good, then sustainable.** Core protocol and SDKs are MIT and self-hostable forever; the
  ecosystem keeps a free, open rail regardless of our company's fate. Revenue (marketplace + hosting fee,
  never custody) follows the proven BTCPay model, so the project is sustainable without rent-seeking or
  licensing risk.
- **Network multiplier.** Every provider and agent that adopts OS-x402 is new on-chain FB demand and a
  new reason to hold/transact FB. A payment standard compounds: it makes *other* people's Fractal apps
  monetizable, multiplying ecosystem activity beyond our own usage.
- **Credible team & track record.** Built by a prolific Fractal builder (The Lonely Bit) already
  shipping FB infrastructure (SoloSatPay — a BTCPay fork adding native Fractal support). Demonstrated
  ability to take Bitcoin-grade tooling and make it real on Fractal.

**Use of funds (indicative):** Phase 1 OSS hardening + spec + audits of the non-custodial flow; Phase 2
marketplace build + hosted facilitator infra; developer relations (example providers, agent-framework
integrations, docs); a provider bounty pool to seed the two-sided network.

---

## 11. Honest risks & how we address them

| Risk | Reality | Mitigation |
|---|---|---|
| Protocol is copyable | True — by design (MIT). | Moat is the **marketplace network** + reputation + hosted convenience, not the wire format. |
| Big providers self-host to dodge the fee | Expected. | Monetize the **long tail** + value-adds (fiat oracle, discovery, trust) they won't rebuild. |
| Demand unproven | Tech works; *market* is untested. | Phase 2 explicitly tests two-sided demand; seed with bounties + our own SoloSatPay/Fractal apps. |
| FB volatility | Settlement asset is volatile. | Phase 3 fiat-pricing oracle: price in USD, settle in FB (does not make us custodial). |
| **FB and BTC addresses are byte-identical** | A real fund-loss footgun. | Network tracked out-of-band everywhere; explicit safety doc; `network: fractal-mainnet` in every requirement. |
| Custody/licensing | The killer for most "crypto payment" startups. | **Never take custody.** xpub-only, keyless facilitator, on-chain fee output. Structurally avoided. |

---

## 12. Repository layout (this folder)

```
os-x402/
├── LICENSE                 # MIT
├── VISION.md               # this document
├── README.md               # quickstart / self-host
├── USAGE.md                # operator / provider / consumer cookbook
├── src/
│   ├── core/               # fb-exact scheme, 2-output settlement, on-chain verify (the protocol)
│   ├── facilitator/        # multi-tenant REST facilitator (Postgres; holds no keys)
│   ├── sdk/                # provider middleware + TS agent SDK
│   ├── examples/           # demo "Fractal Tools API" incl. real-Claude paid endpoint
│   └── e2e/                # mainnet end-to-end proofs + no-payment interface demo (show.ts)
├── python/                 # Python agent SDK (pay_and_fetch)
├── dashboard/              # Next.js merchant dashboard (connect wallet, create service, earnings)
├── deploy/                 # Caddyfile + DEPLOY.md (auto-HTTPS)
├── docker-compose.yml      # postgres + facilitator + dashboard, one command
└── marketplace/            # (Phase 2) discovery API + provider registry + directory — to build
```

---

*OS-x402 is open-source (MIT). The protocol belongs to the ecosystem; the marketplace is the business.
Non-custodial, on-chain, agent-native — the payment rail for autonomous software on Fractal Bitcoin.*
