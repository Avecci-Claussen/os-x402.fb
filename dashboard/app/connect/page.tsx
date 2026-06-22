"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "../../lib/api";
import { BRAND } from "../../lib/brand";

export default function Connect() {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setErr(""); setBusy(true);
    try {
      const unisat = (window as any).unisat;
      if (!unisat) throw new Error("UniSat wallet not found — install the UniSat extension and switch it to Fractal.");
      const accounts: string[] = await unisat.requestAccounts();
      const address = accounts[0];
      const { message } = await api.challenge(address);
      const signature: string = await unisat.signMessage(message, "bip322-simple"); // works for segwit + taproot
      const { token } = await api.walletLogin(address, signature);
      setToken(token);
      r.push("/dashboard");
    } catch (e: any) { setErr(e.message || String(e)); } finally { setBusy(false); }
  }

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="brand" style={{ justifyContent: "center", padding: "64px 0 8px" }}><span className="dot" />{BRAND.name}</div>
      <div className="card" style={{ textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Connect your wallet</h2>
        <p className="muted">Sign in with your UniSat (Fractal) wallet — no email, no password. Your FB address is your
          account and your payout identity.</p>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={connect} disabled={busy}>
          {busy ? "Waiting for signature…" : "Connect UniSat wallet"}
        </button>
        {err && <div className="err">{err}</div>}
        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>Works with any UniSat address (SegWit or Taproot).</p>
      </div>
    </div>
  );
}
