/// app/page.tsx
import Link from "next/link";
import { InsightCard } from "@/components/InsightCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { PrimaryCtaButton, SecondaryCtaButton, BottomCtaButton } from "@/components/landing/TrackedCtaButtons";
import { CausalChainCards } from "@/components/CausalChainCards";
import { ConnectsWithPills } from "@/components/landing/ConnectsWithPills";
import { ScrollDepthTracker } from "@/components/ScrollDepthTracker";
import { TrustStrip } from "@/components/landing/TrustStrip";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { bg: "#06080F", text: "#F1F5F9", muted: "#64748B" };
const GT = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent", backgroundClip: "text" as const };

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, position: "relative" }}>
      {/* Aurora background blobs */}
      <div aria-hidden="true" className="aurora-pulse" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.11) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-8%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,.09) 0%,transparent 70%)" }} />
        <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.022 }}>
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="#6366F1" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Top nav ── */}
        <nav aria-label="Main" style={{ height: 60, borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", padding: "0 28px", position: "sticky", top: 0, zIndex: 50, background: "rgba(6,8,15,0.85)", backdropFilter: "blur(24px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img src="/Blue-zone-white-full.svg" alt="Blue Zone" style={{ height: 28, width: "auto" }} />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/auth/signin"><button className="ghost">Sign in</button></Link>
            <Link href="/auth/signin"><button className="cta cta-sm">Get Started</button></Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "90px 28px 48px" }} className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
          {/* Left column — copy */}
          <div className="flex-1 text-center lg:text-left" style={{ maxWidth: 620 }}>
            <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 16px", borderRadius: 100, background: "rgba(99,102,241,.09)", border: "1px solid rgba(99,102,241,.22)", fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "#A5B4FC", marginBottom: 28, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              ⬡ THE MISSING LINK IN YOUR TRAINING DATA
            </div>
            <h1 className="fu1 font-normal lg:font-light" style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(38px,6vw,72px)", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-.02em", ...GT }}>
              <span>You have the data.</span><br />
              <span>You still don&apos;t</span><br />
              <span>have the answer.</span>
            </h1>
            <p className="fu2" style={{ fontSize: "clamp(15px,2vw,18px)", color: T.muted, fontWeight: 300, maxWidth: 620, margin: "0 auto", marginTop: 4, marginBottom: 0, lineHeight: 1.75, fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "block" }}>
              Blood panels show what&apos;s out of range. Wearables show strain. Neither explains why your body isn&apos;t adapting. Blue Zone reads both together — and tells you exactly what to fix.{" "}<span className="text-[--ion-blue] font-semibold">In minutes.</span>
            </p>
            {/* FOR EXAMPLE label */}
            <p className="fu2" style={{ fontSize: 11, color: "rgba(95,105,155,1)", marginTop: 16, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              For example
            </p>
            {/* Causal chain — vertical on mobile, horizontal pill on desktop */}
            <div className="fu2">
              {/* Mobile vertical stack */}
              <div className="flex flex-col items-center gap-1 sm:hidden" style={{ fontSize: 14, fontWeight: 500, textAlign: "center" }}>
                <span style={{ color: "rgb(100,155,230)" }}>Low ferritin</span>
                <span style={{ color: "rgba(68,76,112,1)", fontSize: 13, lineHeight: 1 }}>↓</span>
                <span style={{ color: "rgba(140,148,190,1)" }}>suppressed HRV</span>
                <span style={{ color: "rgba(68,76,112,1)", fontSize: 13, lineHeight: 1 }}>↓</span>
                <span style={{ color: "rgb(210,105,60)" }}>stalled training</span>
              </div>
              {/* Desktop horizontal pill */}
              <div className="hidden sm:inline-flex" style={{ alignItems: "center", gap: 0, padding: "10px 20px", background: "rgba(14,16,30,0.9)", border: "1px solid rgba(65,115,205,0.45)", borderRadius: 10, fontSize: 14, fontWeight: 500, letterSpacing: "0.01em", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                <span style={{ color: "rgb(100,155,230)" }}>Low ferritin</span>
                <span style={{ color: "rgba(68,76,112,1)", margin: "0 10px", fontWeight: 400 }}>→</span>
                <span style={{ color: "rgba(140,148,190,1)", fontWeight: 600 }}>suppressed HRV</span>
                <span style={{ color: "rgba(68,76,112,1)", margin: "0 10px", fontWeight: 400 }}>→</span>
                <span style={{ color: "rgb(210,105,60)" }}>stalled training</span>
              </div>
            </div>
            {/* Mobile-only product card */}
            <div className="flex sm:hidden flex-col gap-2 rounded-xl border border-white/10 bg-[#111118] p-4 text-left w-full max-w-sm mx-auto fu2" style={{ marginTop: 16, marginBottom: 8 }}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[--stellar]">Ferritin</span>
                <span className="text-orange-400 font-mono">62 ng/mL ↓ Low</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[--stellar]">Training load</span>
                <span className="text-white font-mono">↑ High this week</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <p className="text-[10px] uppercase tracking-widest label-pulse" style={{ color: "var(--ion-blue)" }}>Root Cause</p>
              <p className="text-sm text-white font-medium leading-snug">Iron depletion under oxidative training stress</p>
              <div className="mt-1">
                <span className="text-[10px] uppercase tracking-widest bg-[--ion-blue]/20 text-[--ion-blue] px-2 py-1 rounded-full">Protocol generated</span>
              </div>
            </div>
            <div className="fu3 flex gap-3 flex-wrap mt-4 mb-14 justify-center lg:justify-start">
              <PrimaryCtaButton />
              <SecondaryCtaButton />
            </div>
            <div className="hidden lg:flex items-center mt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, maxWidth: 560 }}>
              {["Built for endurance athletes", "Root cause, not just ranges", "Blood data + training load"].map((t, i) => (
                <div key={t} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && (
                    <span style={{ color: "rgba(255,255,255,0.12)", margin: "0 14px", fontSize: 11 }}>|</span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, whiteSpace: "nowrap" }}>
                    <span style={{ color: "#6366F1", fontSize: 10 }}>✓</span>
                    {t}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right column — InsightCard */}
          <div className="hidden lg:flex lg:items-center lg:justify-center" style={{ width: 380, flexShrink: 0, position: "sticky", top: 80, alignSelf: "flex-start" }}>
            <InsightCard />
          </div>
        </div>

        {/* ── Sound familiar ── */}
        <div style={{ background: "rgba(14,16,28,0.75)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="py-8 md:py-14" style={{ maxWidth: 680, margin: "0 auto", paddingLeft: 28, paddingRight: 28, textAlign: "center" }}>
          <ScrollReveal delay={0}>
            <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: ".12em", color: "rgba(255,255,255,0.4)", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>SOUND FAMILIAR?</div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(24px,4vw,40px)", color: T.text, marginBottom: 14, letterSpacing: "-.02em" }}>You have the data. You still don&apos;t have the answer.</h2>
          </ScrollReveal>
          <ScrollReveal delay={160}>
            <div style={{ borderLeft: "2px solid rgba(96,165,250,0.25)", paddingLeft: 20, textAlign: "left", maxWidth: 620, margin: "0 auto" }}>
              <p className="text-left" style={{ fontSize: "clamp(13px,2vw,15px)", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.75, margin: 0 }}>You&apos;ve done the bloodwork. You wear a WHOOP or an Oura. You have a coach and a training plan. And you&apos;re still plateaued, or overtrained, or recovering slower than you should be. Every platform you&apos;ve tried has shown you what is out of range. None of them have told you why your body isn&apos;t adapting — because none of them can see your training load and your biology at the same time. Blue Zone can.</p>
            </div>
          </ScrollReveal>
        </div>
        </div>

        {/* ── Trust strip ── */}
        <TrustStrip />

        {/* ── Stats strip ── */}
        <div className="fu4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "36px 28px", background: "rgba(6,8,15,0.95)" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 40px", width: "100%" }} className="sm:flex sm:justify-center sm:gap-16">
              <div style={{ textAlign: "center", gridColumn: "1 / -1" }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(36px,5vw,56px)", color: T.text, marginBottom: 4 }}>Minutes</div>
                <div style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>From upload to your first protocol.</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,36px)", color: T.text, marginBottom: 4 }}>100+</div>
                <div style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Biomarkers synthesized</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,36px)", color: T.text, marginBottom: 4 }}>Free</div>
                <div style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>No credit card required</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── How it works ── */}
        <div style={{ background: "rgba(14,16,28,0.75)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div id="how-it-works" style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <ScrollReveal delay={0}>
              <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: ".12em", color: "rgba(255,255,255,0.4)", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>WHY BLUE ZONE IS DIFFERENT</div>
            </ScrollReveal>
            <ScrollReveal delay={80}>
              <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,40px)", color: T.text, letterSpacing: "-.02em" }}>The only platform that reads your blood and your training together.</h2>
            </ScrollReveal>
          </div>
          <CausalChainCards />
        </div>
        </div>

        {/* ── Wearables ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 28px 80px", textAlign: "center" }}>
          <ScrollReveal delay={0}>
            <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: ".12em", color: "rgba(255,255,255,0.4)", marginBottom: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>CONNECTS WITH</div>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <ConnectsWithPills />
          </ScrollReveal>
        </div>

        {/* ── Bottom CTA ── */}
        <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.07),rgba(168,85,247,0.07))", borderTop: "1px solid rgba(99,102,241,0.12)", padding: "96px 28px 100px", textAlign: "center", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }}>
          <ScrollReveal delay={0}>
            <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(24px,4vw,40px)", color: T.text, marginBottom: 14, letterSpacing: "-.02em" }}>
              Your first protocol in minutes.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={80}>
            <p style={{ fontSize: 15, color: T.muted, marginBottom: 28, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, maxWidth: 460, margin: "0 auto 28px" }}>
              Upload your blood panel. Connect your wearable. Blue Zone does the rest.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={140}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".12em", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, width: "100%", textAlign: "center", marginBottom: 8 }}>Accepts results from</div>
              {["InsideTracker", "Function Health", "LabCorp", "Quest", "Any standard PDF"].map((lab) => (
                <div key={lab} style={{ padding: "5px 14px", borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, whiteSpace: "nowrap" }}>{lab}</div>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <BottomCtaButton />
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, margin: 0 }}>
                Free during early access · No credit card required · Cancel anytime
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <ScrollDepthTracker />
    </div>
  );
}
