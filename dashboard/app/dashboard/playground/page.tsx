"use client";
import { useState } from "react";
import Link from "next/link";
import { payAndFetch } from "../../../lib/wallet";
import { BRAND } from "../../../lib/brand";

const API = "http://127.0.0.1:4055";
const SAMPLE_ADDR = "bc1qe3m0nc5pytuaktg8tjy4ltwrket3e9h426yu9v";
const SAMPLE_TX = "62d216267bf06ac76872b1302bf5eee82ea79509050c2d0587847119d401691f";

// The Fractal Tools API catalog (mirrors src/examples/demo-server.ts).
const PRESETS: { label: string; price: number; url: string }[] = [
  { label: "Balance",      price: 2_000,  url: `${API}/tools/balance?address=${SAMPLE_ADDR}` },
  { label: "Inscriptions", price: 2_000,  url: `${API}/tools/inscriptions?address=${SAMPLE_ADDR}` },
  { label: "BRC-20",       price: 2_000,  url: `${API}/tools/brc20?address=${SAMPLE_ADDR}` },
  { label: "Runes",        price: 2_000,  url: `${API}/tools/runes?address=${SAMPLE_ADDR}` },
  { label: "Tx detail",    price: 2_000,  url: `${API}/tools/tx?txid=${SAMPLE_TX}` },
  { label: "Chain tip",    price: 1_000,  url: `${API}/tools/chain` },
  { label: "AI summary",   price: 10_000, url: `${API}/ai/summary?address=${SAMPLE_ADDR}` },
];

export default function Playground() {
  const [url, setUrl] = useState(PRESETS[0].url);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setErr(""); setOut(null); setBusy(true);
    try { setOut(await payAndFetch(url)); }
    catch (e: any) {
      const m = e?.message || String(e);
      setErr(/failed to fetch/i.test(m)
        ? "Couldn't reach the endpoint. Make sure the demo Fractal Tools API is running on :4055 and that it sends CORS headers (the bundled demo-server now does)."
        : m);
    } finally { setBusy(false); }
  }

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <nav className="nav"><Link className="brand" href="/dashboard"><span className="dot" />{BRAND.name}</Link>
        <Link className="btn" href="/dashboard">← Dashboard</Link></nav>
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Playground</h2>
        <p className="muted">Pick a tool, or paste any x402 endpoint. Your connected UniSat wallet builds a
          2-output FB payment, you sign in the extension, and the result unlocks — non-custodial.</p>

        <label>Tools</label>
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          {PRESETS.map((p) => {
            const active = url === p.url;
            return (
              <button key={p.label} className="copy" onClick={() => setUrl(p.url)}
                style={active ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}>
                {p.label} · {p.price.toLocaleString()} sat
              </button>
            );
          })}
        </div>

        <label>Endpoint URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={run} disabled={busy}>
          {busy ? "Paying…" : "Pay & call"}
        </button>
        {err && <div className="err">{err}</div>}
        {out && <>
          <label style={{ marginTop: 20 }}>Result {out.txid && <span className="ok">· paid {out.paid} sats (fee {out.fee}) · tx {String(out.txid).slice(0, 12)}…</span>}</label>
          <pre>{JSON.stringify(out.data, null, 2)}</pre>
        </>}
      </div>
    </div>
  );
}
