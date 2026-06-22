"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { Header, Copy, KeyReveal, Confirm, Skeleton } from "../../../../components/ui";

const fb = (s: number | string) => (Number(s) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 });

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [svc, setSvc] = useState<any>(null);
  const [payments, setPayments] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const [newKey, setNewKey] = useState("");        // shown once after rotate
  const [dialog, setDialog] = useState<"" | "rotate" | "delete">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    try { const [s, p] = await Promise.all([api.service(id), api.payments(id)]); setSvc(s); setPayments(p); }
    catch (e: any) { setErr(e.message); }
  })(); }, [id]);

  async function rotate() {
    setBusy(true);
    try { const r = await api.regenerateKey(id); setNewKey(r.api_key); setSvc({ ...svc, api_key_prefix: r.api_key_prefix }); setDialog(""); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await api.deleteService(id); router.push("/dashboard"); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const paid = payments?.filter((p) => p.status === "paid") ?? [];
  const earned = paid.reduce((a, p) => a + Number(p.amount), 0);

  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <Header back={{ href: "/dashboard", label: "← Dashboard" }} />
      {err && <div className="err">{err}</div>}

      {!svc ? (
        <div className="card" style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <Skeleton h={26} w={220} /><Skeleton h={16} w={320} /><Skeleton h={16} w={280} />
        </div>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", margin: "24px 0 4px" }}>
            <h2 style={{ margin: 0 }}>{svc.name}</h2>
            <span className="label">created {new Date(svc.created_at).toLocaleDateString()}</span>
          </div>

          {/* overview */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", margin: "16px 0" }}>
            <div className="card"><div className="label">Paid calls</div><div className="stat">{payments ? paid.length : "—"}</div></div>
            <div className="card"><div className="label">Earned to your wallet</div><div className="stat accent">{fb(earned)} <span style={{ fontSize: 13 }}>FB</span></div></div>
            <div className="card"><div className="label">Facilitator fee</div><div className="stat">{(svc.fee_bps / 100).toFixed(1)}<span style={{ fontSize: 14 }}>%</span></div></div>
          </div>

          {/* API key management */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 12 }}>API key</div>
            {newKey ? (
              <KeyReveal value={newKey} note="New key is live; the previous key stopped working. Copy it now — shown once." />
            ) : (
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <code className="mono" style={{ color: "var(--muted)" }}>{svc.api_key_prefix}••••••••••••••••••••</code>
                <div className="row">
                  <button className="btn btn-sm" onClick={() => setDialog("rotate")}>Rotate key</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setDialog("delete")}>Delete service</button>
                </div>
              </div>
            )}
            <dl className="kv" style={{ marginTop: 18 }}>
              <dt>xpub</dt><dd className="mono" style={{ fontSize: 12.5 }}>{svc.xpub}</dd>
              <dt>addresses used</dt><dd>{svc.deriv_index}</dd>
            </dl>
          </div>

          {/* payments */}
          <div className="card">
            <div className="label" style={{ marginBottom: 12 }}>Payments</div>
            {!payments ? (
              <div style={{ display: "grid", gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={20} />)}</div>
            ) : payments.length === 0 ? (
              <div className="empty"><div className="big">no calls yet</div>Payments appear here as agents pay your endpoint.</div>
            ) : (
              <table>
                <thead><tr><th>Status</th><th>Amount (FB)</th><th>Fee</th><th>Resource</th><th>Tx</th><th>When</th></tr></thead>
                <tbody>{payments.map((p) => (
                  <tr key={p.id}>
                    <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                    <td>{fb(p.amount)}</td>
                    <td className="muted">{fb(p.fee_amount)}</td>
                    <td className="muted">{p.resource}</td>
                    <td>{p.txid ? <Copy text={p.txid} label={p.txid.slice(0, 10) + "…"} /> : <span className="muted">—</span>}</td>
                    <td className="muted">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </>
      )}

      {dialog === "rotate" && (
        <Confirm title="Rotate API key?" confirmLabel="Rotate key" busy={busy} onConfirm={rotate} onCancel={() => setDialog("")}
          body="A new key is issued and the current one stops working immediately. Update your server with the new key." />
      )}
      {dialog === "delete" && (
        <Confirm title="Delete this service?" confirmLabel="Delete" danger busy={busy} onConfirm={remove} onCancel={() => setDialog("")}
          body="The service and its key are removed permanently, and its endpoint stops accepting payments. This can't be undone." />
      )}
    </div>
  );
}
