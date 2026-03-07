/// app/goodbye/page.tsx
// Public route — no auth required (user is already signed out)

import Link from "next/link";

export default function GoodbyePage() {
  const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";

  return (
    <div style={{ minHeight: "100vh", background: "#06080F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>

      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,.07) 0%,transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* BZ Logo */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
          <span style={{ color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>BZ</span>
        </div>
      </div>

      {/* Headline */}
      <h1 style={{ fontSize: "clamp(24px,4vw,34px)", fontWeight: 300, color: "#F1F5F9", fontFamily: "var(--font-serif,'Syne',sans-serif)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 14, maxWidth: 380 }}>
        We're sad to see you go.
      </h1>

      {/* Confirmation copy */}
      <p style={{ fontSize: 15, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.6, marginBottom: 8, maxWidth: 340 }}>
        Your account has been permanently deleted.
      </p>
      <p style={{ fontSize: 13, color: "#334155", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65, marginBottom: 44, maxWidth: 340 }}>
        All your data — protocols, biomarkers, and health history — has been removed from our systems.
      </p>

      {/* Divider */}
      <div style={{ width: 40, height: 1, background: "rgba(255,255,255,.08)", marginBottom: 36 }} />

      {/* Soft re-engagement */}
      <p style={{ fontSize: 13, color: "#334155", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 20 }}>
        If you ever want to come back, we'll be here.
      </p>

      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748B", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "11px 22px", textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .2s" }}
      >
        Return to Blue Zone
      </Link>
    </div>
  );
}
