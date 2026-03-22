/// app/page.tsx
import Link from "next/link";
import { InsightCard } from "@/components/InsightCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { PrimaryCtaButton, SecondaryCtaButton, BottomCtaButton } from "@/components/landing/TrackedCtaButtons";
import { ScrollDepthTracker } from "@/components/ScrollDepthTracker";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { bg: "#06080F", text: "#F1F5F9", muted: "#64748B" };
const GT = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent", backgroundClip: "text" as const };

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, position: "relative" }}>
      {/* Aurora background blobs */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.11) 0%,transparent 70%)", animation: "aurora 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-8%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,.09) 0%,transparent 70%)", animation: "aurora 26s ease-in-out infinite reverse" }} />
        <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.022 }}>
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="#6366F1" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Top nav ── */}
        <nav aria-label="Main" style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", padding: "0 28px", position: "sticky", top: 0, zIndex: 50, background: "rgba(6,8,15,0.85)", backdropFilter: "blur(24px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 18px rgba(99,102,241,0.4)" }}>⬡</div>
            <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, letterSpacing: "-.02em", ...GT }}>Blue Zone</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/auth/signin"><button className="ghost">Sign in</button></Link>
            <Link href="/auth/signin"><button className="cta cta-sm">Get Started</button></Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <div style={{ position: "relative" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "90px 28px 80px", textAlign: "center" }}>
            <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 16px", borderRadius: 100, background: "rgba(99,102,241,.09)", border: "1px solid rgba(99,102,241,.22)", fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "#A5B4FC", marginBottom: 28, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              ⬡ THE MISSING LINK IN YOUR TRAINING DATA
            </div>
            <h1 className="fu1" style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(38px,6vw,72px)", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-.02em" }}>
              <span style={GT}>Now you know</span><br />
              <span className="focus-reveal" style={{ color: T.text }}>why.</span>
            </h1>
            <p className="fu2" style={{ fontSize: "clamp(15px,2vw,18px)", color: T.muted, fontWeight: 300, maxWidth: 680, margin: "0 auto 36px", lineHeight: 1.75, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              Blue Zone is the first platform that connects your blood data to your training load. You&apos;ve done the bloodwork. You wear the device. You&apos;re still not where you should be. That&apos;s the gap we close.
            </p>
            <div className="fu3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
              <PrimaryCtaButton />
              <SecondaryCtaButton />
            </div>
            <p className="fu4" style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, maxWidth: 520, margin: "0 auto 32px", textAlign: "center", lineHeight: 1.65 }}>
              For endurance athletes who train hard, test regularly, and still don&apos;t have answers.
            </p>
            <div className="fu4" style={{ display: "flex", justifyContent: "center", gap: 36, flexWrap: "wrap" }}>
              {["Built for endurance athletes", "Root cause, not just ranges", "Blood data + training load, read together"].map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                  <span style={{ color: "#6366F1", fontWeight: 400 }}>✓</span>{t}
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block" style={{ position: "absolute", right: 32, top: "50%", transform: "translateY(-50%)" }}>
            <InsightCard />
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="fu4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "28px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, background: "rgba(13,17,23,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 60, flexWrap: "wrap" }}>
            {[["6 wearables", "Supported at launch"], ["100+", "Biomarker inputs synthesized"], ["24hrs", "To your first protocol"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 28, ...GT, marginBottom: 4 }}>{v}</div>
                <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sound familiar ── */}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 28px", textAlign: "center" }}>
          <ScrollReveal delay={0}>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>SOUND FAMILIAR?</div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(24px,4vw,40px)", color: T.text, marginBottom: 14, letterSpacing: "-.02em" }}>You have the data. You still don&apos;t have the answer.</h2>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <p style={{ fontSize: 15, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.75 }}>You&apos;ve done the bloodwork. You wear a WHOOP or an Oura. You have a coach and a training plan. And you&apos;re still plateaued, or overtrained, or recovering slower than you should be. Every platform you&apos;ve tried has shown you what is out of range. None of them have told you why your body isn&apos;t adapting — because none of them can see your training load and your biology at the same time. Blue Zone can.</p>
          </ScrollReveal>
        </div>

        {/* ── How it works ── */}
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <ScrollReveal delay={0}>
              <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>WHY BLUE ZONE IS DIFFERENT</div>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,40px)", color: T.text, letterSpacing: "-.02em" }}>The only platform that reads your blood and your training together.</h2>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={160}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
              {[
                { n: "01", icon: "📄", title: "Bring all your data", desc: "Upload your blood panel from any lab — InsideTracker, Function Health, LabCorp, Quest, or a PDF from your doctor. Connect WHOOP, Oura, Garmin, or Apple Health. Add your training log." },
                { n: "02", icon: "🧬", title: "We find the root cause", desc: "Blue Zone is the first platform that reads your biomarkers and your training load together. Not separately. We identify what\u2019s blocking your adaptation — the biological root cause your other tools can\u2019t see because they only have half the picture." },
                { n: "03", icon: "◈",  title: "You get a precise protocol", desc: "Not a dashboard. Not a list of out-of-range markers. A specific, sequenced intervention plan — training modifications, supplementation timing, recovery changes — with a clear explanation of why each step is there and what you should see change first." },
                { n: "04", icon: "🔄", title: "It adapts as you do", desc: "Every check-in and wearable data point updates your protocol. When you retest your blood, Blue Zone compares your new results against the intervention and shows you what moved, why, and what to adjust next." },
              ].map((s) => (
                <div key={s.n} className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "rgba(99,102,241,.5)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", marginBottom: 12 }}>{s.n}</div>
                  <div role="img" aria-hidden="true" style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 16, color: T.text, marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* ── Wearables ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 28px 80px", textAlign: "center" }}>
          <ScrollReveal delay={0}>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>CONNECTS WITH</div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
              {["WHOOP", "Oura Ring", "Apple Health", "Garmin", "TrainingPeaks", "Strava", "CGM", "Lab Upload"].map((w) => (
                <div key={w} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 100, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{w}</div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.07),rgba(168,85,247,0.07))", borderTop: "1px solid rgba(99,102,241,0.12)", padding: "72px 28px", textAlign: "center" }}>
          <ScrollReveal delay={0}>
            <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(24px,4vw,40px)", color: T.text, marginBottom: 14, letterSpacing: "-.02em" }}>Stop guessing. Start knowing why.</h2>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <p style={{ fontSize: 15, color: T.muted, marginBottom: 32, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Upload your blood panel. Connect your wearable. In 24 hours, you&apos;ll know exactly what&apos;s blocking your progress — and exactly what to fix first.</p>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <div>
              <BottomCtaButton />
              <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 20 }}>Accepts results from InsideTracker, Function Health, LabCorp, Quest, and any standard lab PDF.</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <ScrollDepthTracker />
    </div>
  );
}
