import "./globals.css";
import type { Metadata } from "next";
import { BRAND } from "../lib/brand";

export const metadata: Metadata = { title: `${BRAND.name} — ${BRAND.tagline}`, description: BRAND.blurb };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
