import type { Metadata } from "next";
import { Syne, Inter, Instrument_Serif, JetBrains_Mono, DM_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import StructuredData from "@/components/StructuredData";
import PostHogProvider from "@/components/PostHogProvider";
import { checkEnv } from "@/lib/env-check";

// Validate required env vars at server startup — throws immediately if any are missing.
checkEnv();

// Display / Headline — Syne 300: editorial, weightless, luxury-magazine aesthetic
// Rule: No bold headlines. Size and spacing carry the premium — not weight.
// Syne's lightest available weight is 400 — still delivers the editorial lightness
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-syne",
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
  variable: "--font-inter",
  display: "swap",
});

// Mono / Data — JetBrains Mono 400: biomarker values, scores, percentages
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// Mono / Labels — DM Mono: uppercase system labels, status indicators
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Blue Zone — Know Your Biological Age | AI Longevity Platform",
  description:
    "Blue Zone decodes your biology with an 8-domain AI analysis covering cardiovascular, metabolic, neurological, hormonal, inflammatory, immune, circadian, and musculoskeletal health. Built with 18 world-class longevity scientists.",
  keywords: [
    "biological age",
    "VO2max",
    "HRV",
    "longevity",
    "biohacking",
    "endurance athlete health",
    "biological age test",
    "performance optimization",
    "functional health markers",
    "AI health analysis",
  ],
  authors: [{ name: "Blue Zone" }],
  creator: "Blue Zone",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bluezone.health",
    siteName: "Blue Zone",
    title: "What\u2019s dragging your VO\u2082max? — Blue Zone",
    description:
      "Your complete biological readout. Every system. Every morning. Built with 18 world-class longevity scientists.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Blue Zone — Biological Age Score",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "What\u2019s dragging your VO\u2082max? — Blue Zone",
    description:
      "Your complete biological readout. Every system. Every morning.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: { canonical: "https://bluezone.health" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${dmMono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#050A1F" />
        <link rel="manifest" href="/manifest.json" />
        <StructuredData />
      </head>
      <body
        className="antialiased"
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
          <Providers>
            <PostHogProvider>{children}</PostHogProvider>
          </Providers>
        </div>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
