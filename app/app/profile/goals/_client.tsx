/// app/app/profile/goals/_client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast }    from "sonner";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T    = { text: "#F1F5F9", muted: "#64748B", border: "rgba(255,255,255,0.08)" };
const FONT = "var(--font-ui,'Inter',sans-serif)";
const SERIF = "var(--font-serif,'Syne',sans-serif)";

const GOALS = [
  { id: "weight_loss",          label: "Weight Loss",          icon: "🔥", description: "Optimize body composition & fat metabolism",    badge: "Most popular", badgeStyle: "amber" as const },
  { id: "physical_performance", label: "Physical Performance", icon: "💪", description: "Build strength, endurance & athletic output",    badge: null,            badgeStyle: null },
  { id: "sleep",                label: "Sleep",                icon: "🌙", description: "Improve sleep quality, depth & recovery",       badge: "Most popular", badgeStyle: "amber" as const },
  { id: "sharper_thinking",     label: "Sharper Thinking",     icon: "🧠", description: "Enhance focus, memory & cognitive performance", badge: null,            badgeStyle: null },
  { id: "longevity",            label: "Longevity",            icon: "✨", description: "Slow biological aging & extend healthspan",     badge: null,            badgeStyle: null },
  { id: "hormone_health",       label: "Hormone Health",       icon: "⚡", description: "Balance testosterone, cortisol & energy systems", badge: null,          badgeStyle: null },
] as const;

const GOAL_ICONS: Record<string, string>  = Object.fromEntries(GOALS.map((g) => [g.id, g.icon]));
const GOAL_LABELS: Record<string, string> = Object.fromEntries(GOALS.map((g) => [g.id, g.label]));

interface Props {
  primaryGoal:           string | null;
  secondaryGoal:         string | null;
  onboardingCompletedAt: string | null;
}

export function GoalPickerClient({ primaryGoal, secondaryGoal, onboardingCompletedAt }: Props) {
  const router  = useRouter();
  const [selected, setSelected]   = useState<string | null>(null);
  const [saving,   setSaving]     = useState(false);

  // 30-day unlock check
  const daysSinceOnboarding = onboardingCompletedAt
    ? Math.floor((Date.now() - new Date(onboardingCompletedAt).getTime()) / 86_400_000)
    : null;
  const isUnlocked = daysSinceOnboarding !== null && daysSinceOnboarding >= 30;

  async function handleSave() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/goals", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ secondaryGoal: selected }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Secondary goal saved");
      router.push("/app/profile");
    } catch {
      toast.error("Failed to save — please try again");
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 100px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, fontFamily: FONT, padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(22px,3vw,32px)", color: T.text, letterSpacing: "-.02em", marginBottom: 8 }}>
          Add a secondary goal
        </h1>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: FONT, lineHeight: 1.65 }}>
          Layer a second focus into your next protocol renewal.
        </p>
      </div>

      {/* Locked state — not yet 30 days */}
      {!isUnlocked && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ color: T.muted, fontSize: 13, fontFamily: FONT, margin: 0 }}>
            Secondary goal selection unlocks 30 days after completing onboarding.
            {daysSinceOnboarding !== null && (
              <> Come back in <span style={{ color: T.text }}>{30 - daysSinceOnboarding} days</span>.</>
            )}
          </p>
        </div>
      )}

      {/* Primary goal — locked display */}
      {primaryGoal && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: T.muted, fontFamily: FONT, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".08em" }}>Your primary goal</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{GOAL_ICONS[primaryGoal] ?? "🎯"}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: T.text, fontFamily: FONT }}>{GOAL_LABELS[primaryGoal] ?? primaryGoal}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: T.muted, fontFamily: FONT }}>Locked</span>
          </div>
        </div>
      )}

      {/* Already has secondary goal */}
      {secondaryGoal && (
        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: "#A5B4FC", fontFamily: FONT, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".08em" }}>Current secondary goal</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{GOAL_ICONS[secondaryGoal] ?? "🎯"}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: T.text, fontFamily: FONT }}>{GOAL_LABELS[secondaryGoal] ?? secondaryGoal}</span>
          </div>
          <p style={{ fontSize: 12, color: T.muted, fontFamily: FONT, margin: "10px 0 0" }}>
            Select a new goal below to replace it.
          </p>
        </div>
      )}

      {/* Instruction */}
      {isUnlocked && (
        <p style={{ fontSize: 12, color: T.muted, fontFamily: FONT, marginBottom: 16 }}>
          Choose a secondary focus to layer into your next protocol.
        </p>
      )}

      {/* Goal cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 32, opacity: isUnlocked ? 1 : 0.4, pointerEvents: isUnlocked ? "auto" : "none" }}>
        {GOALS.filter((g) => g.id !== primaryGoal).map((g) => {
          const isSelected = selected === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(isSelected ? null : g.id)}
              style={{
                padding: "18px 16px", borderRadius: 14, textAlign: "left", cursor: "pointer",
                transition: "all .18s",
                background: isSelected ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.03)",
                border:     isSelected ? "1.5px solid rgba(99,102,241,.5)" : `1px solid ${T.border}`,
                boxShadow:  isSelected ? "0 0 16px rgba(99,102,241,.12)" : "none",
                transform:  isSelected ? "scale(1.02)" : "none",
                outline:    "none",
              }}
            >
              {isSelected && (
                <div style={{ position: "absolute", top: 10, right: 10, width: 16, height: 16, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>✓</div>
              )}
              <div style={{ fontSize: 24, marginBottom: 8 }}>{g.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? "#C4B5FD" : T.text, fontFamily: SERIF, marginBottom: 4 }}>{g.label}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: FONT, lineHeight: 1.5 }}>{g.description}</div>
            </button>
          );
        })}
      </div>

      {/* Save button */}
      {isUnlocked && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 20px 32px", background: "linear-gradient(to top,#0A0A0F 60%,transparent)", display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            style={{
              width: "100%", maxWidth: 400, padding: "15px 20px", borderRadius: 14, border: "none",
              background:  selected ? GRAD : "rgba(255,255,255,0.06)",
              color:       selected ? "#fff" : T.muted,
              fontFamily:  FONT, fontSize: 14, fontWeight: 500,
              cursor:      selected && !saving ? "pointer" : "not-allowed",
              opacity:     saving ? 0.7 : 1,
              transition:  "all .2s",
            }}
          >
            {saving ? "Saving…" : selected ? `Set ${GOAL_LABELS[selected]} as secondary goal` : "Select a goal above"}
          </button>
        </div>
      )}
    </div>
  );
}
