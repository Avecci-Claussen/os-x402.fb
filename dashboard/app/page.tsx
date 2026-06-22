import Link from "next/link";
import { BRAND } from "../lib/brand";

export default function Landing() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="brand"><span className="dot" />{BRAND.name}</div>
        <div className="row">
          <Link className="btn" href="/connect">Log in</Link>
          <Link className="btn btn-primary" href="/connect">Get started</Link>
        </div>
      </nav>

      <section className="hero" style={{ padding: "72px 0 40px" }}>
        <span className="pill">x402 · Fractal Bitcoin</span>
        <h1>Charge <span className="amber">FB per API call</span>.<br />Non-custodial. Agent-native.</h1>
        <p className="lead">{BRAND.blurb}</p>
        <div className="row" style={{ marginTop: 28 }}>
          <Link className="btn btn-primary" href="/connect">Create an account →</Link>
          <a className="btn" href="#how">How it works</a>
        </div>
      </section>

      <section id="how" className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", margin: "24px 0 48px" }}>
        {[
          ["1 · Plug in", "Add one middleware to any API route and set a price in FB. Your server holds only an API key — no keys, no node, no DB."],
          ["2 · Get paid", "Callers (or AI agents) hit your endpoint, get a 402, and pay in one on-chain FB transaction straight to your wallet."],
          ["3 · Earn", "Every paid call settles to your own xpub. We verify it on-chain and take a tiny per-call fee — never custody."],
        ].map(([t, d]) => (
          <div className="card" key={t}><div className="amber" style={{ fontWeight: 800, marginBottom: 8 }}>{t}</div><div className="muted">{d}</div></div>
        ))}
      </section>

      <section className="grid" style={{ gridTemplateColumns: "1.1fr 1fr", marginBottom: 56, alignItems: "center" }}>
        <div className="card">
          <div className="label">Provider integration</div>
          <pre style={{ marginTop: 12 }}>{`import { requirePayment } from "os-x402/sdk";

app.get("/ai/chat",
  requirePayment({
    facilitatorUrl: "${BRAND.name.toLowerCase()}.pay",
    apiKey: process.env.SVC_KEY,
    price: 10_000  // sats (FB)
  }),
  (req, res) => res.json({ answer: runModel(req.query.q) })
);`}</pre>
        </div>
        <div>
          <h2 style={{ letterSpacing: "-.02em" }}>Built for the machine economy</h2>
          <p className="muted">AI agents need to pay for things autonomously. {BRAND.name} turns any endpoint into a metered,
            pay-per-call service settled in Fractal Bitcoin — no accounts, no credit cards, no custody. One tx pays the
            provider and the network fee together.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" href="/connect">Start earning in FB</Link>
          </div>
        </div>
      </section>

      <footer className="muted" style={{ borderTop: "1px solid var(--line)", padding: "24px 0 60px", fontSize: 13 }}>
        {BRAND.name} — open-source, non-custodial · by <a className="amber" href={BRAND.byUrl}>{BRAND.by}</a> ·{" "}
        <a className="amber" href={BRAND.x}>X</a> · <a className="amber" href={BRAND.telegram}>Telegram</a>
      </footer>
    </div>
  );
}
