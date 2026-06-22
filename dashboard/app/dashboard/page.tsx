"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, logout } from "../../lib/api";
import { BRAND } from "../../lib/brand";

const fb = (s: number | string) => (Number(s) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 });

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, u, sv] = await Promise.all([api.stats(), api.usage(), api.services()]);
        setStats(s); setUsage(u); setServices(sv);
      } catch (e: any) { setErr(e.message); }
    })();
  }, []);

  const max = Math.max(1, ...usage.map((d) => d.calls));
  return (
    <div className="container">
      <nav className="nav">
        <Link className="brand" href="/dashboard"><span className="dot" />{BRAND.name}</Link>
        <div className="row">
          <Link className="btn" href="/dashboard/playground">Playground</Link>
          <Link className="btn btn-primary" href="/dashboard/services/new">+ New service</Link>
          <button className="btn" onClick={logout}>Log out</button>
        </div>
      </nav>

      {err && <div className="err">{err}</div>}

      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", margin: "24px 0" }}>
        <div className="card"><div className="label">Paid calls</div><div className="stat">{stats?.paid_calls ?? "—"}</div></div>
        <div className="card"><div className="label">Earned to your wallet</div><div className="stat amber">{stats ? fb(stats.earned_to_merchant) : "—"} <span style={{ fontSize: 14 }}>FB</span></div></div>
        <div className="card"><div className="label">Network fees paid</div><div className="stat">{stats ? fb(stats.facilitator_fees) : "—"} <span style={{ fontSize: 14 }}>FB</span></div></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 14 }}>Paid calls — last 14 days</div>
        {usage.length === 0 ? <div className="muted">No paid calls yet.</div> : (
          <div className="bars">{usage.map((d) => (
            <div key={d.day} className="bar" title={`${d.day}: ${d.calls} calls`} style={{ height: `${(d.calls / max) * 100}%` }} />
          ))}</div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <strong>Your services</strong>
          <Link className="copy" href="/dashboard/services/new">+ Add</Link>
        </div>
        {services.length === 0 ? <div className="muted">No services yet — create one to start charging FB.</div> : (
          <table><thead><tr><th>Name</th><th>Fee</th><th>Calls issued</th><th>API key</th><th /></tr></thead>
            <tbody>{services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{(s.fee_bps / 100).toFixed(1)}%</td>
                <td>{s.deriv_index}</td>
                <td><code>{s.api_key_prefix}…</code></td>
                <td><Link className="amber" href={`/dashboard/services/${s.id}`}>View →</Link></td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
      <div style={{ height: 60 }} />
    </div>
  );
}
