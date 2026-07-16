import "dotenv/config";

export const cfg = {
  unisatKey: process.env.UNISAT_API_KEY!,
  unisatBase: process.env.UNISAT_BASE || "https://open-api-fractal.unisat.io",
  payerWif: process.env.PAYER_WIF!,
  payerAddress: process.env.PAYER_ADDRESS!,
  feeAddress: process.env.FEE_ADDRESS!,
  feeRate: Number(process.env.FEE_RATE_SAT_VB || "4"),
  feeRateDynamic: !["0", "off", "false"].includes((process.env.FEE_RATE_DYNAMIC || "on").toLowerCase()),
  feeRateTier: (() => {
    const t = (process.env.FEE_RATE_TIER || "fastest").toLowerCase();
    const map: Record<string, string> = { fastest: "fastest", halfhour: "halfHour", hour: "hour", economy: "economy", minimum: "minimum" };
    return (map[t] || "fastest") as "fastest" | "halfHour" | "hour" | "economy" | "minimum";
  })(),
  databaseUrl: process.env.DATABASE_URL!,
  facilitatorPort: Number(process.env.FACILITATOR_PORT || "4040"),
  facilitatorUrl: process.env.FACILITATOR_URL || "http://127.0.0.1:4040",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  // Settlement: 0-conf for small calls; high-value waits for confirmations (UniSat depth).
  confirmationsDefault: Math.max(0, Number(process.env.CONFIRMATIONS_DEFAULT || "0")),
  confirmationsHigh: Math.max(0, Number(process.env.CONFIRMATIONS_HIGH || "1")),
  highValueSats: Math.max(0, Number(process.env.HIGH_VALUE_SATS || "5000")),
};

const required: (keyof typeof cfg)[] = ["unisatKey", "feeAddress", "databaseUrl"];
for (const k of required) if (!cfg[k]) throw new Error(`Missing config: ${k} (check .env)`);

// production safety: never run with a default/weak signing secret.
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || cfg.jwtSecret === "dev-only-change-me" || cfg.jwtSecret.length < 24)
    throw new Error("JWT_SECRET must be set to a strong random value (>=24 chars) in production");
}
