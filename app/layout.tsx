import type { Metadata } from "next";
import { Syne, Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

// Display / Headline — Syne 300: editorial, weightless, luxury-magazine aesthetic
// Rule: No bold headlines. Size and spacing carry the premium — not weight.
// Syne's lightest available weight is 400 — still delivers the editorial lightness
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-serif",
  display: "swap",
});

// Editorial large numbers — italic serif for biological age display
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-editorial",
  display: "swap",
});

// Body / UI — Inter: weight 300 body text, weight 400 labels and UI copy
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-ui",
  display: "swap",
});

// Mono / Data — JetBrains Mono 400: biomarker values, scores, percentages
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blue Zone — Longevity Intelligence",
  description:
    "Turn your bloodwork and wearable data into a continuously evolving optimization protocol. Precision longevity for serious performers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <body
        className={`${syne.variable} ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
        style={{ background: "var(--void)", color: "var(--stellar)" }}
      >
        {/* Living background — fixed aurora gradients, imperceptibly breathe */}
        <div
          aria-hidden="true"
          className="aurora-bg-layer"
          style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
        />
        {/* Content layer sits above background */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
