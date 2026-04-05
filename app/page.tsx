/// app/page.tsx

import Script from "next/script";
import Link from "next/link";
import { HoloBodyReveal } from "@/components/ui/HoloBodyReveal";
import { PrimaryCtaButton } from "@/components/landing/TrackedCtaButtons";
import { ApplyCtaButton } from "@/components/marketing/ApplyCtaButton";
import { SampleProtocolTrigger } from "@/components/marketing/SampleProtocolModal";
import DarkMatterSection from "@/components/landing/DarkMatterSection";
import { ConnectsWithPills } from "@/components/landing/ConnectsWithPills";
import { ScrollDepthTracker } from "@/components/ScrollDepthTracker";
import { SynthesisEngine } from "@/components/landing/SynthesisEngine";
import { CausalChainSection } from "@/components/landing/CausalChainSection";
import { LiveInsightEngine } from "@/components/landing/LiveInsightEngine";
import { SectionDiagnosis } from "@/components/landing/SectionDiagnosis";
import { HeroStagger, HeroChild } from "@/components/landing/HeroAnimated";
import { RevealSection, RevealChild } from "@/components/landing/RevealSection";
import { ShieldCheck } from "lucide-react";
import { CountUp } from "@/components/landing/CountUp";
import { StructuredData } from "@/components/seo/StructuredData";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { bg: "#06080F", text: "#F1F5F9", muted: "#64748B" };
const GT = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent", backgroundClip: "text" as const };

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, position: "relative" }}>
      <StructuredData schema={[
        {
          "@context": "https://schema.org", "@type": "Organization",
          name: "Blue Zone", url: "https://bluezone.health",
          description: "Biological age operating system for competitive athletes and biohackers.",
          founder: { "@type": "Person", name: "Ori Hofnung", jobTitle: "Founder & CEO" },
        },
        {
          "@context": "https://schema.org", "@type": "SoftwareApplication",
          name: "Blue Zone", applicationCategory: "HealthApplication",
          description: "Reads 100+ blood biomarkers alongside WHOOP, Oura Ring, and Garmin data.",
        },
        {
          "@context": "https://schema.org", "@type": "WebSite",
          name: "Blue Zone", url: "https://bluezone.health",
        },
      ]} />
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
        <section className="hero-section relative w-full min-h-screen" style={{ overflowX: "clip", overflowY: "visible" }}>
          {/* Ambient indigo gradient — sits behind all content */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'radial-gradient(ellipse 50% 70% at 75% 50%, rgba(99,102,241,0.06), transparent 65%)',
              zIndex: -1,
            }}
          />
          <div className="max-w-7xl mx-auto w-full px-8 h-full flex flex-col" style={{ padding: "90px 28px 48px" }}>
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_3fr] gap-12 flex-1 w-full items-stretch">
          {/* Left column — copy */}
          <HeroStagger className="flex flex-col justify-center h-full text-center xl:text-left" style={{ maxWidth: 640 }}>
            <HeroChild className="order-2 md:order-none">
              <h1 className="font-normal lg:font-light md:max-w-[580px]" style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(38px,6vw,72px)", lineHeight: 1.12, marginBottom: 20, letterSpacing: "-.02em", textWrap: "balance", ...GT }}>
                You have the data. You still don&apos;t have{" "}<span style={{ background: "linear-gradient(135deg, #FFFFFF 0%, var(--stellar, #E8EEFF) 50%, rgba(255,255,255,0.75) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>the answer.</span>
              </h1>
            </HeroChild>
            <HeroChild className="order-3 md:order-none">
              <p style={{ fontSize: "clamp(15px,2vw,18px)", color: "rgba(255,255,255,0.65)", fontWeight: 300, maxWidth: 620, margin: "0 auto", marginTop: 4, marginBottom: 0, lineHeight: 1.75, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                Blood panels show what&apos;s out of range. Wearables show strain. Neither explains why your body isn&apos;t adapting.
              </p>
              <p style={{ fontSize: "clamp(15px,2vw,18px)", color: "rgba(255,255,255,0.65)", fontWeight: 300, maxWidth: 620, margin: "0 auto", marginTop: 12, marginBottom: 0, lineHeight: 1.75, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                Blue Zone reads both together, and tells you <span className="text-[--ion-blue] font-semibold">exactly what to fix</span>. In minutes.
              </p>
            </HeroChild>
            {/* FOR EXAMPLE label */}
            <HeroChild className="order-[5] md:order-none">
              <p style={{ fontSize: 11, color: "rgba(95,105,155,1)", marginTop: 16, marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                For example
              </p>
            </HeroChild>
            {/* Causal chain — vertical on mobile, horizontal pill on desktop */}
            <HeroChild className="order-[6] md:order-none">
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
            </HeroChild>
            <HeroChild className="flex flex-col items-center xl:items-start mt-4 mb-14 gap-3 order-[4] md:order-none">
              <div className="flex gap-3 flex-wrap justify-center xl:justify-start">
                <PrimaryCtaButton />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-[var(--muted)] justify-center md:justify-start">
                <ShieldCheck size={13} className="text-[var(--ion-blue)] flex-shrink-0" aria-hidden="true" />
                Built on exercise physiology research — not AI pattern-matching.
              </p>
              <SampleProtocolTrigger />
            </HeroChild>
            <div className="hidden xl:flex items-center mt-6 order-8 md:order-none" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, maxWidth: 560 }}>
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
          </HeroStagger>
          {/* Right column — HoloBody SVG (visible xl+ only) */}
          <div className="hidden xl:flex items-center justify-center h-full overflow-visible pl-14">
            <div style={{ width: '100%', maxWidth: '720px' }}>
              <HoloBodyReveal />
            </div>
          </div>
          </div>{/* /grid */}
          </div>{/* /max-w-7xl */}
        </section>

        {/* ── Sound familiar ── */}
        <div style={{ background: "rgba(14,16,28,0.75)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <RevealSection stagger className="py-8 md:py-14" style={{ maxWidth: 680, margin: "0 auto", paddingLeft: 28, paddingRight: 28, textAlign: "center" }}>
          <RevealChild>
            <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: ".12em", color: "rgba(255,255,255,0.4)", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>SOUND FAMILIAR?</div>
          </RevealChild>
          <RevealChild>
            <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(24px,4vw,40px)", color: T.text, marginBottom: 14, letterSpacing: "-.02em" }}>Every other tool shows you half the picture.</h2>
          </RevealChild>
          <RevealChild>
            <div style={{ borderLeft: "2px solid rgba(96,165,250,0.25)", paddingLeft: 20, textAlign: "left", maxWidth: 620, margin: "0 auto" }}>
              <p className="text-left" style={{ fontSize: "clamp(13px,2vw,15px)", color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.75, margin: 0 }}>You&apos;ve done the bloodwork. You wear a WHOOP or an Oura. You have a coach and a training plan. And you&apos;re still plateaued, or overtrained, or recovering slower than you should be. Every platform you&apos;ve tried has shown you what is out of range. None of them have told you why your body isn&apos;t adapting — because none of them can see your training load and your biology at the same time. Blue Zone can.</p>
            </div>
          </RevealChild>
        </RevealSection>
        </div>

        {/* ── Synthesis engine ── */}
        <SynthesisEngine />

        {/* ── Diagnosis ── */}
        <SectionDiagnosis />

        {/* ── Causal chain examples ── */}
        <CausalChainSection />

        {/* ── Stats strip ── */}
        <RevealSection style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "36px 28px", background: "rgba(6,8,15,0.95)" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 24px", width: "100%" }} className="sm:flex sm:justify-center sm:gap-16">
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,36px)", color: T.text, marginBottom: 4 }}><CountUp end={100} suffix="+" /></div>
                <div style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Biomarkers synthesized</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 4 }}>vs. 43 on InsideTracker</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,36px)", color: T.text, marginBottom: 4 }}><CountUp end={7} /></div>
                <div style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Wearable + lab sources</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4vw,36px)", color: "var(--ion-blue)", marginBottom: 4 }}>{"<6 min"}</div>
                <div style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Upload to first protocol</div>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* ── How it works — Dark Matter synthesis ── */}
        <DarkMatterSection />

        {/* ── Wearables ── */}
        <RevealSection stagger style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }} className="px-7 pb-10 md:pb-20">
          <RevealChild>
            <div style={{ fontSize: 13, fontWeight: 400, letterSpacing: ".12em", color: "rgba(255,255,255,0.4)", marginBottom: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>CONNECTS WITH</div>
          </RevealChild>
          <RevealChild>
            <ConnectsWithPills />
          </RevealChild>
        </RevealSection>

        {/* ── Live insight engine ── */}
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-t border-white/5" />
        </div>
        <RevealSection>
          <LiveInsightEngine />
        </RevealSection>

        {/* ── Founder ── */}
        <RevealSection as="section" style={{ padding: "64px 16px", textAlign: "center" }}>
          <div style={{ maxWidth: 672, margin: "0 auto" }}>
            {/* Photo */}
            <div className="mx-auto mb-6 w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/10 ring-offset-2 ring-offset-[#0A0A0F]">
              <img src="/Ori-Hofnung.jpg" alt="Ori Hofnung, Founder &amp; CEO of Blue Zone" className="w-full h-full object-cover object-top" />
            </div>
            {/* Eyebrow */}
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 16 }}>WHY I BUILT THIS</div>
            {/* Quote */}
            <div style={{ position: "relative" }}>
              <span aria-hidden="true" style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 72, lineHeight: 1, color: "var(--ion-blue)", opacity: 0.2, fontFamily: "var(--font-serif,'Syne',sans-serif)", pointerEvents: "none" }}>&ldquo;</span>
              <p style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(16px,2.5vw,20px)", color: "rgba(255,255,255,0.85)", fontStyle: "italic", lineHeight: 1.7, margin: 0, paddingTop: 24 }}>
                I built Blue Zone because I was the guy with WHOOP data, bloodwork, and a training plan — and I was still plateauing. My ferritin was technically in range. My doctor saw nothing. My WHOOP saw suppressed HRV. Neither explained why. I needed one system that could see both at the same time. It didn&apos;t exist, so I built it.
              </p>
            </div>
            {/* Attribution */}
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 16 }}>Ori Hofnung · Founder &amp; CEO, Blue Zone</p>
            {/* Personal invitation */}
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 12 }}>
              If you&apos;ve been in this exact position — <a href="#apply" style={{ color: "var(--ion-blue)", textDecoration: "none" }}>apply below</a>. The first 50 spots are reviewed by me personally.
            </p>
          </div>
        </RevealSection>

        {/* ── Bottom CTA ── */}
        <div id="apply" style={{ background: "#0A0A0F", position: "relative", overflow: "hidden" }}>
          {/* Radial glow */}
          <div aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "120%", height: "120%", background: "radial-gradient(ellipse at center, rgba(0,138,255,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />
          <RevealSection stagger style={{ position: "relative", maxWidth: 640, margin: "0 auto", padding: "80px 28px 96px", textAlign: "center" }}>
            <RevealChild>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".16em", color: "var(--ion-blue)", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 20 }}>
                FOUNDING COHORT · 50 SPOTS
              </div>
              <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 700, fontSize: "clamp(28px,5vw,48px)", color: "#FFFFFF", lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: 16 }}>
                Your first protocol<br />in minutes.
              </h2>
            </RevealChild>
            <RevealChild>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, lineHeight: 1.7, maxWidth: 480, margin: "0 auto", marginBottom: 0 }}>
                Upload your blood panel. Connect your wearable. Blue Zone identifies what&apos;s blocking your adaptation — not just what&apos;s out of range.
              </p>
            </RevealChild>
            <RevealChild>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "24px 0", margin: "28px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ion-blue)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>50 spots</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Founding cohort</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>48hr</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, textTransform: "uppercase" as const, letterSpacing: ".06em" }}>Review window</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>Free</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, textTransform: "uppercase" as const, letterSpacing: ".06em" }}>During beta</div>
                  </div>
                </div>
              </div>
            </RevealChild>
            <RevealChild>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".12em", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, width: "100%", textAlign: "center", marginBottom: 8 }}>Accepts results from</div>
                {["InsideTracker", "Function Health", "LabCorp", "Quest", "Any standard PDF"].map((lab) => (
                  <div key={lab} style={{ padding: "5px 14px", borderRadius: 100, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, whiteSpace: "nowrap" as const }}>{lab}</div>
                ))}
              </div>
            </RevealChild>
            <RevealChild>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <ApplyCtaButton />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, margin: 0 }}>
                  No credit card required · Reviewed within 48hrs
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 8, textAlign: "center" }}>
                  Paid plans from $29/month after early access ends.
                </p>
              </div>
            </RevealChild>
          </RevealSection>
        </div>
      </div>
      <ScrollDepthTracker />
      <Script
        id="jsonld-bluezone"
        type="application/ld+json"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Blue Zone",
            applicationCategory: "HealthApplication",
            operatingSystem: "Web",
            description:
              "Blue Zone is a health intelligence platform that synthesizes blood biomarker data and wearable training metrics to generate personalized supplement and training protocols for endurance athletes and biohackers.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Free during early access founding cohort",
            },
            creator: {
              "@type": "Person",
              name: "Ori Hofnung",
              jobTitle: "Founder & CEO",
            },
            featureList: [
              "Blood biomarker synthesis across 100+ markers",
              "Wearable data integration (WHOOP, Oura, Garmin, TrainingPeaks)",
              "Root cause identification for training adaptation failures",
              "Personalized supplement and training protocol generation",
              "Protocol adaptation based on blood retest results",
            ],
            audience: {
              "@type": "Audience",
              audienceType:
                "Endurance athletes, biohackers, performance optimization enthusiasts",
            },
          }),
        }}
      />
    </div>
  );
}
