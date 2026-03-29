/// components/landing/InsightResult.tsx
"use client";

import { CalendarClock, ArrowRight } from "lucide-react";

export interface InsightResultData {
  rootCause: string;
  confidence: "high" | "medium" | "low";
  signalsUsed: string[];
  insight: string;
  protocol: Array<{
    priority: number;
    intervention: string;
    dose: string;
    timing: string;
    reason: string;
  }>;
  whatToWatch: string;
  retestIn: string;
}

interface InsightResultProps {
  result: InsightResultData;
  onReset: () => void;
}

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: "rgba(34,197,94,0.1)", text: "#4ADE80", border: "rgba(34,197,94,0.2)" },
  medium: { bg: "rgba(234,179,8,0.1)", text: "#FACC15", border: "rgba(234,179,8,0.2)" },
  low: { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" },
};

export function InsightResult({ result, onReset }: InsightResultProps) {
  const conf = CONFIDENCE_STYLES[result.confidence] ?? CONFIDENCE_STYLES.low;

  return (
    <div style={{ maxWidth: 576, margin: "0 auto" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          YOUR PROTOCOL PREVIEW
        </div>
        <button
          type="button"
          onClick={onReset}
          style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
        >
          Analyze again →
        </button>
      </div>

      {/* Root cause card */}
      <div style={{ background: "rgba(0,138,255,0.05)", border: "1px solid rgba(0,138,255,0.15)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ion-blue)", opacity: 0.5, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>
              ROOT CAUSE
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-serif,'Syne',sans-serif)" }}>
              {result.rootCause}
            </div>
          </div>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: conf.bg, color: conf.text, border: `1px solid ${conf.border}`, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {result.confidence} confidence
          </span>
        </div>

        {/* Insight text */}
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.65, marginTop: 12, marginBottom: 0 }}>
          {result.insight}
        </p>

        {/* Signals used */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {result.signalsUsed.map((s) => (
            <span key={s} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              ↓ {s}
            </span>
          ))}
        </div>
      </div>

      {/* Protocol items */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {result.protocol.map((item) => (
          <div key={item.priority} style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              {/* Priority badge */}
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,138,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--ion-blue)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                {item.priority}
              </div>
              <div style={{ flex: 1 }}>
                {/* Name + dose */}
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                    {item.intervention}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ion-blue)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
                    {item.dose}
                  </span>
                </div>
                {/* Timing */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2, marginLeft: 0 }}>
                  {item.timing}
                </div>
                {/* Reason */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic", marginTop: 4 }}>
                  {item.reason}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Retest row */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
        <CalendarClock size={12} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
          Retest in {result.retestIn} · Track: {result.whatToWatch}
        </span>
      </div>

      {/* Conversion CTA */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 16 }}>
          This is a preview. Your full protocol synthesizes 100+ markers and your complete wearable history.
        </p>
        <a href="#apply" style={{ textDecoration: "none" }}>
          <button
            type="button"
            className="cta"
            style={{ width: "100%", maxWidth: 384, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            Get my full protocol <ArrowRight size={15} strokeWidth={1.5} />
          </button>
        </a>
      </div>
    </div>
  );
}
