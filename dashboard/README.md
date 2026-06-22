# SatRail dashboard

Next.js self-serve dashboard for the os-x402 facilitator: signup/login, register a service
(paste your FB xpub, set pricing), copy the integration snippet + API key, and view earnings/usage.

```bash
cp .env.example .env        # NEXT_PUBLIC_FACILITATOR_URL=...
npm install
npm run dev                 # http://localhost:3000  (facilitator must be running, e.g. :4040)
```

Brand lives in `lib/brand.ts` (name "SatRail" is a placeholder — change it there to rebrand everything).
