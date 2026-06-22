import os, sys, json
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from x402_fractal import pay_and_fetch

url = sys.argv[1] if len(sys.argv) > 1 else f"http://127.0.0.1:4055/tools/balance?address={os.environ['PAYER_ADDRESS']}"
print(f"Agent calling: {url}")
print(json.dumps(pay_and_fetch(url), indent=2))
