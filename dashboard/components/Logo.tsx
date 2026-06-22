// The x402.fb mark — a faceted diamond (nods to Fractal's tiling) in the signal-orange accent,
// with an inner gem and a soft glow. Used in every header, the connect page, and the favicon.
export function Logo({ size = 26, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"
      style={glow ? { filter: "drop-shadow(0 0 6px rgba(255,122,60,.5))" } : undefined}>
      <defs>
        <linearGradient id="lg" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb27a" /><stop offset=".5" stopColor="#ff7a3c" /><stop offset="1" stopColor="#ee5a1c" />
        </linearGradient>
      </defs>
      {/* outer faceted diamond */}
      <path d="M16 2 L30 16 L16 30 L2 16 Z" stroke="url(#lg)" strokeWidth="2" strokeLinejoin="round" />
      {/* facet lines */}
      <path d="M2 16 H30 M16 2 V30" stroke="url(#lg)" strokeWidth="1" opacity=".35" />
      {/* inner gem */}
      <path d="M16 9 L23 16 L16 23 L9 16 Z" fill="url(#lg)" />
    </svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 600, letterSpacing: "-.01em", fontFamily: "var(--font-mono)", fontSize: 17 }}>
      <Logo size={size} />
      <span>x402<span style={{ color: "var(--accent)" }}>.fb</span></span>
    </span>
  );
}
