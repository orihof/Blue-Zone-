/// app/r/[code]/_client.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT = {
  background: GRAD,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

export function ReferralLandingClient({
  code,
  referrerName,
}: {
  code:         string;
  referrerName: string;
}) {
  // Persist referral code in a 30-day cookie so it survives sign-in redirect
  useEffect(() => {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `bz_ref=${encodeURIComponent(code)}; expires=${expires}; path=/; SameSite=Lax`;
  }, [code]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 80% 50% at 50% -10%,rgba(99,102,241,.18) 0%,transparent 60%), #07090F",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "var(--font-ui,'Inter',sans-serif)",
    }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* BZ mark */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: GRAD,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px",
          boxShadow: "0 0 32px rgba(99,102,241,0.45)",
        }}>
          <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 700, fontSize: 24, color: "#fff", letterSpacing: "-0.05em" }}>BZ</span>
        </div>

        {/* Overline */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 14px", borderRadius: 100,
          background: "rgba(99,102,241,.09)", border: "1px solid rgba(99,102,241,.2)",
          fontSize: 10, fontWeight: 400, letterSpacing: ".1em", color: "#A5B4FC",
          marginBottom: 24, textTransform: "uppercase" as const,
        }}>
          Personal Invitation
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300,
          fontSize: "clamp(26px,5vw,38px)", lineHeight: 1.2,
          letterSpacing: "-.02em", marginBottom: 16,
        }}>
          <span style={{ color: "#F1F5F9" }}>{referrerName} invites you to{" "}</span>
          <span style={GT}>Blue Zone</span>
        </h1>

        <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.65, marginBottom: 36, fontWeight: 300 }}>
          AI-powered longevity protocols built around your bloodwork, wearable data,
          and personal health goals — the same stack top athletes and longevity-focused
          professionals use.
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 36 }}>
          {["🧬 Biomarker Analysis", "🏆 Competition Prep", "😴 Sleep Optimization", "⚡ Performance Stack"].map((f) => (
            <span key={f} style={{
              padding: "6px 14px", borderRadius: 100, fontSize: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              color: "#94A3B8", fontWeight: 300,
            }}>{f}</span>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/auth/signin"
          style={{
            display: "block", width: "100%",
            padding: "16px 0", borderRadius: 14,
            background: GRAD, color: "#fff", textDecoration: "none",
            fontSize: 15, fontWeight: 500, textAlign: "center",
            boxShadow: "0 0 32px rgba(99,102,241,0.35)",
          }}
        >
          Start your free protocol →
        </Link>

        <p style={{ fontSize: 11, color: "#334155", marginTop: 16, fontWeight: 300 }}>
          No credit card required · Your data stays private
        </p>
      </div>
    </div>
  );
}
