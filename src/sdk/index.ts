// Public SDK entry — `import { requirePayment } from "os-x402/sdk"`.
//
// Providers: wrap any Express route in `requirePayment({ facilitatorUrl, apiKey, price })` to charge
// FB per call. This is the only runtime dependency a provider needs (just an HTTP client) — no keys,
// no node, no database. The facilitator (hosted or self-run) does the on-chain work.
export { requirePayment } from "./middleware.js";
export type { RequirePaymentOpts } from "./middleware.js";
export { payAndFetch } from "./agent.js";
export type { PayOpts } from "./agent.js";
export type { PaymentRequirements, FacilitatorFee } from "../core/types.js";

