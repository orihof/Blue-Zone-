"use client";
/// components/bio-age/BioAgeReveal.tsx
// Full-screen reveal overlay — shown once when bio age is first calculated.
// On dismiss, calls PATCH /api/bio-age to mark bio_age_revealed = true.

import { useState } from "react";
import { BioAgeRing } from "./BioAgeRing";

interface Driver {
  factor:    string;
  direction: "positive" | "negative" | "neutral";
  magnitude: number;
  detail:    string;
}

interface BioAgeRevealProps {
  biologicalAge:    number;
  chronologicalAge: number;
  percentile:       number | null;
  confidenceLevel:  string | null;
  primaryDrivers:   Driver[];
  onDismiss: () => void;
}

export function BioAgeReveal({
  biologicalAge,
  chronologicalAge,
  percentile,
  confidenceLevel,
  primaryDrivers,
  onDismiss,
}: BioAgeRevealProps) {
  const [dismissing, setDismissing] = useState(false);

  const delta     = biologicalAge - chronologicalAge;
  const isYounger = delta <= 0;
  const accentColor = isYounger ? "#10B981" : delta <= 5 ? "#F59E0B" : "#EF4444";

  const headline =
    delta <= -10 ? "You're aging exceptionally well." :
    delta <= -5  ? "Your body is significantly younger." :
    delta <= 0   ? "You're aging ahead of the curve." :
    delta <= 5   ? "You have room to optimize." :
                   "Your biology needs attention.";

  async function handleDismiss() {
    setDismissing(true);
    try {
      await fetch("/api/bio-age", { method: "PATCH" });
    } catch { /* ignore */ }
    onDismiss();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5,5,10,0.97)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px",
        animation: "fadeIn .4s ease",
      }}
    >
      {/* Ambient glow behind ring */}
      <div style={{
        position: "absolute",
        width: 320, height: 320,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Header label */}
      <div style={{
        fontSize: 10, fontWeight: 400, letterSpacing: ".18em", color: "#6366F1",
        fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase",
        marginBottom: 28,
      }}>
        Your Biological Age Score
      </div>

      {/* Ring */}
      <BioAgeRing
        biologicalAge={biologicalAge}
        chronologicalAge={chronologicalAge}
        size={180}
        animate
      />

      {/* Headline */}
      <h2 style={{
        fontFamily: "var(--font-serif,'Syne',sans-serif)",
        fontWeight: 400, fontSize: "clamp(20px,3vw,28px)",
        color: "#F1F5F9", textAlign: "center",
        marginTop: 28, marginBottom: 8, letterSpacing: "-.02em",
        maxWidth: 360,
      }}>
        {headline}
      </h2>

      {/* Sub stats */}
      <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
        {percentile != null && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 22, fontWeight: 300, color: accentColor }}>
              {percentile}th
            </div>
            <div style={{ fontSize: 10, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              percentile
            </div>
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 22, fontWeight: 300, color: accentColor }}>
            {chronologicalAge}
          </div>
          <div style={{ fontSize: 10, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            chrono age
          </div>
        </div>
        {confidenceLevel && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 22, fontWeight: 300, color: confidenceLevel === "high" ? "#34D399" : confidenceLevel === "medium" ? "#FCD34D" : "#94A3B8" }}>
              {confidenceLevel}
            </div>
            <div style={{ fontSize: 10, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              confidence
            </div>
          </div>
        )}
      </div>

      {/* Drivers */}
      {primaryDrivers.length > 0 && (
        <div style={{
          width: "100%", maxWidth: 380,
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.06)",
          borderRadius: 12, padding: "14px 18px",
          marginBottom: 28,
        }}>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>
            Key Drivers
          </div>
          {primaryDrivers.slice(0, 4).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: i < Math.min(primaryDrivers.length, 4) - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                background: d.direction === "positive" ? "#10B981" : d.direction === "negative" ? "#EF4444" : "#64748B",
              }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, fontWeight: 400, color: "#F1F5F9" }}>{d.factor}</div>
                <div style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{d.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        style={{
          padding: "12px 40px",
          borderRadius: 8,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
          border: "none", cursor: "pointer",
          fontFamily: "var(--font-ui,'Inter',sans-serif)",
          fontSize: 14, fontWeight: 500, color: "#fff",
          letterSpacing: ".04em",
          boxShadow: `0 0 24px ${accentColor}40`,
          opacity: dismissing ? 0.6 : 1,
        }}
      >
        {dismissing ? "Saving…" : "View Dashboard →"}
      </button>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
