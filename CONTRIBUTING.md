# Contributing

OS-x402 is MIT-licensed and open to contributions — especially SDKs in new languages, facilitator
hardening, and example providers.

## Dev setup

```bash
npm install
docker run -d --name x402-pg -p 127.0.0.1:5434:5432 \
  -e POSTGRES_USER=x402 -e POSTGRES_PASSWORD=x402 -e POSTGRES_DB=x402 postgres:16
cp .env.example .env        # fill UNISAT_API_KEY, FEE_ADDRESS, JWT_SECRET (+ PAYER_WIF for paying demos)
npm run dev-stack           # facilitator :4040 + demo Fractal Tools API :4055
```

- `npm run typecheck` — must pass before a PR.
- `npm run build` — must produce a clean `dist/` (SDK only). Run `npm pack --dry-run` to confirm nothing
  extra ships.
- Tests that move funds (`e2e`, `e2e:ai`, `agent:demo`) spend **real FB on mainnet** (Fractal has no
  faucet/testnet liquidity for this). Keep amounts tiny.

## Ground rules

- **Never break the network-safety invariant.** FB and BTC addresses are byte-identical; `fb-exact`
  carries `network: fractal-mainnet` everywhere and the code must keep tracking network out-of-band.
  See [`SPEC.md`](SPEC.md) §1.
- **Non-custodial only.** The facilitator must never hold private keys or pooled funds. xpub in, fresh
  watch-only addresses out.
- **Keep the SDK runtime tiny.** Only the provider SDK's true runtime dep (`axios`) belongs in
  `dependencies`; everything server-side stays in `devDependencies`.
- Match the surrounding code style. Keep PRs focused.

## What's especially welcome

- Confirmation-depth + multi-oracle verification (SPEC §5.1).
- Agent SDK config-injection refactor so `payAndFetch` is npm-publishable (see `PUBLISHING.md`).
- Taproot (`bc1p`) PSBT browser payments.
- SDKs in Go / Rust / etc. speaking `fb-exact`.
