"use client";
import { useState } from "react";
import Link from "next/link";
import { logout } from "../lib/api";
import { LangSwitcher } from "../lib/i18n";
import { ThemeToggle } from "../lib/theme";
import { Wordmark } from "./Logo";

// Consistent top bar across authed pages.
export function Header({ back }: { back?: { href: string; label: string } }) {
  return (
    <nav className="nav">
      <Link className="brand" href="/dashboard"><Wordmark /></Link>
      <div className="row">
        {back ? (
          <><LangSwitcher /><ThemeToggle /><Link className="btn btn-sm" href={back.href}>{back.label}</Link></>
        ) : (
          <>
            <Link className="btn btn-sm" href="/dashboard/playground">Playground</Link>
            <Link className="btn btn-sm btn-primary" href="/dashboard/services/new">+ New service</Link>
            <LangSwitcher /><ThemeToggle />
            <button className="btn btn-sm" onClick={logout}>Log out</button>
          </>
        )}
      </div>
    </nav>
  );
}

// One-click copy with feedback.
export function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="copy" onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400); }}>
      {done ? "✓ Copied" : label}
    </span>
  );
}

// A secret shown exactly once, with copy + warning.
export function KeyReveal({ value, note }: { value: string; note?: string }) {
  return (
    <>
      <div className="keybox"><code>{value}</code><Copy text={value} /></div>
      <div className="warn"><span>⚠</span><span>{note || "Copy this now — it's shown once and never again. Store it like a password."}</span></div>
    </>
  );
}

// Confirm dialog for destructive actions.
export function Confirm({ title, body, confirmLabel, danger, busy, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="muted" style={{ margin: "0 0 18px", fontSize: 14 }}>{body}</p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export const Skeleton = ({ h = 16, w = "100%" }: { h?: number; w?: number | string }) =>
  <div className="sk" style={{ height: h, width: w }} />;
