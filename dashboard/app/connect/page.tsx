"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken } from "../../lib/api";
import { useT, LangSwitcher } from "../../lib/i18n";
import { ThemeToggle } from "../../lib/theme";
import { Wordmark } from "../../components/Logo";

export default function Connect() {
  const r = useRouter();
  const { t } = useT();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setErr(""); setBusy(true);
    try {
      const unisat = (window as any).unisat;
      if (!unisat) throw new Error("UniSat wallet not found — install the extension and switch it to Fractal.");
      const accounts: string[] = await unisat.requestAccounts();
      const address = accounts[0];
      const { message } = await api.challenge(address);
      const signature: string = await unisat.signMessage(message, "bip322-simple");
      const { token } = await api.walletLogin(address, signature);
      setToken(token);
      r.push("/dashboard");
    } catch (e: any) { setErr(e.message || String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="container">
      <nav className="nav">
        <Link className="brand" href="/"><Wordmark /></Link>
        <div className="row">
          <Link className="navlink" href="/">{t("c.home")}</Link>
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </nav>

      <div className="grid" style={{ gridTemplateColumns: "1.05fr .95fr", gap: 28, alignItems: "center", padding: "56px 0", maxWidth: 980, margin: "0 auto" }}>
        {/* left: the action */}
        <div className="card">
          <span className="pill" style={{ marginBottom: 16 }}>🔑 {t("hero.m2")}</span>
          <h1 style={{ fontSize: "2.1rem", margin: "6px 0 12px", letterSpacing: "-.02em" }}>{t("c.title")}</h1>
          <p className="muted" style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.6 }}>{t("c.lead")}</p>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }} onClick={connect} disabled={busy}>
            {busy ? t("c.busy") : t("c.cta")}
          </button>
          {err && <div className="err">{err}</div>}
          <div className="warn" style={{ marginTop: 18 }}><span>🛡</span><span>{t("c.secure")}</span></div>
          <p className="muted" style={{ marginTop: 16, fontSize: 12.5 }}>
            {t("c.works")} &nbsp;·&nbsp; {t("c.noWallet")} <a className="accent" href="https://unisat.io/download" target="_blank" rel="noreferrer">{t("c.get")}</a>
          </p>
        </div>

        {/* right: how sign-in works */}
        <div>
          <div className="label" style={{ marginBottom: 16 }}>{t("nav.how")}</div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="row" style={{ alignItems: "flex-start", gap: 14, marginBottom: 18, flexWrap: "nowrap" }}>
              <span className="mono" style={{ color: "var(--accent)", border: "1px solid var(--line2)", borderRadius: 8,
                width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13 }}>{n}</span>
              <span className="muted" style={{ fontSize: 14.5, lineHeight: 1.5 }}>{t(`c.s${n}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
