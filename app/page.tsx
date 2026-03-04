/// app/page.tsx
import Link from "next/link";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { bg: "#06080F", text: "#F1F5F9", muted: "#64748B" };
const GT = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent", backgroundClip: "text" as const };

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, position: "relative" }}>
      {/* Aurora background blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.11) 0%,transparent 70%)", animation: "aurora 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-8%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,.09) 0%,transparent 70%)", animation: "aurora 26s ease-in-out infinite reverse" }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.022 }}>
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="#6366F1" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Top nav ── */}
        <nav style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", padding: "0 28px", position: "sticky", top: 0, zIndex: 50, background: "rgba(6,8,15,0.85)", backdropFilter: "blur(24px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 18px rgba(99,102,241,0.4)" }}>⬡</div>
            <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, letterSpacing: "-.02em", ...GT }}>Blue Zone</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/auth/signin"><button className="ghost">Sign in</button></Link>
            <Link href="/app/onboarding/upload"><button className="cta cta-sm">Get Started</button></Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "90px 28px 80px", textAlign: "center" }}>
          <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 16px", borderRadius: 100, background: "rgba(99,102,241,.09)", border: "1px solid rgba(99,102,241,.22)", fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "#A5B4FC", marginBottom: 28, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            ⬡ LONGEVITY INTELLIGENCE SYSTEM
          </div>
          <h1 className="fu1" style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(38px,6vw,72px)", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-.02em" }}>
            <span style={GT}>Your biology,</span><br />
            <span style={{ color: T.text }}>precisely decoded.</span>
          </h1>
          <p className="fu2" style={{ fontSize: "clamp(15px,2vw,18px)", color: T.muted, fontWeight: 300, maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.75, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Upload your bloodwork. Connect your wearables. Receive a continuously evolving
            optimization protocol built exclusively from your data.
          </p>
          <div className="fu3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <Link href="/app/onboarding/upload"><button className="cta">Get My Personal Protocol →</button></Link>
            <Link href="/app/dashboard"><button className="ghost">View Demo Dashboard</button></Link>
          </div>
          <div className="fu4" style={{ display: "flex", justifyContent: "center", gap: 36, flexWrap: "wrap" }}>
            {["Grounded in your data", "Updates every check-in", "Clinically referenced"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                <span style={{ color: "#6366F1", fontWeight: 400 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="fu4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "28px 28px", display: "flex", justifyContent: "center", gap: 60, background: "rgba(13,17,23,0.5)", flexWrap: "wrap" }}>
          {[["2,847", "Protocols active"], ["94%", "Average adherence"], ["−6.2y", "Avg bio age reduction"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 28, ...GT, marginBottom: 4 }}>{v}</div>
              <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* ── How it works ── */}
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,40px)", color: T.text, letterSpacing: "-.02em" }}>From raw data to living protocol</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
            {[
              { n: "01", icon: "📄", title: "Upload your data", desc: "Blood panels, DEXA, VO₂ max, hormone results, or wearable exports." },
              { n: "02", icon: "🧬", title: "AI analysis", desc: "Every biomarker mapped against your unique physiology and behavioral patterns." },
              { n: "03", icon: "◈",  title: "Receive protocol", desc: "Evidence-based recommendations tied directly to detected signals in your data." },
              { n: "04", icon: "🔄", title: "Protocol evolves", desc: "Weekly check-ins, adherence tracking, and new inputs continuously refine your plan." },
            ].map((s) => (
              <div key={s.n} className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "rgba(99,102,241,.5)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", marginBottom: 12 }}>{s.n}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 16, color: T.text, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Wearables ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 28px 80px", textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>CONNECTS WITH</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            {["WHOOP", "Oura Ring", "Apple Health", "Garmin", "CGM", "Lab Upload"].map((w) => (
              <div key={w} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{w}</div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.07),rgba(168,85,247,0.07))", borderTop: "1px solid rgba(99,102,241,0.12)", padding: "72px 28px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(24px,4vw,40px)", color: T.text, marginBottom: 14, letterSpacing: "-.02em" }}>Your protocol is waiting.</h2>
          <p style={{ fontSize: 15, color: T.muted, marginBottom: 32, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Upload a single blood test to get started. No wearable required.</p>
          <Link href="/app/onboarding/upload"><button className="cta">Get My Personal Protocol →</button></Link>
        </div>
      </div>
    </div>
  );
}
