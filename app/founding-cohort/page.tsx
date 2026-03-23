/// app/founding-cohort/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Join the Blue Zone founding cohort",
  description:
    "Blue Zone is opening to 50 competitive endurance athletes in April 2026. Apply for founding cohort access.",
};

const T = { text: "#F1F5F9", muted: "#64748B" };

export default function FoundingCohortPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#06080F", position: "relative" }}>
      {/* Aurora background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.11) 0%,transparent 70%)", animation: "aurora 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-8%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,.09) 0%,transparent 70%)", animation: "aurora 26s ease-in-out infinite reverse" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Top nav ── */}
        <nav style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", padding: "0 28px", position: "sticky", top: 0, zIndex: 50, background: "rgba(6,8,15,0.85)", backdropFilter: "blur(24px)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <img src="/Blue-zone-white-full.svg" alt="Blue Zone" style={{ height: 28, width: "auto" }} />
          </Link>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/auth/signin"><button className="ghost">Sign in</button></Link>
            <Link href="/auth/signin"><button className="cta cta-sm">Get Started</button></Link>
          </div>
        </nav>

        {/* ── Content ── */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 28px 100px", textAlign: "center" }}>
          {/* Eyebrow */}
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
            FOUNDING COHORT — APRIL 2026
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(38px,6vw,72px)", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-.02em", color: T.text }}>
            50 athletes. Real data. No guessing.
          </h1>

          {/* Subheadline */}
          <p style={{ fontSize: "clamp(15px,2vw,18px)", color: T.muted, fontWeight: 300, maxWidth: 600, margin: "0 auto 48px", lineHeight: 1.75, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Blue Zone is opening to its first cohort of competitive endurance athletes in April 2026. Founding members get full platform access, direct input into the product roadmap, and a protocol built from their actual biology — not population averages.
          </p>

          {/* This cohort is for you if */}
          <div style={{ textAlign: "left", maxWidth: 480, margin: "0 auto 40px" }}>
            <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 14, textTransform: "uppercase" }}>
              THIS COHORT IS FOR YOU IF:
            </div>
            {[
              "You race Ironman, marathons, or gran fondos and train more than 8 hours per week",
              "You have blood panel results from the last 12 months — or you\u2019re willing to get them",
              "You wear a WHOOP, Oura, Garmin, or Apple Watch",
            ].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginBottom: 10 }}>
                <span style={{ color: "#6366F1", fontWeight: 400, flexShrink: 0 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          {/* Founding member benefits */}
          <div style={{ textAlign: "left", maxWidth: 480, margin: "0 auto 48px" }}>
            <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 14, textTransform: "uppercase" }}>
              FOUNDING MEMBER BENEFITS
            </div>
            {[
              "Full platform access from day one — no feature restrictions",
              "Direct access to the founder for protocol questions during the first 90 days",
              "Founding member pricing locked for life",
            ].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginBottom: 10 }}>
                <span style={{ color: "#6366F1", fontWeight: 400, flexShrink: 0 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          {/* Email form */}
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
