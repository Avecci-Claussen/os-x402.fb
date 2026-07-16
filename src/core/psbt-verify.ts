// Dependency-free PSBT output verifier. Lets a payer confirm — BEFORE signing/broadcasting — that a payment
// transaction actually pays the addresses + amounts from the 402 requirements, so a malicious or buggy
// facilitator cannot misdirect funds even if the payer signs "blindly". No bitcoinjs/secp needed, so the
// identical file can run in a browser bundle (mirrored to dashboard/lib/psbtcheck.ts).

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function hrpExpand(hrp: string): number[] {
  const r: number[] = [];
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) >> 5);
  r.push(0);
  for (let i = 0; i < hrp.length; i++) r.push(hrp.charCodeAt(i) & 31);
  return r;
}
function bech32Encode(hrp: string, data: number[], spec: "bech32" | "bech32m"): string {
  const constv = spec === "bech32" ? 1 : 0x2bc830a3;
  const mod = polymod(hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0])) ^ constv;
  const chk: number[] = [];
  for (let i = 0; i < 6; i++) chk.push((mod >> (5 * (5 - i))) & 31);
  let ret = hrp + "1";
  for (const d of data.concat(chk)) ret += CHARSET[d];
  return ret;
}
function convertbits(data: Uint8Array, from: number, to: number, pad: boolean): number[] | null {
  let acc = 0, bits = 0; const ret: number[] = []; const maxv = (1 << to) - 1;
  for (const b of data) {
    if (b < 0 || b >> from) return null;
    acc = (acc << from) | b; bits += from;
    while (bits >= to) { bits -= to; ret.push((acc >> bits) & maxv); }
  }
  if (pad) { if (bits) ret.push((acc << (to - bits)) & maxv); }
  else if (bits >= from || ((acc << (to - bits)) & maxv)) return null;
  return ret;
}
function segwitAddress(hrp: string, witver: number, program: Uint8Array): string {
  const data = [witver].concat(convertbits(program, 8, 5, true)!);
  return bech32Encode(hrp, data, witver === 0 ? "bech32" : "bech32m");
}

function scriptToAddress(s: Uint8Array, hrp: string): string | null {
  if (s.length === 22 && s[0] === 0x00 && s[1] === 0x14) return segwitAddress(hrp, 0, s.slice(2)); // P2WPKH
  if (s.length === 34 && s[0] === 0x00 && s[1] === 0x20) return segwitAddress(hrp, 0, s.slice(2)); // P2WSH
  if (s.length === 34 && s[0] === 0x51 && s[1] === 0x20) return segwitAddress(hrp, 1, s.slice(2)); // P2TR
  return null; // legacy (base58) not handled — fb-exact payouts are segwit
}

function hexToBytes(h: string): Uint8Array {
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
}
function readVarInt(b: Uint8Array, p: { i: number }): number {
  const n = b[p.i++];
  if (n < 0xfd) return n;
  if (n === 0xfd) { const v = b[p.i] | (b[p.i + 1] << 8); p.i += 2; return v; }
  if (n === 0xfe) { const v = (b[p.i] | (b[p.i + 1] << 8) | (b[p.i + 2] << 16) | (b[p.i + 3] << 24)) >>> 0; p.i += 4; return v; }
  let v = 0; for (let k = 0; k < 8; k++) v += b[p.i + k] * Math.pow(2, 8 * k); p.i += 8; return v;
}
function le(b: Uint8Array, off: number, len: number): number {
  let v = 0; for (let k = 0; k < len; k++) v += b[off + k] * Math.pow(2, 8 * k); return v;
}

// Pull the unsigned transaction out of a PSBT (global key 0x00).
function extractUnsignedTx(psbt: Uint8Array): Uint8Array {
  if (!(psbt[0] === 0x70 && psbt[1] === 0x73 && psbt[2] === 0x62 && psbt[3] === 0x74 && psbt[4] === 0xff)) throw new Error("not a PSBT");
  const p = { i: 5 };
  while (p.i < psbt.length) {
    const klen = readVarInt(psbt, p);
    if (klen === 0) break;
    const keytype = psbt[p.i];
    p.i += klen;
    const vlen = readVarInt(psbt, p);
    const val = psbt.slice(p.i, p.i + vlen);
    p.i += vlen;
    if (keytype === 0x00) return val;
  }
  throw new Error("no unsigned tx in PSBT");
}

export interface PsbtOut { value: number; address: string | null; }
export function psbtOutputs(psbtHex: string, hrp = "bc"): PsbtOut[] {
  const tx = extractUnsignedTx(hexToBytes(psbtHex));
  return txOutputs(tx, hrp);
}

/** Parse a raw (signed) transaction hex into outputs. */
export function rawTxOutputs(txHex: string, hrp = "bc"): PsbtOut[] {
  return txOutputs(hexToBytes(txHex.replace(/^0x/i, "")), hrp);
}

function txOutputs(tx: Uint8Array, hrp: string): PsbtOut[] {
  const p = { i: 0 };
  // version
  p.i += 4;
  // segwit marker/flag
  let hasWitness = false;
  if (tx[p.i] === 0x00 && tx[p.i + 1] === 0x01) { hasWitness = true; p.i += 2; }
  const nin = readVarInt(tx, p);
  for (let k = 0; k < nin; k++) { p.i += 36; const sl = readVarInt(tx, p); p.i += sl + 4; }
  const nout = readVarInt(tx, p);
  const outs: PsbtOut[] = [];
  for (let k = 0; k < nout; k++) {
    const value = le(tx, p.i, 8); p.i += 8;
    const sl = readVarInt(tx, p); const script = tx.slice(p.i, p.i + sl); p.i += sl;
    outs.push({ value, address: scriptToAddress(script, hrp) });
  }
  // witness + locktime ignored for output checks
  void hasWitness;
  return outs;
}

export interface Requirements402 { payTo: string; amount: number; facilitatorFee: { payTo: string; amount: number }; }
// Throws unless the PSBT pays the provider AND the facilitator fee exactly as the 402 stated.
export function assertPsbtPaysRequirements(psbtHex: string, reqr: Requirements402, hrp = "bc"): true {
  return assertOutsPayRequirements(psbtOutputs(psbtHex, hrp), reqr);
}

export function assertRawTxPaysRequirements(txHex: string, reqr: Requirements402, hrp = "bc"): true {
  return assertOutsPayRequirements(rawTxOutputs(txHex, hrp), reqr);
}

function assertOutsPayRequirements(outs: PsbtOut[], reqr: Requirements402): true {
  if (!outs.some((o) => o.address === reqr.payTo && o.value >= reqr.amount))
    throw new Error(`payment does not pay provider ${reqr.payTo} the required ${reqr.amount} sat`);
  if (!outs.some((o) => o.address === reqr.facilitatorFee.payTo && o.value >= reqr.facilitatorFee.amount))
    throw new Error(`payment does not pay the ${reqr.facilitatorFee.amount} sat facilitator fee to ${reqr.facilitatorFee.payTo}`);
  return true;
}
