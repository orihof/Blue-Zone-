/// components/CausalChainCards.tsx
"use client";

import { useEffect, useState } from "react";
import { FileText, Microscope, ClipboardList, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const T = { text: "#F1F5F9", muted: "#64748B" };
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";

const CARDS: { n: string; icon: LucideIcon; title: string; desc: string }[] = [
  {
    n: "01",
    icon: FileText,
    title: "Bring all your data",
    desc: "Upload your blood panel from any lab \u2014 InsideTracker, Function Health, LabCorp, Quest, or a PDF from your doctor. Connect WHOOP, Oura, Garmin, or Apple Health. Add your training log.",
  },
  {
    n: "02",
    icon: Microscope,
    title: "We find the root cause",
    desc: "Blue Zone is the first platform that reads your biomarkers and your training load together. Not separately. We identify what\u2019s blocking your adaptation \u2014 the biological root cause your other tools can\u2019t see because they only have half the picture.",
  },
  {
    n: "03",
    icon: ClipboardList,
    title: "You get a precise protocol",
    desc: "Not a dashboard. Not a list of out-of-range markers. A specific, sequenced intervention plan \u2014 training modifications, supplementation timing, recovery changes \u2014 with a clear explanation of why each step is there and what you should see change first.",
  },
  {
    n: "04",
    icon: RefreshCw,
    title: "It adapts as you do",
    desc: "Every blood retest shows you what moved, why it moved, and what to adjust next.",
  },
];

function CardContent({ card }: { card: typeof CARDS[number] }) {
  const Icon = card.icon;
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "rgba(99,102,241,.5)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", marginBottom: 12 }}>{card.n}</div>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(0,138,255,0.15)" }} aria-hidden="true">
        <Icon className="w-5 h-5 text-[--ion-blue]" strokeWidth={1.5} />
      </div>
      <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 16, color: T.text, marginBottom: 8 }}>{card.title}</div>
      <div style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65 }}>{card.desc}</div>
    </>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div
      className="hidden md:flex"
      style={{
        width: 40,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          height: 1,
          backgroundColor: "rgba(99, 102, 241, 0.4)",
          transformOrigin: "left center",
          transform: active ? "scaleX(1)" : "scaleX(0)",
          transition: "transform 0.35s ease-out",
        }}
      />
    </div>
  );
}

export function CausalChainCards() {
  const [step, setStep] = useState(0);
  const [mobileStep, setMobileStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(4);
      return;
    }

    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 900);
    const t3 = setTimeout(() => setStep(3), 1500);
    const t4 = setTimeout(() => setStep(4), 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const wrapperStyle = (cardNum: number): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    opacity: step >= cardNum ? 1 : 0,
    transform: step >= cardNum ? "translateY(0)" : "translateY(20px)",
    transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
  });

  return (
    <>
      {/* Desktop: flexbox row with connectors */}
      <div
        className="hidden md:flex"
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          gap: 0,
          width: "100%",
        }}
      >
        <div style={wrapperStyle(1)}>
          <div className="card" style={{ padding: 24, height: "100%" }}>
            <CardContent card={CARDS[0]} />
          </div>
        </div>

        <Connector active={step >= 2} />

        <div style={wrapperStyle(2)}>
          <div className="card" style={{ padding: 24, height: "100%" }}>
            <CardContent card={CARDS[1]} />
          </div>
        </div>

        <Connector active={step >= 3} />

        <div style={wrapperStyle(3)}>
          <div className="card" style={{ padding: 24, height: "100%" }}>
            <CardContent card={CARDS[2]} />
          </div>
        </div>

        <Connector active={step >= 4} />

        <div style={wrapperStyle(4)}>
          <div className="card" style={{ padding: 24, height: "100%" }}>
            <CardContent card={CARDS[3]} />
          </div>
        </div>
      </div>

      {/* Mobile: single-card stepper */}
      <div className="block md:hidden">
        {/* Step indicator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => setMobileStep(i)}
                aria-label={`Go to step ${i + 1}`}
                style={{
                  width: i === mobileStep ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === mobileStep ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.2)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "width 0.25s ease, background 0.25s ease",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
            {String(mobileStep + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
          </div>
        </div>
        {/* Active card */}
        <div style={{ minHeight: 320, display: "flex", flexDirection: "column" }}>
          <div className="card" style={{ padding: 24, flex: 1 }}>
            <CardContent card={CARDS[mobileStep]} />
          </div>
        </div>
        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20, minHeight: 52 }}>
          {mobileStep > 0 && (
            <button onClick={() => setMobileStep(s => s - 1)}
              style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              ← Prev
            </button>
          )}
          {mobileStep < CARDS.length - 1 ? (
            <button onClick={() => setMobileStep(s => s + 1)}
              style={{ padding: "8px 22px", borderRadius: 8, fontSize: 13, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "rgba(255,255,255,0.85)", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              Next →
            </button>
          ) : (
            <a href="/auth/signin">
              <button style={{ padding: "8px 22px", borderRadius: 8, fontSize: 13, background: GRAD, border: "none", color: "#fff", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>
                Get Started →
              </button>
            </a>
          )}
        </div>
      </div>
    </>
  );
}
