# OpenClaw wrapper

Thin CLI for agent runtimes: discover heroes, pay FB, print JSON.

```bash
export X402_API_URL=https://x402.fractal.api.thelonelybit.org
export PAYER_WIF=…
export PAYER_ADDRESS=bc1q…

# from repo root (needs api deps installed)
cd api && npm install
cd ../agent-kit/openclaw
npx tsx wrapper.ts list
npx tsx wrapper.ts call balance --address=bc1qe3m0nc5pytuaktg8tjy4ltwrket3e9h426yu9v
```

Uses `api/src/sdk/agent.ts` (`payAndFetch`) with rawTx settlement headers.
