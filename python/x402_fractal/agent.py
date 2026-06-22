"""os-x402 Python agent SDK — pay for HTTP 402 endpoints in FB, natively from Python.

Designed for AI/agent developers: call any os-x402-gated endpoint and it auto-pays per call.
"""
import os
import requests
from bitcoinutils.setup import setup
from bitcoinutils.keys import PrivateKey, P2wpkhAddress
from bitcoinutils.script import Script
from bitcoinutils.transactions import Transaction, TxInput, TxOutput, TxWitnessInput

setup("mainnet")  # Fractal mainnet uses Bitcoin mainnet address/key encoding
DUST = 330


def _unisat():
    base = os.environ.get("UNISAT_BASE", "https://open-api-fractal.unisat.io")
    return base, {"Authorization": f"Bearer {os.environ['UNISAT_API_KEY']}"}


def _cardinal_utxos(address):
    base, hdr = _unisat()
    r = requests.get(f"{base}/v1/indexer/address/{address}/utxo-data",
                     params={"cursor": 0, "size": 100}, headers=hdr, timeout=20).json()
    # cardinal only — never spend inscription/asset UTXOs
    return [u for u in r.get("data", {}).get("utxo", [])
            if u.get("inscriptionsCount", 0) == 0 and not u.get("inscriptions")]


def _broadcast(txhex):
    base, hdr = _unisat()
    r = requests.post(f"{base}/v1/indexer/local_pushtx", json={"txHex": txhex}, headers=hdr, timeout=20).json()
    if r.get("code") != 0:
        raise RuntimeError(f"broadcast failed: {r.get('msg')}")
    return r["data"]


def build_and_broadcast(reqr, wif, payer_address, fee_rate=4):
    """Build, sign and broadcast ONE FB tx with two outputs: merchant + facilitator fee (+ change)."""
    priv = PrivateKey(wif)
    pub = priv.get_public_key()
    utxos = _cardinal_utxos(payer_address)
    if not utxos:
        raise RuntimeError("no cardinal (non-inscription) UTXOs to spend")

    need = reqr["amount"] + reqr["facilitatorFee"]["amount"]
    used, in_sum = [], 0
    for u in utxos:
        used.append(u); in_sum += u["satoshi"]
        vsize = len(used) * 68 + 3 * 31 + 11
        if in_sum >= need + vsize * fee_rate + DUST:
            break
    vsize = len(used) * 68 + 3 * 31 + 11
    net_fee = vsize * fee_rate
    change = in_sum - need - net_fee
    if change < 0:
        raise RuntimeError(f"insufficient funds: have {in_sum}, need {need + net_fee}")

    inputs = [TxInput(u["txid"], u["vout"]) for u in used]
    outputs = [
        TxOutput(reqr["amount"], P2wpkhAddress.from_address(reqr["payTo"]).to_script_pub_key()),
        TxOutput(reqr["facilitatorFee"]["amount"], P2wpkhAddress.from_address(reqr["facilitatorFee"]["payTo"]).to_script_pub_key()),
    ]
    if change >= DUST:
        outputs.append(TxOutput(change, P2wpkhAddress.from_address(payer_address).to_script_pub_key()))

    tx = Transaction(inputs, outputs, has_segwit=True)
    script_code = Script(["OP_DUP", "OP_HASH160", pub.to_hash160(), "OP_EQUALVERIFY", "OP_CHECKSIG"])
    for i, u in enumerate(used):
        sig = priv.sign_segwit_input(tx, i, script_code, u["satoshi"])
        tx.witnesses.append(TxWitnessInput([sig, pub.to_hex()]))
    return _broadcast(tx.serialize())


def pay_and_fetch(url, wif=None, payer_address=None, fee_rate=None):
    """GET a resource; if it returns 402, pay the FB requirement and retry. Returns the unlocked body."""
    wif = wif or os.environ["PAYER_WIF"]
    payer_address = payer_address or os.environ["PAYER_ADDRESS"]
    fee_rate = fee_rate or int(os.environ.get("FEE_RATE_SAT_VB", "4"))
    r = requests.get(url, timeout=20)
    if r.status_code != 402:
        return {"data": r.json(), "paid": 0}
    reqr = r.json()["accepts"][0]
    txid = build_and_broadcast(reqr, wif, payer_address, fee_rate)
    r2 = requests.get(url, headers={"X-PAYMENT-NONCE": reqr["nonce"], "X-PAYMENT-TXID": txid}, timeout=200)
    return {"data": r2.json(), "txid": txid, "paid": reqr["amount"], "fee": reqr["facilitatorFee"]["amount"]}
