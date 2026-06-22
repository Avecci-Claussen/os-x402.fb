"use client";
import Link from "next/link";
import { BRAND } from "../lib/brand";
import { useT, LangSwitcher } from "../lib/i18n";
import { ThemeToggle } from "../lib/theme";
import { Wordmark } from "../components/Logo";
import { Reveal } from "../components/Reveal";

function Handshake() {
  const lines: { html: string; d: number }[] = [
    { html: `<span class="com"># agent calls a paid endpoint</span>`, d: 0 },
    { html: `<span class="req">GET /v1/inference</span> <span class="com">HTTP/1.1</span>`, d: 0.07 },
    { html: `<span class="s402">← 402 Payment Required</span>`, d: 0.22 },
    { html: `  <span class="k">payTo</span>  <span class="v">bc1q…7z08a0dj</span>`, d: 0.3 },
    { html: `  <span class="k">amount</span> <span class="v">10000 sat · FB</span>`, d: 0.37 },
    { html: `<span class="com"># pays — one on-chain FB tx, no human</span>`, d: 0.48 },
    { html: `<span class="req">GET /v1/inference</span> <span class="k">+txid</span>`, d: 0.56 },
    { html: `<span class="s200">← 200 OK</span> <span class="com"># verified, served</span>`, d: 0.72 },
  ];
  return (
    <div className="wire" role="img" aria-label="Agent requests a paid endpoint, gets HTTP 402 with a Fractal Bitcoin payment requirement, pays one transaction, retries, gets 200 OK.">
      <div className="wire-bar"><i /><i /><i /><span>402 handshake</span></div>
      <div className="wire-body">
        {lines.map((l, i) => <div className="wire-line" key={i} style={{ animationDelay: `${l.d}s` }} dangerouslySetInnerHTML={{ __html: l.html }} />)}
      </div>
    </div>
  );
}

export default function Landing() {
  const { t } = useT();
  return (
    <div className="container wide">
      <nav className="nav">
        <div className="brand"><Wordmark /></div>
        <div className="row">
          <a className="navlink" href="#how">{t("nav.how")}</a>
          <a className="navlink" href={BRAND.github}>GitHub ↗</a>
          <LangSwitcher />
          <ThemeToggle />
          <Link className="btn btn-sm btn-primary" href="/connect">{t("nav.getKey")}</Link>
        </div>
      </nav>

      {/* two-column hero — fills the width */}
      <section className="hero">
        <Reveal dir="left">
          <div className="hero-copy">
            <span className="eyebrow"><span className="b">402</span> {t("hero.badgeTail")}</span>
            <h1>{t("hero.title1")} <span className="grad">{t("hero.title2")}</span></h1>
            <p className="lead">{t("hero.lead")}</p>
            <div className="meta"><b>{t("hero.m1")}</b> · <b>{t("hero.m2")}</b> · <b>{t("hero.m3")}</b> · {t("hero.m4")}</div>
            <div className="row" style={{ marginTop: 30 }}>
              <Link className="btn btn-primary" href="/connect">{t("nav.getKey")} →</Link>
              <a className="btn btn-ghost" href={BRAND.github}>$ npm i os-x402</a>
            </div>
          </div>
        </Reveal>
        <Reveal dir="right" delay={130}><Handshake /></Reveal>
      </section>

      {/* the flow */}
      <section id="how" style={{ marginBottom: 64 }}>
        <div className="label" style={{ marginBottom: 16 }}>{t("flow.title")}</div>
        <Reveal>
          <div className="steps">
            {[1, 2, 3, 4].map((n) => (
              <div className="step" key={n}>
                <div className="n">0{n}</div><h4>{t(`flow.s${n}t`)}</h4><p>{t(`flow.s${n}d`)}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* bento: two sides + code */}
      <section style={{ marginBottom: 64 }}>
        <div className="label" style={{ marginBottom: 16 }}>{t("two.title")}</div>
        <div className="bento">
          <Reveal className="b-5" dir="left">
            <div className="tile">
              <div className="tag">// {t("prov.tag")}</div>
              <h3>{t("prov.title")}</h3>
              <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>{t("prov.lead")}</p>
              <ul>{[1, 2, 3].map((i) => <li key={i}>{t(`prov.li${i}`)}</li>)}</ul>
            </div>
          </Reveal>
          <Reveal className="b-7" dir="right" delay={80}>
            <div className="tile" style={{ padding: 0 }}>
              <div className="label" style={{ padding: "20px 24px 0" }}>{t("code.prov")}</div>
              <pre style={{ margin: "12px 0 0", border: "none", borderRadius: 0, background: "transparent" }} dangerouslySetInnerHTML={{ __html:
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
          </Reveal>
          <Reveal className="b-7" dir="left" delay={80}>
            <div className="tile" style={{ padding: 0 }}>
              <div className="label" style={{ padding: "20px 24px 0" }}>{t("code.agt")}</div>
              <pre style={{ margin: "12px 0 0", border: "none", borderRadius: 0, background: "transparent" }} dangerouslySetInnerHTML={{ __html:
`<span class="kw">import</span> { payAndFetch } <span class="kw">from</span> <span class="str">"os-x402/sdk"</span>;

<span class="com">// hits 402, pays a real FB tx, retries</span>
<span class="kw">const</span> r = <span class="kw">await</span> payAndFetch(
  <span class="str">"https://api.example.com/v1/inference"</span>,
  { wallet }
);
console.log(r.data, r.txid);` }} />
            </div>
          </Reveal>
          <Reveal className="b-5" dir="right">
            <div className="tile">
              <div className="tag">// {t("agt.tag")}</div>
              <h3>{t("agt.title")}</h3>
              <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>{t("agt.lead")}</p>
              <ul>{[1, 2, 3].map((i) => <li key={i}>{t(`agt.li${i}`)}</li>)}</ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* open protocol band */}
      <Reveal>
        <section className="card" style={{ marginBottom: 56, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: "0 0 7px", fontSize: 22 }}>{t("open.title")}</h3>
            <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{t("open.lead")}</p>
          </div>
          <div className="row">
            <a className="btn" href={BRAND.github}>{t("open.spec")}</a>
            <Link className="btn btn-primary" href="/connect">{t("nav.getKey")} →</Link>
          </div>
        </section>
      </Reveal>

      <footer className="foot">
        <span>x402.fb · {t("foot.tag")} · <a className="accent" href={BRAND.byUrl}>{BRAND.by}</a></span>
        <span><a href={BRAND.github}>GitHub</a> · <a href={BRAND.x}>X</a> · <a href={BRAND.telegram}>Telegram</a></span>
      </footer>
    </div>
  );
}
