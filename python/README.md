# os-x402 — Python agent SDK

Pay for HTTP `402` endpoints in **Fractal Bitcoin (FB)**, natively from Python. For AI/agent developers:
call any os-x402-gated endpoint and it auto-pays per call (one on-chain 2-output FB tx).

```bash
pip install -r requirements.txt          # requests, bitcoin-utils, python-dotenv
```

```python
import os
from x402_fractal import pay_and_fetch

# needs env: UNISAT_API_KEY, PAYER_WIF, PAYER_ADDRESS  (FEE_RATE_SAT_VB optional)
out = pay_and_fetch("https://api.example.com/ai/chat?q=hello")
print(out["data"], out["txid"])
```

What it does on a 402: fetches your cardinal UTXOs (UniSat), builds a tx paying the provider + the
facilitator fee (+ change) **— cardinal UTXOs only, never inscriptions —** signs (P2WPKH), broadcasts via
UniSat, then retries the request with the payment proof. Proven end-to-end on Fractal mainnet.

`python example.py [url]` runs it against a demo (defaults to the local dev-stack tools endpoint).
