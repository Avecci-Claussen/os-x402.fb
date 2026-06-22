# Publishing

How to deploy OS-x402 publicly: the GitHub repo, the npm SDK, and the Python SDK. None of these are run
automatically — they are deliberate, manual release steps.

## 1. GitHub

The repo is ready to push (MIT licensed, no secrets — `.env` is gitignored; verify with
`git status` before pushing):

```bash
# from os-x402/
gh repo create os-x402 --public --source=. --remote=origin --push
# or: git remote add origin git@github.com:<you>/os-x402.git && git push -u origin main
git tag v0.1.0 && git push --tags
```

## 2. npm — the provider SDK (`os-x402`)

The package ships **only the compiled SDK** (`dist/sdk` + types). Its single runtime dependency is
`axios`; all server/example libraries are `devDependencies`, so an SDK consumer doesn't pull
bitcoinjs/pg/express. `files` + `exports` enforce this.

```bash
npm run build           # tsc -p tsconfig.build.json → dist/ (SDK + types only)
npm pack --dry-run      # inspect EXACTLY what would publish (expect dist/, README.md, LICENSE)
npm login
npm publish             # prepublishOnly rebuilds; publishConfig.access=public
```

A provider then integrates with no crypto and no infra:

```ts
import { requirePayment } from "os-x402/sdk";

app.get("/v1/inference",
  requirePayment({ facilitatorUrl: "https://x402.fb", apiKey: process.env.SVC_KEY!, price: 10_000 }),
  (req, res) => res.json({ out: model(req) }),
);
```

> Note: v0.1 publishes the **provider** SDK (`requirePayment`) — self-contained and production-shaped.
> The **agent** client (`payAndFetch`) currently reads config from the repo's env for in-repo demos;
> packaging it for npm needs a small config-injection refactor (take wallet + UniSat key as params).
> Tracked for v0.2. Until then, agent integrators vendor `src/sdk/agent.ts` / use the Python SDK.

## 3. PyPI — the Python agent SDK

```bash
cd python
python -m build           # needs: pip install build
twine upload dist/*        # needs: pip install twine + a PyPI token
# consumers: pip install x402-fb   (set the name in python/pyproject or setup before first upload)
```

## 4. Hosting the facilitator (the operator's deploy)

This is the open reference facilitator — self-hostable by anyone, and the basis of the hosted service.

```bash
# set UNISAT_API_KEY, FEE_ADDRESS, JWT_SECRET, POSTGRES_PASSWORD in the environment / .env
docker compose up -d        # postgres + facilitator (+ dashboard)
```

Put it behind HTTPS (the included `deploy/Caddyfile` does auto-HTTPS). The facilitator holds **no private
keys** — only the UniSat key, the fee address, the JWT secret, and the DB. See `deploy/DEPLOY.md`.

## Release checklist

- [ ] `npm run typecheck` clean
- [ ] `npm run build` clean; `npm pack --dry-run` shows only `dist/ README.md LICENSE`
- [ ] version bumped in `package.json` (+ `python/` if releasing it)
- [ ] `git tag vX.Y.Z`
- [ ] no secrets: `git ls-files | grep -i env` shows only `*.example`
