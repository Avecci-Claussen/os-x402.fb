"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Scroll-triggered entrance: slides in from a direction + fades + de-blurs ("materializes").
// Respects prefers-reduced-motion. Use `className` to pass grid-span classes (e.g. b-5) so it can
// sit directly as a grid child.
export function Reveal({ children, dir = "up", delay = 0, className = "" }:
  { children: ReactNode; dir?: "up" | "left" | "right"; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal r-${dir} ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
