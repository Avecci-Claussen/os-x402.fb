// Drop-in Express middleware for service providers. Talks to the hosted facilitator via a service API
// key — the merchant's server holds NO keys/DB and does no crypto. Wrap any route to charge FB per call.
import axios from "axios";
import type { Request, Response, NextFunction } from "express";

export interface RequirePaymentOpts { facilitatorUrl: string; apiKey: string; price: number; }

export function requirePayment(opts: RequirePaymentOpts) {
  const http = axios.create({ baseURL: opts.facilitatorUrl, headers: { "x-api-key": opts.apiKey }, timeout: 20000 });
  return async (req: Request, res: Response, next: NextFunction) => {
    const nonce = req.header("X-PAYMENT-NONCE");
    const txid = req.header("X-PAYMENT-TXID");
    if (!nonce || !txid) {
      const r = await http.post("/v1/requirements", { resource: req.originalUrl, price: opts.price });
      res.status(402).json({ x402Version: 1, error: "payment required", accepts: [r.data] });
      return;
    }
    let result: any = { ok: false, status: "pending" };
    for (let i = 0; i < 50; i++) {
      result = (await http.post("/v1/verify", { nonce, txid })).data;
      if (result.ok || result.status !== "pending") break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (!result.ok) { res.status(402).json({ error: "payment invalid", status: result.status }); return; }
    res.setHeader("X-PAYMENT-CONFIRMED", txid);
    next();
  };
}
