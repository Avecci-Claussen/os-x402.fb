# x402 scheme profile — fb-exact on Fractal Bitcoin

Machine-readable contract for agents and facilitators integrating **x402.fb**.

```json
{
  "x402Version": 1,
  "scheme": "fb-exact",
  "network": "fractal-mainnet",
  "asset": "FB",
  "facilitator": {
    "base": "https://x402.fractal.api.thelonelybit.org",
    "price": "/v1/price/fb",
    "tools": "/v1/tools.json",
    "discover": "/v1/discover",
    "verify": "/v1/verify",
    "buildPayment": "/v1/build-payment"
  },
  "settlement": {
    "model": "2-output UTXO",
    "outputs": ["payTo (xpub-derived)", "fee → FEE_ADDRESS"],
    "prefer": "X-PAYMENT-RAWTX",
    "headers": ["X-PAYMENT-NONCE", "X-PAYMENT-TXID", "X-PAYMENT-RAWTX", "X-PAYMENT-BINDING"],
    "custody": "non-custodial",
    "verify": "locally verified outs from rawTx (UniSat getTxOuts fallback only)"
  },
  "pricing": {
    "primary": "sats",
    "display": "usd_approx via FB/USDT spot (MEXC + CoinEx median)",
    "note": "USD is estimate only. Settlement is always FB sats."
  }
}
```

Fetch live: `GET {facilitator}/v1/tools.json` (includes `pricing` + `settle` when oracle is up).
