// os-x402 facilitator — self-hostable multi-tenant REST service (MIT).
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import * as svc from "./service.js";
import { initDb } from "./db.js";
import { cfg } from "../config.js";
import { getFbUsdPrice } from "../core/price.js";

export async function buildFacilitator() {
  await initDb();
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));

  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  app.use(cors(allowed.length ? { origin: allowed } : {}));

  app.use(express.json({ limit: "256kb" }));

  app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }));
  const authLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

  const auth = (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as any).merchantId = svc.verifyToken((req.header("authorization") || "").replace("Bearer ", ""));
      next();
    } catch { res.status(401).json({ error: "unauthorized" }); }
  };
  const mid = (req: Request) => (req as any).merchantId as string;
  const apiKey = (req: Request) => req.header("x-api-key") || "";
  const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
    try { res.json(await fn(req, res)); } catch (e: any) { res.status(400).json({ error: e.message }); }
  };

  app.get("/health", (_q, r) => r.json({ ok: true, service: "os-x402-facilitator", version: "0.3.0" }));

  // FB/USDT spot → ≈ USD display only (settlement stays sats)
  app.get("/v1/price/fb", wrap(async () => getFbUsdPrice()));

  // Machine-readable fb-exact scheme profile for agents
  app.get("/v1/scheme/fb-exact", (_q, r) => r.json({
    x402Version: 1,
    scheme: "fb-exact",
    network: "fractal-mainnet",
    asset: "FB",
    positioning: "The Fractal rail for agent payments — priced in FB, readable in $, settled UTXO-native.",
    endpoints: {
      price: "/v1/price/fb",
      verify: "/v1/verify",
      buildPayment: "/v1/build-payment",
      requirements: "/v1/requirements",
    },
    settlement: {
      model: "2-output UTXO",
      prefer: "X-PAYMENT-RAWTX",
      headers: ["X-PAYMENT-NONCE", "X-PAYMENT-TXID", "X-PAYMENT-RAWTX", "X-PAYMENT-BINDING"],
      custody: "non-custodial",
      verify: "locally verified outs from rawTx",
    },
    pricing: {
      primary: "sats",
      display: "usd_approx via FB/USDT spot (MEXC + CoinEx median)",
      note: "USD is estimate only. Settlement is always FB sats.",
    },
  }));

  // --- Wallet sign-in (UniSat) — rate-limited against brute force ---
  app.post("/v1/auth/challenge", authLimiter, wrap((req) => svc.challenge(req.body.address)));
  app.post("/v1/auth/wallet", authLimiter, wrap((req) => svc.walletLogin(req.body.address, req.body.signature)));
  app.get("/v1/auth/me", auth, wrap((req) => svc.getMerchant(mid(req))));
  app.post("/v1/services", auth, wrap((req) => svc.createService(mid(req), req.body.name, req.body.xpub, req.body.feeBps)));
  app.get("/v1/services", auth, wrap((req) => svc.listServices(mid(req))));
  app.get("/v1/services/:id", auth, wrap((req) => svc.getService(mid(req), req.params.id)));
  app.post("/v1/services/:id/regenerate-key", auth, wrap((req) => svc.regenerateServiceKey(mid(req), req.params.id)));
  app.delete("/v1/services/:id", auth, wrap((req) => svc.deleteService(mid(req), req.params.id)));
  app.get("/v1/services/:id/payments", auth, wrap((req) => svc.servicePayments(mid(req), req.params.id)));
  app.get("/v1/stats", auth, wrap((req) => svc.stats(mid(req))));
  app.get("/v1/stats/30d", auth, wrap((req) => svc.stats30d(mid(req))));
  app.get("/v1/usage", auth, wrap((req) => svc.usage(mid(req))));
  app.get("/v1/ecosystem", wrap(() => svc.ecosystemStats()));

  // --- Merchant-server integration (service API key) ---
  app.post("/v1/requirements", wrap((req) => svc.createRequirement(apiKey(req), req.body.resource, req.body.price)));
  app.post("/v1/verify", wrap((req) => svc.verifyPayment(apiKey(req), req.body.nonce, req.body.txid, {
    payer: req.body.payer,
    rawTx: req.body.rawTx,
    signedPsbt: req.body.signedPsbt,
    resource: req.body.resource,
    binding: req.body.binding,
  })));
  app.post("/v1/build-payment", wrap((req) => svc.buildPayment(req.body.nonce, req.body.payerAddress)));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildFacilitator().then((app) => app.listen(cfg.facilitatorPort, () => console.log(`os-x402 facilitator → ${cfg.facilitatorUrl}`)));
}
