# Using os-x402 — cookbook

A complete walkthrough of what it does and how to use it. Three roles:

- **Operator** (you): runs the facilitator + dashboard, earns a per-call fee.
- **Provider** (a dev): wraps their API/AI endpoint to charge FB per call; gets paid to their own wallet.
- **Consumer** (a person or AI agent): pays FB per call to use a provider's endpoint.

---

## 0. Run the stack (operator)
```bash
# Postgres
docker run -d --name x402-pg -p 127.0.0.1:5434:5432 \
  -e POSTGRES_USER=x402 -e POSTGRES_PASSWORD=x402 -e POSTGRES_DB=x402 postgres:16
# Facilitator (needs UNISAT_API_KEY, FEE_ADDRESS, JWT_SECRET in .env — no private keys)
npm install && npm run facilitator           # http://127.0.0.1:4040
# Dashboard (self-serve onboarding)
cd dashboard && npm install && npm run dev    # http://localhost:3000
```
Production: `docker compose up -d` (postgres + facilitator) behind HTTPS.

## 1. Become a provider (sign up + add a service)
Either in the **dashboard** (sign up → New service → paste your FB account **xpub** → set fee → copy the
API key + snippet), or via API:
```bash
TOKEN=$(curl -s localhost:4040/v1/auth/register -H content-type:application/json \
  -d '{"email":"me@example.com","password":"password123"}' | jq -r .token)
curl -s localhost:4040/v1/services -H "authorization: Bearer $TOKEN" -H content-type:application/json \
  -d '{"name":"My AI API","xpub":"xpub6...","feeBps":1000}'   # -> { api_key: "ssk_..." }
```
Payments derive from **your** xpub → funds land in **your** wallet. The operator never holds funds.

## 2. Monetize an endpoint (provider, ~4 lines)
```ts
import { requirePayment } from "os-x402/sdk/middleware";

app.get("/ai/chat",
  requirePayment({ facilitatorUrl: "https://pay.example.com", apiKey: process.env.SVC_KEY!, price: 10_000 }),
  (req, res) => res.json({ answer: runModel(req.query.q) }));   // price is sats of FB
```

## 3. Consume it (AI agent, auto-pay)
```ts
import { payAndFetch } from "os-x402/sdk/agent";
const out = await payAndFetch("https://api.example.com/ai/chat?q=hello");
// → hits 402, broadcasts ONE FB tx (provider + fee), retries, returns the unlocked body + receipt
```

## 4. The flow by hand (curl)
```bash
# 1) call without payment -> 402 with requirements
curl -i https://api.example.com/tools/balance?address=bc1q...
#   402 { accepts: [{ payTo, amount, facilitatorFee:{payTo,amount}, nonce }] }
# 2) send ONE FB tx with two outputs: payTo=amount and facilitatorFee.payTo=fee  (your wallet)
# 3) retry with proof
curl https://api.example.com/tools/balance?address=bc1q... \
  -H "X-PAYMENT-NONCE: <nonce>" -H "X-PAYMENT-TXID: <txid>"
#   200 + the data
```

## 5. What it can do — the showcase "Fractal Tools API"
`src/examples/demo-server.ts` is a real provider an agent pays per call (backed by UniSat data):

| Endpoint | Price | Returns |
|---|---|---|
| `GET /tools` | free | tool catalogue (discovery) |
| `GET /tools/balance?address=` | 2,000 sats | FB balance + UTXO/inscription summary |
| `GET /tools/tx?txid=` | 2,000 sats | transaction detail |
| `GET /ai/summary?address=` | 10,000 sats | AI-style wallet summary (swap in your LLM) |

Run the full mainnet demo: `npm run e2e` (boots facilitator → registers a service → agent pays a real
FB call for `/tools/balance` → gets live data → facilitator records the fee).

## Notes
- **Non-custodial**: one tx pays provider + operator fee; nobody holds funds. Operator fee is enforced
  by the hosted facilitator (self-hosters can run fee-free — that's the open-core model).
- **Pricing**: in FB (sats). Min fee is dust-safe (≥330 sats). Price calls in cents-and-up; sub-cent
  micro-calls want the (future) prepaid-credits mode.
- **0-conf**: payments verify on first sight via UniSat; require confirmations for high-value calls.
- **Auth**: API keys for service integration; dashboard login via JWT today (wallet sign-in planned).
