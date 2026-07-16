# x402.fb — the open payment rail for autonomous agents on Fractal Bitcoin

![License: MIT](https://img.shields.io/badge/license-MIT-ff7a3c)
![Chain](https://img.shields.io/badge/chain-Fractal%20Bitcoin-ff7a3c)
![Protocol](https://img.shields.io/badge/protocol-x402%20·%20fb--exact-111)
![Non-custodial](https://img.shields.io/badge/non--custodial-✓-4ec58a)
![Mainnet](https://img.shields.io/badge/Fractal%20mainnet-proven-4ec58a)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-4ec58a)

**A non-custodial, pay-per-call payment rail for Fractal Bitcoin (FB).** Any API, AI endpoint, data
feed, or agent service can charge **FB per request** over plain HTTP, using the
[x402](https://github.com/coinbase/x402) `402 Payment Required` standard. AI agents can't fill in a
signup form or a credit card — but they can pay a 10,000-sat invoice. This is the turnstile that lets
software buy capabilities by itself.

> 📖 **The protocol is specified in [`SPEC.md`](SPEC.md)** (`fb-exact` wire format + verification).
> MIT licensed — the protocol, SDKs, and facilitator are free and self-hostable.

> **Status: proven end-to-end on Fractal mainnet.** The full flow (wallet sign-in → service → agent pays
> a real FB call → verified on-chain → served → fee accounted) settled real transactions
> (e.g. tx `bf8f37655ee8c3ee144440271ba7c4fdad058da5767d73617f7f6aac2eaeded5`).

### What's new in 0.3
- Prefer **`X-PAYMENT-RAWTX`** — facilitator verifies 2-output settlement locally (indexer outs = fallback)
- **`binding`** on 402 accepts[] — locks payment to the resource + amounts
- Agent SDK spend caps + returns `{ txid, rawTx, binding }`
- `GET /v1/price/fb` (FB/USDT ≈ USD display) · `GET /v1/scheme/fb-exact`
- Dynamic fee rates · confirmation policy for high-value calls
- Helmet + rate limits · agent-kit (MCP / Claude / OpenClaw)

## Why it's different
- **Non-custodial, earn-per-call.** Every paid request settles in **one FB transaction with two
  outputs** — the merchant's address **+** a small facilitator fee. The operator never holds funds (no
  money-transmitter exposure) yet earns on every call. (AI "relay" sites use prepaid custody — we don't.)
- **Multi-tenant SaaS.** Merchants sign up, register a service with their **own xpub**, and get an API
  key. The facilitator derives per-request receive addresses from their xpub (watch-only) and verifies
  payments via the UniSat Open API. No node to run.
- **Drop-in for providers, native for agents.** Service providers add one middleware; AI agents/clients
  auto-pay a `402` and retry. General rail — AI is just one use case.

## Architecture

```mermaid
flowchart LR
  agent([AI agent / app]):::ext
  prov["Provider server<br/>requirePayment() · SDK<br/>holds only an API key"]:::prov
  fac["x402.fb facilitator<br/>derive addr from xpub · verify · fees<br/>(holds NO private keys)"]:::fac
  idx["Fractal indexer<br/>(UniSat Open API)"]:::ext
  db[("Postgres<br/>services · payments")]:::db

  agent -- "GET /endpoint" --> prov
  prov -- "402 + requirements" --> agent
  agent -- "1 FB tx: provider + fee" --> chain((Fractal Bitcoin)):::chain
  agent -- "retry + txid" --> prov
  prov -- "/v1/requirements · /v1/verify (x-api-key)" --> fac
  fac --> db
  fac -- "verify outputs on-chain" --> idx
  idx -. "reads" .-> chain

  classDef prov fill:#16110b,stroke:#ff7a3c,color:#fff;
  classDef fac fill:#0e1014,stroke:#ff7a3c,color:#fff;
  classDef ext fill:#101216,stroke:#555,color:#ddd;
  classDef db fill:#101216,stroke:#4ec58a,color:#ddd;
  classDef chain fill:#1a1206,stroke:#ffab63,color:#ffab63;
```

**The 402 handshake** — one ordered exchange, non-custodial throughout:

```mermaid
sequenceDiagram
  autonumber
  participant A as Agent
  participant P as Provider (SDK)
  participant F as Facilitator
  participant C as Fractal Bitcoin
  A->>P: GET /v1/inference
  P->>F: requirements(resource, price)
  F-->>P: payTo (fresh addr from xpub), amount, fee, nonce
  P-->>A: 402 Payment Required + requirements
  A->>C: broadcast 1 tx → provider + facilitator fee
  A->>P: retry with nonce · txid · rawTx · binding
  P->>F: verify(nonce, txid, rawTx, binding)
  F->>F: local out check from rawTx (preferred)
  F-->>P: ok — outputs match
  P-->>A: 200 OK + result
```

| Module | Role |
|---|---|
| `src/core/*` | FB wallet, UniSat client, `fb-exact` scheme, PSBT/rawTx local verify, FB/USDT display price |
| `src/facilitator/*` | Postgres multi-tenant service: auth, services, requirements, verify, build-payment |
| `src/sdk/middleware.ts` | provider drop-in — `requirePayment({ facilitatorUrl, apiKey, price })` |
| `src/sdk/agent.ts` | consumer/agent — `payAndFetch(url, { maxAmountSats })` auto-pays a 402 with rawTx |
| `agent-kit/` | MCP · Claude skill · OpenClaw wrapper |
| `src/examples/demo-server.ts` | example provider API (paywalled data + metered AI) |
| `src/e2e/full.ts` | full mainnet SaaS test |

## API (facilitator)
**Dashboard / management (JWT / UniSat BIP322):**
`POST /v1/auth/challenge` · `POST /v1/auth/wallet` · `GET /v1/auth/me` ·
`POST /v1/services {name,xpub,feeBps}` · `GET /v1/services` · `GET /v1/services/:id/payments` · `GET /v1/stats`
**Provider integration (header `x-api-key`):**
`POST /v1/requirements {resource,price}` · `POST /v1/verify {nonce,txid,rawTx?,binding?}` · `POST /v1/build-payment`
**Public helpers:**
`GET /v1/price/fb` · `GET /v1/scheme/fb-exact` · `GET /v1/ecosystem`
## Integrate as a provider (the SDK)
```bash
npm install os-x402
```
```ts
import { requirePayment } from "os-x402/sdk";

app.get("/v1/inference",
  requirePayment({ facilitatorUrl: "https://x402.fb", apiKey: process.env.SVC_KEY!, price: 10_000 }),
  (req, res) => res.json({ out: model(req) }),   // only runs after payment is verified on-chain
);
```
That's the whole integration — no keys, no node, no DB on your side. (Publishing the SDK:
[`PUBLISHING.md`](PUBLISHING.md).)

## Run the full stack locally
```bash
cp .env.example .env          # UNISAT_API_KEY, FEE_ADDRESS, JWT_SECRET (+ PAYER_WIF for paying demos)
npm install
docker run -d --name x402-pg -p 127.0.0.1:5434:5432 \
  -e POSTGRES_USER=x402 -e POSTGRES_PASSWORD=x402 -e POSTGRES_DB=x402 postgres:16
npm run dev-stack             # facilitator :4040 + demo "Fractal Tools API" :4055
```

## See the value (autonomous agent pays for what it needs)
```bash
# an agent answers a question by BUYING on-chain data via x402, then reasoning with a model
# (free local Ollama by default; Claude if ANTHROPIC_API_KEY is set). Spends a little real FB.
npm run agent:demo "Is bc1q…  an active wallet, and does it hold any tokens?"
```

## Deploy the facilitator
```bash
# set UNISAT_API_KEY, FEE_ADDRESS, JWT_SECRET, POSTGRES_PASSWORD in the environment / .env
docker compose up -d          # postgres + facilitator + dashboard (facilitator holds NO private keys)
```
Put it behind HTTPS — the included `deploy/Caddyfile` does auto-HTTPS. Details in `deploy/DEPLOY.md`.

## Docs
- [`SPEC.md`](SPEC.md) — the `fb-exact` x402 scheme (wire format + verification rules).
- [`USAGE.md`](USAGE.md) — provider / agent / operator cookbook.
- [`PUBLISHING.md`](PUBLISHING.md) — releasing the repo, npm SDK, and Python SDK.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — dev setup and ground rules.

## License
MIT. Built by [The Lonely Bit](https://thelonelybit.org).
