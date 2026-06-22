import Link from "next/link";
import { BRAND } from "../lib/brand";

// The signature element: the actual 402 handshake. Status codes carry their real semantic color
// (402 = orange, the status the product is named after; 200 = green). Lines reveal in protocol order.
function Handshake() {
  const lines: { html: string; d: number }[] = [
    { html: `<span class="com"># agent calls a paid endpoint</span>`, d: 0 },
    { html: `<span class="req">GET /v1/inference</span> <span class="com">HTTP/1.1</span>`, d: 0.07 },
    { html: `<span class="s402">← 402 Payment Required</span>`, d: 0.22 },
    { html: `  <span class="k">payTo</span>  <span class="v">bc1q…7z08a0dj</span>`, d: 0.3 },
    { html: `  <span class="k">amount</span> <span class="v">10000 sat · FB</span>`, d: 0.37 },
    { html: `<span class="com"># agent pays — one on-chain FB tx, no human</span>`, d: 0.48 },
    { html: `<span class="req">GET /v1/inference</span>  <span class="k">X-Payment-Txid:</span> <span class="v">62d2…691f</span>`, d: 0.56 },
    { html: `<span class="s200">← 200 OK</span>  <span class="com"># verified on-chain, served</span>`, d: 0.72 },
  ];
  return (
    <div className="wire" role="img" aria-label="An agent requests a paid endpoint, receives HTTP 402 with a Fractal Bitcoin payment requirement, pays one on-chain transaction, retries, and receives 200 OK.">
      <div className="wire-bar"><i /><i /><i /><span>402 handshake</span></div>
      <div className="wire-body">
        {lines.map((l, i) => (
          <div className="wire-line" key={i} style={{ animationDelay: `${l.d}s` }} dangerouslySetInnerHTML={{ __html: l.html }} />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="brand"><span className="dot" />{BRAND.name}</div>
        <div className="row">
          <a className="navlink" href="#how">How it works</a>
          <a className="navlink" href={BRAND.github}>GitHub ↗</a>
          <Link className="btn btn-primary" href="/connect">Get an API key</Link>
        </div>
      </nav>

      <section className="hero">
        <span className="pill"><b>402</b> Payment Required · Fractal Bitcoin</span>
        <h1>The payment rail for autonomous agents.</h1>
        <p className="lead">{BRAND.blurb}</p>
        <div className="meta">
          <b>open source (MIT)</b> · <b>non-custodial</b> · <b>no accounts</b> · settles on-chain in <b>FB</b>
        </div>
        <div className="row" style={{ marginTop: 26 }}>
          <Link className="btn btn-primary" href="/connect">Get an API key →</Link>
          <a className="btn btn-ghost" href={BRAND.github}>$ npm i os-x402</a>
        </div>
      </section>

      <section style={{ margin: "10px 0 56px" }}>
        <Handshake />
      </section>

      <section id="how" style={{ marginBottom: 56 }}>
        <div className="label" style={{ marginBottom: 14 }}>The flow — one ordered exchange</div>
        <div className="steps">
          {[
            ["01", "Request", "An agent or app calls a paid endpoint. No key, no signup, no card."],
            ["02", "402", "The server answers with a price and a fresh FB address derived from the provider's xpub."],
            ["03", "Pay", "The caller broadcasts one FB transaction — provider + network fee in a single tx, wallet to wallet."],
            ["04", "200", "We verify it on-chain and the endpoint serves. Funds never touch us — non-custodial by design."],
          ].map(([n, h, p]) => (
            <div className="step" key={n}>
              <div className="n">{n}</div>
              <h4>{h}</h4>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 56 }}>
        <div className="label" style={{ marginBottom: 14 }}>Two sides, one transaction</div>
        <div className="split">
          <div className="side">
            <div className="tag">// providers</div>
            <h3>Sell any endpoint, earn in FB</h3>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>Wrap a route in one line and set a price. Your server
              holds only an API key — no node, no keys, no database.</p>
            <ul>
              <li>Data, compute, an LLM call, a download — anything HTTP returns</li>
              <li>Paid straight to your own xpub, per call</li>
              <li>Price in sats today; fiat-denominated pricing on the roadmap</li>
            </ul>
          </div>
          <div className="side">
            <div className="tag">// agents</div>
            <h3>Let software pay for itself</h3>
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>An agent that hits a 402 pays it and retries —
              no human, no checkout. TypeScript and Python SDKs.</p>
            <ul>
              <li>payAndFetch(url) handles the 402 → pay → retry loop</li>
              <li>~30s settlement, near-zero fees on Fractal</li>
              <li>Discover paid capabilities across the network (marketplace, soon)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 56, alignItems: "stretch" }}>
        <div className="card">
          <div className="label">Provider · charge per call</div>
          <pre style={{ marginTop: 12, marginBottom: 0 }} dangerouslySetInnerHTML={{ __html:
`<span class="kw">import</span> { requirePayment } <span class="kw">from</span> <span class="str">"os-x402/sdk"</span>;

app.get(<span class="str">"/v1/inference"</span>,
  requirePayment({
    facilitatorUrl: <span class="str">"https://x402.fb"</span>,
    apiKey: process.env.SVC_KEY,
    price: <span class="kw">10_000</span>  <span class="com">// sat (FB)</span>
  }),
  (req, res) => res.json({ out: model(req) })
);` }} />
        </div>
        <div className="card">
          <div className="label">Agent · pay automatically</div>
          <pre style={{ marginTop: 12, marginBottom: 0 }} dangerouslySetInnerHTML={{ __html:
`<span class="kw">import</span> { payAndFetch } <span class="kw">from</span> <span class="str">"os-x402/sdk"</span>;

<span class="com">// hits the 402, pays a real FB tx, retries</span>
<span class="kw">const</span> r = <span class="kw">await</span> payAndFetch(
  <span class="str">"https://api.example.com/v1/inference"</span>,
  { wallet }
);

console.log(r.data, r.txid);` }} />
        </div>
      </section>

      <section className="card" style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 6px", fontWeight: 600, letterSpacing: "-.02em" }}>Open protocol. Run it yourself.</h3>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>The spec and SDKs are MIT. Self-host the facilitator, or use ours and skip the infrastructure.</p>
        </div>
        <div className="row">
          <a className="btn" href={BRAND.github}>Read the spec</a>
          <Link className="btn btn-primary" href="/connect">Get an API key →</Link>
        </div>
      </section>

      <footer className="foot">
        <span>{BRAND.name} · open-source, non-custodial · <a className="accent" href={BRAND.byUrl}>{BRAND.by}</a></span>
        <span><a href={BRAND.github}>GitHub</a> · <a href={BRAND.x}>X</a> · <a href={BRAND.telegram}>Telegram</a></span>
      </footer>
    </div>
  );
}
