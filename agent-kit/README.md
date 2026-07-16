# x402.fb agent kit

Install path for agents — discover paid tools, pay in **FB sats**, unlock responses. Prices may also be
shown as **≈ USD** from FB/USDT spot (display only; settlement is always sats).

## Env

```bash
# Self-hosted facilitator OR the public hosted API
export X402_API_URL=http://127.0.0.1:4040
# export X402_API_URL=https://x402.fractal.api.thelonelybit.org
export PAYER_WIF=…          # Fractal cardinal wallet WIF
export PAYER_ADDRESS=bc1q…  # matching address
# optional spend caps
export MAX_AMOUNT_SATS=50000
export MAX_FEE_SATS=5000
```

## Discover

```bash
curl -s "$X402_API_URL/v1/tools.json" | jq '{pricing, heroes: [.heroes[] | {id, price_sats, price_usd_approx, endpoint, live}]}'
curl -s "$X402_API_URL/v1/price/fb" | jq '{usdPerFb, asOf, note}'
```

See also [`SCHEME.md`](SCHEME.md) for the `fb-exact` contract.

## One call (OpenClaw / CLI)

```bash
cd agent-kit/openclaw
npx tsx wrapper.ts list
npx tsx wrapper.ts call balance --address=bc1q…
```

## MCP (Claude Desktop / Cursor)

```bash
cd agent-kit/mcp && npm install
# add to MCP config:
#   command: npx
#   args: ["tsx", "/absolute/path/to/agent-kit/mcp/server.ts"]
#   env: { X402_API_URL, PAYER_WIF, PAYER_ADDRESS }
```

## Claude Code skill

Copy [`claude/SKILL.md`](claude/SKILL.md) into your project skills (or `.claude/skills/x402-fb/SKILL.md`).

## Settlement

Prefer `X-PAYMENT-RAWTX` — facilitator parses outs locally. See live:

`GET $X402_API_URL/v1/tools.json` → `settle` block.

Honest model: **non-custodial · locally verified** — not full BSV nonce-UTXO trustlessness. USD figures are estimates from FB/USDT; never settle in USDT.
