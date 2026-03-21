/// app/how-it-works/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { HowItWorksCtaButton } from "@/components/landing/TrackedCtaButtons";

export const metadata: Metadata = {
  title: "How Blue Zone works",
  description:
    "Blue Zone reads your blood panel and your wearable data together to find the biological root cause of your training plateau — and builds a protocol to fix it.",
};

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };
const GT = {
  background: GRAD,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const STEPS = [
  {
    n: "01",
    icon: "\u{1F4C4}",
    title: "Bring all your data",
    desc: "Upload your blood panel from any lab \u2014 InsideTracker, Function Health, LabCorp, Quest, or a PDF from your doctor. Connect your wearable: WHOOP, Oura, Garmin, or Apple Health. Add your training log if you have one. Blue Zone accepts all of it and normalises it into a single biological picture.",
  },
  {
    n: "02",
    icon: "\u{1F9EC}",
    title: "We find the root cause",
    desc: "Blue Zone is the only platform that reads your biomarkers and your training load together \u2014 not in separate dashboards, but in a single analysis. We look at how your blood values interact with your recent training stress, recovery patterns, and wearable trends to identify the biological factor that is limiting your adaptation. Not what is out of range. What is causing the problem.",
  },
  {
    n: "03",
    icon: "\u25C8",
    title: "You get a precise protocol",
    desc: "The output is not a list of recommendations. It is a sequenced intervention plan \u2014 specific supplementation with doses and timing, training modifications for the next 2\u20134 weeks, recovery changes, and a clear explanation of the causal chain connecting your biology to your performance. Every instruction has a reason.",
  },
  {
    n: "04",
    icon: "\u{1F504}",
    title: "It adapts as you do",
    desc: "Every check-in and new wearable data point updates your protocol. When you retest your blood, Blue Zone compares the new results against your intervention and shows you what moved, what did not, and what to adjust. The protocol is never finished \u2014 it learns alongside your biology.",
  },
];

export default function HowItWorksPage() {
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
            <div style={{ width: 32, height: 32, borderRadius: 9, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 18px rgba(99,102,241,0.4)" }}>⬡</div>
            <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, letterSpacing: "-.02em", ...GT }}>Blue Zone</span>
          </Link>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/auth/signin"><button className="ghost">Sign in</button></Link>
            <Link href="/auth/signin"><button className="cta cta-sm">Get Started</button></Link>
          </div>
        </nav>

        {/* ── Header ── */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 28px 0", textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
            HOW IT WORKS
          </div>
          <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(32px,5vw,56px)", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-.02em", color: T.text }}>
            From data to protocol in four steps.
          </h1>
          <p style={{ fontSize: "clamp(14px,1.8vw,16px)", color: T.muted, fontWeight: 300, maxWidth: 560, margin: "0 auto 60px", lineHeight: 1.75, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Most platforms show you what is out of range. Blue Zone shows you why — and what to do about it. Here is exactly how.
          </p>
        </div>

        {/* ── Step cards ── */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 28px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "rgba(99,102,241,.5)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", marginBottom: 12 }}>{s.n}</div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 16, color: T.text, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.07),rgba(168,85,247,0.07))", borderTop: "1px solid rgba(99,102,241,0.12)", padding: "72px 28px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(24px,4vw,40px)", color: T.text, marginBottom: 14, letterSpacing: "-.02em" }}>
            Ready to find your root cause?
          </h2>
          <p style={{ fontSize: 15, color: T.muted, marginBottom: 32, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
            Upload your blood panel and connect your wearable. Your first protocol is ready in minutes.
          </p>
          <HowItWorksCtaButton />
        </div>
      </div>
    </div>
  );
}
