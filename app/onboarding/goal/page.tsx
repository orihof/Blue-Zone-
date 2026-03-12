/// app/onboarding/goal/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT = {
  background: GRAD,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};
const T = { text: "#F1F5F9", muted: "#64748B" };

const GOALS = [
  {
    id:          "sports_prep",
    icon:        "🏆",
    title:       "Prepare for an upcoming sports competition",
    description: "Periodized training support, race-day strategy & a tier-based supplement pack built around your event.",
    accent:      "#14B8A6",
    badge:       "⚡ PERFORMANCE",
  },
  {
    id:          "sleep",
    icon:        "🌙",
    title:       "Sleep deeper, wake refreshed",
    description: "Optimize your sleep architecture and wake up truly recovered.",
    accent:      "#7C3AED",
    badge:       null,
  },
  {
    id:          "performance",
    icon:        "⚡",
    title:       "Feel stronger & more energized",
    description: "Build lean muscle, boost stamina, and power through your day.",
    accent:      "#3B82F6",
    badge:       null,
  },
  {
    id:          "anti_aging",
    icon:        "✨",
    title:       "Look & feel younger",
    description: "Slow biological aging, improve skin health, and sustain vitality.",
    accent:      "#A855F7",
    badge:       null,
  },
] as const;

export default function GoalPage() {
  const router    = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSelect(goalId: string) {
    if (loading) return;
    setSelected(goalId);
    setLoading(true);

    await fetch("/api/onboarding/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primary_goal: goalId, onboarding_step: "data" }),
    });

    // Sports prep has its own multi-step flow — route there directly
    if (goalId === "sports_prep") {
      setTimeout(() => router.push("/app/onboarding/sports-prep?from=onboarding"), 300);
      return;
    }

    setTimeout(() => router.push("/app/onboarding"), 300);
  }

  return (
    <div style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
      {/* Overline */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 14px", borderRadius: 100,
        background: "rgba(99,102,241,.09)", border: "1px solid rgba(99,102,241,.2)",
        fontSize: 10, fontWeight: 400, letterSpacing: ".1em", color: "#A5B4FC",
        marginBottom: 28, fontFamily: "var(--font-ui,'Inter',sans-serif)",
        textTransform: "uppercase" as const,
      }}>
        STEP 2 OF 2 · Primary goal
      </div>

      {/* Heading */}
      <h1 style={{
        fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300,
        fontSize: "clamp(26px,4.5vw,38px)", lineHeight: 1.2,
        letterSpacing: "-.02em", marginBottom: 10,
      }}>
        <span style={{ color: T.text }}>What&apos;s your</span>{" "}
        <span style={GT}>primary goal?</span>
      </h1>

      <p style={{
        fontSize: 14, color: T.muted, marginBottom: 36,
        fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65,
      }}>
        We&apos;ll tailor your protocol around this. You can change it later.
      </p>

      {/* Goal cards — 2×2 grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2,1fr)",
        gap: 12,
        marginBottom: 28,
      }}>
        {GOALS.map((g) => {
          const isSelected = selected === g.id;
          return (
            <button
              key={g.id}
              onClick={() => handleSelect(g.id)}
              disabled={loading}
              style={{
                position: "relative",
                padding: "22px 18px",
                background: isSelected
                  ? `rgba(${hexToRgb(g.accent)},0.12)`
                  : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${isSelected ? g.accent : "rgba(255,255,255,0.09)"}`,
                borderRadius: 14,
                cursor: loading ? "default" : "pointer",
                textAlign: "left" as const,
                transition: "all .18s",
                transform: isSelected ? "scale(0.98)" : "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (!loading && !isSelected) {
                  e.currentTarget.style.borderColor = `rgba(${hexToRgb(g.accent)},0.45)`;
                  e.currentTarget.style.background   = `rgba(${hexToRgb(g.accent)},0.06)`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.background   = "rgba(255,255,255,0.03)";
                }
              }}
            >
              {/* Performance badge — sports card only */}
              {g.badge && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  fontSize: 9, fontWeight: 500, letterSpacing: ".06em",
                  background: "linear-gradient(135deg,rgba(139,92,246,.2),rgba(20,184,166,.2))",
                  border: "1px solid rgba(20,184,166,.3)",
                  color: "#2DD4BF",
                  padding: "2px 8px", borderRadius: 100,
                  fontFamily: "var(--font-ui,'Inter',sans-serif)",
                  display: "flex", alignItems: "center", gap: 3,
                  whiteSpace: "nowrap" as const,
                }}>
                  {g.badge}
                </div>
              )}

              <div style={{ fontSize: 28, marginBottom: 10 }}>{g.icon}</div>
              <div style={{
                fontFamily: "var(--font-serif,'Syne',sans-serif)",
                fontWeight: 400, fontSize: 14,
                color: isSelected ? "#F1F5F9" : "#CBD5E1",
                marginBottom: 6, lineHeight: 1.35,
              }}>
                {g.title}
              </div>
              <div style={{
                fontSize: 12, color: T.muted,
                fontFamily: "var(--font-ui,'Inter',sans-serif)",
                fontWeight: 300, lineHeight: 1.55,
              }}>
                {g.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Skip link */}
      <button
        onClick={async () => {
          await fetch("/api/onboarding/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ onboarding_step: "data" }),
          });
          router.push("/app/onboarding");
        }}
        style={{
          background: "none", border: "none",
          fontSize: 13, color: T.muted,
          fontFamily: "var(--font-ui,'Inter',sans-serif)",
          fontWeight: 300, cursor: "pointer",
          textDecoration: "underline", textUnderlineOffset: 3,
        }}
      >
        Skip for now
      </button>
    </div>
  );
}

// Helper — convert #RRGGBB to "r,g,b" for rgba()
function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
