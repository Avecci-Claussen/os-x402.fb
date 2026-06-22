import "dotenv/config";

export const cfg = {
  unisatKey: process.env.UNISAT_API_KEY!,
  unisatBase: process.env.UNISAT_BASE || "https://open-api-fractal.unisat.io",
  payerWif: process.env.PAYER_WIF!,
  payerAddress: process.env.PAYER_ADDRESS!,
  feeAddress: process.env.FEE_ADDRESS!,
  feeRate: Number(process.env.FEE_RATE_SAT_VB || "4"),
  databaseUrl: process.env.DATABASE_URL!,
  facilitatorPort: Number(process.env.FACILITATOR_PORT || "4040"),
  facilitatorUrl: process.env.FACILITATOR_URL || "http://127.0.0.1:4040",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
};

const required: (keyof typeof cfg)[] = ["unisatKey", "feeAddress", "databaseUrl"];
for (const k of required) if (!cfg[k]) throw new Error(`Missing config: ${k} (check .env)`);
