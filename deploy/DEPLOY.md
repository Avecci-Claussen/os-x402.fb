# Deploying Turnpike (os-x402) to a server

The **facilitator holds no private keys** — only the UniSat key, your fee address, a JWT secret, and the
DB. The dashboard is a static-ish Next.js app. Both sit behind HTTPS.

## 1. Facilitator + Postgres (Docker)
```bash
# in repo root, with .env set: UNISAT_API_KEY, FEE_ADDRESS, JWT_SECRET, POSTGRES_PASSWORD
docker compose up -d           # postgres + facilitator on 127.0.0.1:4040
```

## 2. Dashboard
```bash
cd dashboard
echo "NEXT_PUBLIC_FACILITATOR_URL=https://pay.example.com" > .env
npm install && npm run build && npm run start   # 127.0.0.1:3000  (or deploy to Vercel)
```

## 3. HTTPS (Caddy — automatic certs)
Edit `deploy/Caddyfile` with your domains, point DNS at the server, then:
```bash
caddy run --config deploy/Caddyfile
```
Now: dashboard at `https://app.example.com`, facilitator at `https://pay.example.com`.

## Hardening checklist
- [ ] Strong `JWT_SECRET` and `POSTGRES_PASSWORD` (not the dev defaults).
- [ ] Restrict CORS in the facilitator to your dashboard origin (currently `*` for dev).
- [ ] Back up the Postgres volume (`./pgdata`) — it holds merchants/services/payment history.
- [ ] Monitor the facilitator (`/health`) and the UniSat API quota; add retry/cache (+ own-node fallback) for scale.
- [ ] Consider requiring 1 confirmation for high-value calls (0-conf is fine for small ones).
- [ ] Providers should use the hosted facilitator URL; self-hosters run it fee-free (open-core).
