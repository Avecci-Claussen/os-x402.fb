// os-x402 facilitator — the hosted, multi-tenant REST service.
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import * as svc from "./service.js";
import { initDb } from "./db.js";
import { cfg } from "../config.js";

export async function buildFacilitator() {
  await initDb();
  const app = express();
  app.use(cors()); // allow the dashboard (and any provider site) to call the API from the browser
  app.use(express.json());

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

  app.get("/health", (_q, r) => r.json({ ok: true, service: "os-x402-facilitator", version: "0.2.0" }));

  // --- Wallet sign-in (UniSat) ---
  app.post("/v1/auth/challenge", wrap((req) => svc.challenge(req.body.address)));
  app.post("/v1/auth/wallet", wrap((req) => svc.walletLogin(req.body.address, req.body.signature)));
  app.post("/v1/services", auth, wrap((req) => svc.createService(mid(req), req.body.name, req.body.xpub, req.body.feeBps)));
  app.get("/v1/services", auth, wrap((req) => svc.listServices(mid(req))));
  app.get("/v1/services/:id/payments", auth, wrap((req) => svc.servicePayments(mid(req), req.params.id)));
  app.get("/v1/stats", auth, wrap((req) => svc.stats(mid(req))));
  app.get("/v1/usage", auth, wrap((req) => svc.usage(mid(req))));

  // --- Merchant-server integration (service API key) ---
  app.post("/v1/requirements", wrap((req) => svc.createRequirement(apiKey(req), req.body.resource, req.body.price)));
  app.post("/v1/verify", wrap((req) => svc.verifyPayment(apiKey(req), req.body.nonce, req.body.txid)));
  // browser wallet: build an unsigned PSBT to sign with UniSat (keeps the UniSat key server-side)
  app.post("/v1/build-payment", wrap((req) => svc.buildPayment(req.body.nonce, req.body.payerAddress)));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildFacilitator().then((app) => app.listen(cfg.facilitatorPort, () => console.log(`os-x402 facilitator → ${cfg.facilitatorUrl}`)));
}
