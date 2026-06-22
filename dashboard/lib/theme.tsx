"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const t = ((typeof localStorage !== "undefined" && localStorage.getItem("x402fb_theme")) ||
      document.documentElement.dataset.theme || "dark") as Theme;
    setTheme(t); document.documentElement.dataset.theme = t;
  }, []);
  const toggle = () => setTheme((p) => {
    const n = p === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem("x402fb_theme", n); } catch {}
    return n;
  });
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="btn btn-sm" onClick={toggle} aria-label="Toggle dark / light theme" style={{ padding: "8px 11px" }}>
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
