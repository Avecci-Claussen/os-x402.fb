"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "../../../../lib/api";
import { BRAND, FACILITATOR_URL } from "../../../../lib/brand";

export default function NewService() {
  const [name, setName] = useState("");
  const [xpub, setXpub] = useState("");
  const [feePct, setFeePct] = useState(10);
  const [created, setCreated] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { setCreated(await api.createService(name, xpub.trim(), Math.round(feePct * 100))); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  const snippet = created && `import { requirePayment } from "os-x402/sdk";

app.get("/your/endpoint",
  requirePayment({
    facilitatorUrl: "${FACILITATOR_URL}",
    apiKey: "${created.api_key}",
    price: 10_000  // sats of FB per call
  }),
  (req, res) => res.json({ ok: true })
);`;

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <nav className="nav"><Link className="brand" href="/dashboard"><span className="dot" />{BRAND.name}</Link>
        <Link className="btn" href="/dashboard">← Dashboard</Link></nav>

      {!created ? (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>New service</h2>
          <p className="muted">Paste your own Fractal <b>account xpub</b>. {BRAND.name} derives a fresh receive address per
            request — payments go straight to your wallet. We never hold your funds or keys.</p>
          <form onSubmit={submit}>
            <label>Service name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My AI API" required />
            <label>Your FB account xpub</label>
            <input value={xpub} onChange={(e) => setXpub(e.target.value)} placeholder="xpub6…" required />
            <label>Facilitator fee: {feePct}%</label>
            <input type="range" min={0} max={20} step={0.5} value={feePct} onChange={(e) => setFeePct(Number(e.target.value))} />
            {err && <div className="err">{err}</div>}
            <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Creating…" : "Create service"}</button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }} className="ok">✓ Service created</h2>
          <label>Service API key (keep it secret)</label>
          <div className="row"><code style={{ wordBreak: "break-all" }}>{created.api_key}</code>
            <span className="copy" onClick={() => navigator.clipboard.writeText(created.api_key)}>Copy</span></div>
          <label style={{ marginTop: 20 }}>Drop this into your server</label>
          <pre>{snippet}</pre>
          <span className="copy" onClick={() => navigator.clipboard.writeText(snippet!)}>Copy snippet</span>
          <div style={{ marginTop: 22 }}><Link className="btn btn-primary" href="/dashboard">Go to dashboard →</Link></div>
        </div>
      )}
    </div>
  );
}
