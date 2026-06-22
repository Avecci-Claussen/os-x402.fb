"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
import { BRAND } from "../../../../lib/brand";

const fb = (s: number | string) => (Number(s) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 });

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [payments, setPayments] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => { (async () => { try { setPayments(await api.payments(id)); } catch (e: any) { setErr(e.message); } })(); }, [id]);

  return (
    <div className="container">
      <nav className="nav"><Link className="brand" href="/dashboard"><span className="dot" />{BRAND.name}</Link>
        <Link className="btn" href="/dashboard">← Dashboard</Link></nav>
      <h2>Payments</h2>
      {err && <div className="err">{err}</div>}
      <div className="card">
        {payments.length === 0 ? <div className="muted">No payments yet.</div> : (
          <table><thead><tr><th>Status</th><th>Amount (FB)</th><th>Fee</th><th>Resource</th><th>Txid</th><th>When</th></tr></thead>
            <tbody>{payments.map((p) => (
              <tr key={p.id}>
                <td className={p.status === "paid" ? "ok" : "muted"}>{p.status}</td>
                <td>{fb(p.amount)}</td>
                <td className="muted">{fb(p.fee_amount)}</td>
                <td className="muted">{p.resource}</td>
                <td><code>{p.txid ? p.txid.slice(0, 10) + "…" : "—"}</code></td>
                <td className="muted">{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
    </div>
  );
}
