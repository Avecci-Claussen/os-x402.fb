"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Header, Skeleton } from "../../components/ui";

const fb = (s: number | string) => (Number(s) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 8 });
// compact: 1234 -> 1.23K, 1_200_000 -> 1.2M (for the big stat band)
const compact = (n: number) => Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(n);

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [s30, setS30] = useState<any>(null);
  const [usage, setUsage] = useState<any[] | null>(null);
  const [services, setServices] = useState<any[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => { (async () => {
    try {
      const [s, d, u, sv] = await Promise.all([api.stats(), api.stats30d(), api.usage(), api.services()]);
      setStats(s); setS30(d); setUsage(u); setServices(sv);
    } catch (e: any) { setErr(e.message); }
  })(); }, []);

  const max = Math.max(1, ...(usage ?? []).map((d) => d.calls));

  return (
    <div className="container">
      <Header />
      {err && <div className="err">{err}</div>}

      {/* Last 30 days — real, computed from settled on-chain payments */}
      <div className="label" style={{ margin: "24px 0 12px" }}>Last 30 days</div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 8 }}>
        {[
          ["Transactions", s30 ? compact(s30.transactions) : null, false],
          ["Volume", s30 ? `${compact(Number(s30.volume))} sat` : null, true],
          ["Unique buyers", s30 ? compact(s30.buyers) : null, false],
          ["Earned (all-time)", stats ? `${fb(stats.earned_to_merchant)} FB` : null, true],
        ].map(([label, val, accent]) => (
          <div className="card" key={label as string}>
            <div className="label">{label as string}</div>
            {val === null ? <Skeleton h={30} w={80} /> : <div className={`stat ${accent ? "accent" : ""}`}>{val as string}</div>}
          </div>
        ))}
      </div>

      {/* usage chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 14 }}>Paid calls — last 14 days</div>
        {usage === null ? <Skeleton h={120} />
          : usage.length === 0 ? <div className="empty"><div className="big">—</div>No paid calls yet. Share an endpoint to start earning.</div>
          : <div className="bars">{usage.map((d) => (
              <div key={d.day} className="bar" title={`${d.day}: ${d.calls} calls`} style={{ height: `${(d.calls / max) * 100}%` }} />
            ))}</div>}
      </div>

      {/* services */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          <strong>Your services</strong>
          <Link className="copy" href="/dashboard/services/new">+ New service</Link>
        </div>
        {services === null ? (
          <div style={{ display: "grid", gap: 8 }}>{[0, 1].map((i) => <Skeleton key={i} h={22} />)}</div>
        ) : services.length === 0 ? (
          <div className="empty">
            <div className="big">no services</div>
            Create a service — paste your xpub, get an API key, and charge FB per call.
            <div style={{ marginTop: 16 }}><Link className="btn btn-sm btn-primary" href="/dashboard/services/new">+ New service</Link></div>
          </div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Fee</th><th>Calls</th><th>API key</th><th /></tr></thead>
            <tbody>{services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="muted">{(s.fee_bps / 100).toFixed(1)}%</td>
                <td className="muted">{s.deriv_index}</td>
                <td><code>{s.api_key_prefix}…</code></td>
                <td style={{ textAlign: "right" }}><Link className="accent" href={`/dashboard/services/${s.id}`}>Manage →</Link></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div style={{ height: 60 }} />
    </div>
  );
}
