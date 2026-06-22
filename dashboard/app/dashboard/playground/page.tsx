"use client";
import { useState } from "react";
import Link from "next/link";
import { payAndFetch } from "../../../lib/wallet";
import { BRAND } from "../../../lib/brand";

export default function Playground() {
  const [url, setUrl] = useState("http://127.0.0.1:4055/tools/balance?address=bc1qe3m0nc5pytuaktg8tjy4ltwrket3e9h426yu9v");
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setErr(""); setOut(null); setBusy(true);
    try { setOut(await payAndFetch(url)); }
    catch (e: any) { setErr(e.message || String(e)); } finally { setBusy(false); }
  }
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <nav className="nav"><Link className="brand" href="/dashboard"><span className="dot" />{BRAND.name}</Link>
        <Link className="btn" href="/dashboard">← Dashboard</Link></nav>
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Playground</h2>
        <p className="muted">Call any os-x402 endpoint and pay for it with your connected UniSat wallet
          (it builds a 2-output FB payment, you sign in the extension, and the result unlocks).</p>
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
