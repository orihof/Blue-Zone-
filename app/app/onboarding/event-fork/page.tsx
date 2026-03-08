/// app/app/onboarding/event-fork/page.tsx
// Step 3 of onboarding: Are you training for a specific event?
// Left fork → Competition Prep (/app/onboarding/sports-prep)
// Right fork → Goals page (/app/goals)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap }       from "lucide-react";

const GRAD_V = "linear-gradient(135deg,#7C3AED,#6366F1)";
const GRAD_T = "linear-gradient(135deg,#0D9488,#06B6D4)";
const T      = { text: "#F1F5F9", muted: "#64748B" };
const FONT   = "var(--font-ui,'Inter',sans-serif)";
const SERIF  = "var(--font-serif,'Syne',sans-serif)";

const EVENT_FEATURES = [
  "Phase-based training timeline",
  "Race-week supplement stack",
  "Injury-aware modifications",
];
const GENERAL_FEATURES = [
  "Goal-based supplement stack",
  "Biomarker-calibrated dosing",
  "Continuous protocol improvement",
];

export default function EventForkPage() {
  const router                        = useRouter();
  const [selected, setSelected]       = useState<"event" | "general" | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  function handleSelect(choice: "event" | "general") {
    if (isAdvancing) return;
    setSelected(choice);
    setIsAdvancing(true);

    // Persist so downstream steps can read it
    try {
      const existing = JSON.parse(sessionStorage.getItem("bz_onboarding_v1") ?? "{}") as Record<string, unknown>;
      sessionStorage.setItem("bz_onboarding_v1", JSON.stringify({ ...existing, hasUpcomingEvent: choice === "event" }));
    } catch { /* non-fatal */ }

    setTimeout(() => {
      router.push(choice === "event" ? "/app/onboarding/sports-prep" : "/app/goals");
    }, 300);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06080F", display: "flex", flexDirection: "column" }}>

      {/* Progress bar — Step 3 of 5 */}
      <div style={{ height: 2, background: "rgba(255,255,255,0.06)", width: "100%", flexShrink: 0 }}>
        <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg,#7C3AED,#2DD4BF)", transition: "width .5s" }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", maxWidth: 720, margin: "0 auto", width: "100%" }}>

        {/* Step label */}
        <p style={{ fontSize: 11, color: "#8B5CF6", textTransform: "uppercase", letterSpacing: ".1em", fontFamily: FONT, marginBottom: 24 }}>
          ◎ Step 3 — Your Focus
        </p>

        {/* Headline */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(26px,4vw,42px)", color: T.text, lineHeight: 1.2, letterSpacing: "-.02em", marginBottom: 10 }}>
            Are you training for<br />
            <span style={{ background: GRAD_V, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>a specific event?</span>
          </h1>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: FONT }}>
            This determines how we build your protocol.
          </p>
        </div>

        {/* Fork cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, width: "100%", marginBottom: 28 }}>

          {/* LEFT — Event */}
          <ForkCard
            choice="event"
            selected={selected}
            isAdvancing={isAdvancing}
            accentGrad={GRAD_V}
            accentRaw="#7C3AED"
            icon="🏆"
            badge={<><Zap size={11} /> PERFORMANCE</>}
            headline={<>Yes, I have a race<br />or event coming up</>}
            description="Get a periodized competition protocol built around your race date, sport, and injury profile."
            features={EVENT_FEATURES}
            featColor="#A5B4FC"
            onClick={() => handleSelect("event")}
          />

          {/* RIGHT — General */}
          <ForkCard
            choice="general"
            selected={selected}
            isAdvancing={isAdvancing}
            accentGrad={GRAD_T}
            accentRaw="#0D9488"
            icon="✨"
            badge={null}
            headline={<>No, I&apos;m focused on<br />general optimisation</>}
            description="Build a long-term performance protocol around your personal health goals and biomarker data."
            features={GENERAL_FEATURES}
            featColor="#2DD4BF"
            onClick={() => handleSelect("general")}
          />
        </div>

        <p style={{ fontSize: 12, color: "#374151", fontFamily: FONT, textAlign: "center" }}>
          You can switch or add another focus after your first protocol is generated.
        </p>
      </div>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────────
interface ForkCardProps {
  choice:      "event" | "general";
  selected:    "event" | "general" | null;
  isAdvancing: boolean;
  accentGrad:  string;
  accentRaw:   string;
  icon:        string;
  badge:       React.ReactNode;
  headline:    React.ReactNode;
  description: string;
  features:    string[];
  featColor:   string;
  onClick:     () => void;
}

function ForkCard({ choice, selected, isAdvancing, accentGrad, accentRaw, icon, badge, headline, description, features, featColor, onClick }: ForkCardProps) {
  const isSelected = selected === choice;
  const isDimmed   = isAdvancing && !isSelected;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDimmed}
      style={{
        position:   "relative",
        textAlign:  "left",
        padding:    24,
        borderRadius: 24,
        cursor:     isDimmed ? "not-allowed" : "pointer",
        transition: "all .2s",
        minHeight:  280,
        display:    "flex",
        flexDirection: "column",
        background: isSelected
          ? `rgba(${accentRaw === "#7C3AED" ? "124,58,237" : "13,148,136"},.1)`
          : isDimmed ? "rgba(255,255,255,.01)" : "rgba(255,255,255,.03)",
        border: isSelected
          ? `2px solid ${accentRaw}`
          : isDimmed ? "2px solid rgba(255,255,255,.05)" : "2px solid rgba(255,255,255,.08)",
        boxShadow: isSelected ? `0 0 32px ${accentRaw}22` : "none",
        transform:  isSelected ? "scale(1.02)" : "scale(1)",
        opacity:    isDimmed ? 0.3 : 1,
        outline:    "none",
      }}
    >
      {/* Performance badge */}
      {badge && (
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, letterSpacing: ".06em", color: accentRaw === "#7C3AED" ? "#A5B4FC" : "#2DD4BF", background: `${accentRaw}22`, border: `1px solid ${accentRaw}44`, borderRadius: 100, padding: "3px 10px", fontFamily: FONT }}>
          {badge}
        </div>
      )}

      {/* Icon */}
      <div style={{ width: 52, height: 52, borderRadius: 16, background: `${accentRaw}18`, border: `1px solid ${accentRaw}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18, marginTop: badge ? 6 : 0 }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 17, color: isSelected ? "#fff" : T.text, lineHeight: 1.35, marginBottom: 8, letterSpacing: "-.01em" }}>
          {headline}
        </h2>
        <p style={{ fontSize: 12, color: T.muted, fontFamily: FONT, lineHeight: 1.65, margin: 0 }}>
          {description}
        </p>
      </div>

      {/* Feature list */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 6 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: featColor, opacity: .6, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: featColor, fontFamily: FONT, opacity: .85 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <div style={{ position: "absolute", bottom: 14, right: 14, width: 22, height: 22, borderRadius: "50%", background: accentGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 700, animation: "zoomIn .2s ease both" }}>
          ✓
        </div>
      )}
    </button>
  );
}
