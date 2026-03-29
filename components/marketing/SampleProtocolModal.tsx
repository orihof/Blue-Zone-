/// components/marketing/SampleProtocolModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, CalendarClock } from "lucide-react";
import { trackSecondaryCtaClick } from "@/lib/analytics";

/* ── Signal data ── */
const SIGNALS: { name: string; value: string; status: string; color: "orange" | "blue" | "yellow" }[] = [
  { name: "Ferritin", value: "58 ng/mL", status: "Low for training load", color: "orange" },
  { name: "Transferrin sat.", value: "19%", status: "Borderline", color: "orange" },
  { name: "HRV", value: "41ms", status: "14-day decline", color: "orange" },
  { name: "Training load", value: "High", status: "6-week build phase", color: "blue" },
  { name: "Sleep quality", value: "5.8/10", status: "3-week average", color: "orange" },
  { name: "hs-CRP", value: "1.2 mg/L", status: "Borderline elevated", color: "yellow" },
];

const BADGE: Record<"orange" | "blue" | "yellow", { bg: string; text: string }> = {
  orange: { bg: "rgba(249,115,22,0.1)", text: "#FB923C" },
  blue: { bg: "rgba(0,138,255,0.1)", text: "var(--ion-blue)" },
  yellow: { bg: "rgba(234,179,8,0.1)", text: "#FACC15" },
};

/* ── Protocol items ── */
const PROTOCOL: { name: string; dose: string; timing: string; reason: string }[] = [
  {
    name: "Iron bisglycinate",
    dose: "25mg",
    timing: "Evening · Away from training window · With Vitamin C",
    reason: "Bisglycinate form for absorption tolerance during high training load",
  },
  {
    name: "Vitamin C",
    dose: "500mg",
    timing: "With iron supplement",
    reason: "Enhances non-heme iron absorption by up to 67%",
  },
  {
    name: "Training volume reduction",
    dose: "15%",
    timing: "Next 2 weeks · Maintain intensity, reduce volume",
    reason: "Reduce oxidative load while iron stores rebuild",
  },
  {
    name: "Omega-3 (EPA+DHA)",
    dose: "2g",
    timing: "With largest meal",
    reason: "Anti-inflammatory support to address borderline hs-CRP",
  },
];

/* ── Trigger + Modal ── */
export function SampleProtocolTrigger() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const ARROW = (
    <ArrowRight
      size={15}
      strokeWidth={1.5}
      style={{ display: "inline", verticalAlign: "middle", marginTop: -1 }}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => { trackSecondaryCtaClick(); setOpen(true); }}
        className="text-xs text-white/45 md:text-sm md:text-[--stellar] hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
        style={{ background: "none", border: "none", padding: 0 }}
      >
        See a sample protocol {ARROW}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 50 }}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sample protocol"
            className="fixed inset-4 md:inset-8 lg:inset-16"
            style={{ background: "#0D0D14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0D0D14", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>SAMPLE PROTOCOL</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>Anya K. · Triathlete · 34</div>
              </div>
              <button type="button" onClick={close} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} aria-label="Close">
                <X size={20} style={{ color: "rgba(255,255,255,0.5)" }} className="hover:text-white transition-colors" />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* Section 1 — Input signals */}
              <div style={{ margin: 16, background: "#111118", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>What Blue Zone read</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SIGNALS.map((s) => {
                    const b = BADGE[s.color];
                    return (
                      <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{s.name}</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", marginLeft: 6 }}>{s.value}</span>
                        </div>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: b.bg, color: b.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" as const, flexShrink: 0 }}>{s.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2 — Root cause */}
              <div style={{ padding: "0 16px", marginTop: 8 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Root cause identified</div>
                <div style={{ background: "rgba(0,138,255,0.05)", border: "1px solid rgba(0,138,255,0.2)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Iron depletion under oxidative training stress</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.65, marginTop: 8, marginBottom: 0 }}>
                    Ferritin at 58 ng/mL is subclinically low for an endurance athlete in high volume phase. Combined with declining HRV over 14 days and borderline hs-CRP, this pattern is consistent with iron-restricted erythropoiesis suppressing aerobic adaptation — not overtraining.
                  </p>
                </div>
              </div>

              {/* Section 3 — Protocol stack */}
              <div style={{ padding: "0 16px", marginTop: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>Your protocol · Priority ordered</div>
                {PROTOCOL.map((item, i) => (
                  <div key={item.name} style={{ background: "#111118", borderRadius: 12, padding: 16, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Priority badge */}
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? "rgba(0,138,255,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 600, color: i === 0 ? "var(--ion-blue)" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" as const }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{item.name}</span>
                          <span style={{ fontSize: 20, fontWeight: 600, color: "var(--ion-blue)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>{item.dose}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 4 }}>{item.timing}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic", marginTop: 4 }}>{item.reason}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section 4 — Retest timeline */}
              <div style={{ padding: "0 16px 24px", display: "flex", alignItems: "center", gap: 6 }}>
                <CalendarClock size={12} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
                  Retest in 6 weeks · Track: Ferritin, Transferrin Sat, hs-CRP
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: 16, background: "#0D0D14", textAlign: "center", flexShrink: 0 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", margin: 0 }}>
                This is a real protocol type Blue Zone generates. Athlete data anonymized with consent.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
