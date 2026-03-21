/// app/app/goals/_client.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter }        from "next/navigation";
import { toast }            from "sonner";
import type { Goal }        from "@/lib/recommendations/generate";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT   = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T    = { text: "#F1F5F9", muted: "#64748B" };
const FONT = "var(--font-ui,'Inter',sans-serif)";
const SERIF = "var(--font-serif,'Syne',sans-serif)";

// ── Goal definitions ───────────────────────────────────────────────────────────
const GOALS = [
  {
    id:           "competition_prep",
    label:        "Competition Prep",
    description:  "Race-ready protocols for your next event",
    icon:         "🏆",
    badge:        "New" as const,
    badgeStyle:   "purple" as const,
    prepCategory: "competition_prep",
  },
  {
    id:           "weight_loss",
    label:        "Weight Loss",
    description:  "Optimize body composition & fat metabolism",
    icon:         "🔥",
    badge:        "Most popular" as const,
    badgeStyle:   "amber" as const,
    prepCategory: "weight_loss",
  },
  {
    id:           "physical_performance",
    label:        "Physical Performance",
    description:  "Build strength, endurance & athletic output",
    icon:         "💪",
    badge:        null,
    badgeStyle:   null,
    prepCategory: "performance",
  },
  {
    id:           "sleep",
    label:        "Sleep",
    description:  "Improve sleep quality, depth & recovery",
    icon:         "🌙",
    badge:        null,
    badgeStyle:   null,
    prepCategory: "sleep",
  },
  {
    id:           "sharper_thinking",
    label:        "Sharper Thinking",
    description:  "Enhance focus, memory & cognitive performance",
    icon:         "🧠",
    badge:        null,
    badgeStyle:   null,
    prepCategory: "cognition",
  },
  {
    id:           "longevity",
    label:        "Longevity",
    description:  "Slow biological aging & extend healthspan",
    icon:         "✨",
    badge:        null,
    badgeStyle:   null,
    prepCategory: "anti_aging",
  },
  {
    id:           "hormone_health",
    label:        "Hormone Health",
    description:  "Balance testosterone, cortisol & energy systems",
    icon:         "⚡",
    badge:        null,
    badgeStyle:   null,
    prepCategory: "sexual_health",
  },
  {
    id:           "mood",
    label:        "Mood",
    description:  "Emotional wellbeing & stress resilience",
    icon:         "☀️",
    badge:        null,
    badgeStyle:   null,
    prepCategory: "mood",
  },
  {
    id:           "hair_loss",
    label:        "Hair Loss",
    description:  "Support follicle health & reduce shedding",
    icon:         "💆",
    badge:        null,
    badgeStyle:   null,
    prepCategory: "hair",
  },
] as const;

type GoalId = typeof GOALS[number]["id"];

// Map goal IDs to the legacy Goal type used by protocol creation
const GOAL_MAP: Record<GoalId, Goal> = {
  competition_prep:     "strength",
  weight_loss:          "fat_loss",
  physical_performance: "strength",
  sleep:                "sleep",
  sharper_thinking:     "focus",
  longevity:            "longevity",
  hormone_health:       "hormones",
  mood:                 "energy",
  hair_loss:            "energy",
};

// ── FlickerText ────────────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function FlickerText({ text, active }: { text: string; active: boolean }) {
  const [displayed, setDisplayed] = useState(text);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  if (active && timerRef.current === null) {
    // kick off on first render when active
    let iter = 0;
    const total = text.length * 3;
    timerRef.current = setInterval(() => {
      setDisplayed(text.split("").map((ch, i) => (i < Math.floor(iter / 3) ? ch : CHARS[Math.floor(Math.random() * CHARS.length)])).join(""));
      iter++;
      if (iter > total) { setDisplayed(text); clearInterval(timerRef.current!); timerRef.current = null; }
    }, 35);
  }
  return <span style={{ color: "#6366F1", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>{displayed}</span>;
}

// ── Generation screen ──────────────────────────────────────────────────────────
const GEN_STEPS = [
  "Analyzing your biomarker data",
  "Mapping to goal pathways",
  "Selecting evidence-based protocols",
  "Calibrating supplement stack",
  "Finalizing your personal protocol",
];

function GenerationScreen({ primaryGoal, onComplete }: { primaryGoal: GoalId; onComplete: (id: string) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [pct, setPct]                 = useState(0);
  const [visibleSteps, setVisible]    = useState<number[]>([0]);
  const doneRef = useRef(false);

  // Step ticker
  useState(() => {
    const id = setInterval(() => {
      setCurrentStep((prev) => {
        const next = Math.min(prev + 1, GEN_STEPS.length - 1);
        setVisible((v) => (v.includes(next) ? v : [...v, next]));
        setPct(Math.round(((next + 1) / GEN_STEPS.length) * 100));
        return next;
      });
    }, 900);
    return () => clearInterval(id);
  });

  // Fire generation
  useState(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const mapped: Goal = GOAL_MAP[primaryGoal] ?? "energy";
    const minDelay = new Promise((r) => setTimeout(r, 3000));
    const protocol = fetch("/api/protocols/create", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ selectedAge: 35, goals: [mapped], budget: "medium", preferences: { primaryGoal } }),
    }).then((r) => {
      if (!r.ok) throw new Error("Protocol generation failed");
      return r.json() as Promise<{ protocolId: string }>;
    });
    Promise.all([minDelay, protocol])
      .then(([, { protocolId }]) => {
        setCurrentStep(GEN_STEPS.length - 1);
        setVisible(GEN_STEPS.map((_, i) => i));
        setPct(100);
        setTimeout(() => onComplete(protocolId), 800);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Something went wrong"));
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#06080F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 50% 40%,rgba(99,102,241,.09) 0%,transparent 70%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 420 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 0 40px rgba(99,102,241,.45)", animation: "glowPulse 2.2s ease-in-out infinite" }}>⬡</div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(20px,3vw,30px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
            Creating your <FlickerText text="PERSONAL" active /> protocol
          </h2>
          <p style={{ fontSize: 15, color: T.muted, fontFamily: FONT }}>Analyzing your data and goal — takes a few seconds</p>
        </div>
        <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", background: GRAD, borderRadius: 99, width: `${pct}%`, transition: "width 1s cubic-bezier(.16,1,.3,1)" }} />
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {GEN_STEPS.map((step, i) => {
            if (!visibleSteps.includes(i)) return null;
            const isDone = i < currentStep, isActive = i === currentStep;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isDone ? 0.5 : 1, transition: "opacity .3s", animation: "fadeUp .35s cubic-bezier(.16,1,.3,1) both" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: isDone ? "#10B981" : isActive ? "#6366F1" : "rgba(255,255,255,.15)", boxShadow: isActive ? "0 0 8px rgba(99,102,241,.7)" : "none", animation: isActive ? "glowPulse 1.2s ease-in-out infinite" : "none" }} />
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 14, color: isDone ? "#10B981" : isActive ? T.text : T.muted }}>
                  {isDone ? "✓ " : isActive ? "→ " : "  "}{step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({
  g, isSelected, dimmed, onClick, onPrepPack,
}: {
  g:          typeof GOALS[number];
  isSelected: boolean;
  dimmed:     boolean;
  onClick:    () => void;
  onPrepPack: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [packHovered, setPackHovered] = useState(false);

  const bg     = isSelected ? "rgba(99,102,241,.14)" : hovered && !dimmed ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.03)";
  const border = isSelected
    ? "1.5px solid rgba(99,102,241,.5)"
    : hovered && !dimmed ? "1px solid rgba(99,102,241,.3)" : "1px solid rgba(255,255,255,.08)";
  const shadow = isSelected
    ? "0 0 18px rgba(99,102,241,.15), inset 0 0 0 1px rgba(99,102,241,.1)"
    : hovered && !dimmed ? "0 4px 16px rgba(99,102,241,.1)" : "none";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={dimmed}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%", minHeight: 160, padding: "22px 20px 58px", borderRadius: 16, textAlign: "left",
          cursor:     dimmed ? "not-allowed" : "pointer",
          opacity:    dimmed ? 0.3 : 1,
          transition: "all .2s",
          background: bg,
          border,
          boxShadow:  shadow,
          transform:  isSelected ? "scale(1.02)" : hovered && !dimmed ? "translateY(-1px)" : "none",
          position:   "relative", overflow: "hidden",
          outline:    "none",
        }}
      >
        {/* Social proof badge */}
        {g.badge && (
          <div style={{
            position: "absolute", top: 10, left: 10, fontSize: 11, fontWeight: 500, letterSpacing: ".04em",
            color: g.badgeStyle === "amber" ? "#FCD34D" : "#C4B5FD",
            background: g.badgeStyle === "amber" ? "rgba(245,158,11,.13)" : "rgba(124,58,237,.13)",
            border: g.badgeStyle === "amber" ? "1px solid rgba(245,158,11,.3)" : "1px solid rgba(124,58,237,.3)",
            borderRadius: 100, padding: "2px 8px", fontFamily: FONT,
          }}>
            {g.badgeStyle === "amber" ? "🔥 " : g.badgeStyle === "purple" ? "🏆 " : ""}{g.badge}
          </div>
        )}

        {/* Selected checkmark */}
        {isSelected && (
          <div style={{ position: "absolute", top: 12, right: 12, width: 18, height: 18, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>✓</div>
        )}

        <div style={{ fontSize: 28, marginBottom: 10, marginTop: 18 }}>{g.icon}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 18, color: isSelected ? "#C4B5FD" : T.text, marginBottom: 5, letterSpacing: "-.01em" }}>{g.label}</div>
        <div style={{ fontSize: 15, color: T.muted, fontFamily: FONT, lineHeight: 1.55 }}>{g.description}</div>
      </button>

      {/* Get Prep Pack button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPrepPack(); }}
        onMouseEnter={() => setPackHovered(true)}
        onMouseLeave={() => setPackHovered(false)}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "11px 16px",
          borderRadius: "0 0 16px 16px",
          fontSize: 12, fontFamily: FONT,
          fontWeight: 500,
          cursor: "pointer", outline: "none",
          background: packHovered
            ? "linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)"
            : "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)",
          border: "none",
          color: "#fff",
          transition: "all .15s",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: packHovered ? "0 4px 16px rgba(99,102,241,.35)" : "none",
        }}
      >
        <span>Get Prep Pack</span>
        <span>→</span>
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function GoalsClient() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);
  const [isAdvancing, setIsAdvancing]   = useState(false);
  const [phase, setPhase]               = useState<"select" | "generating">("select");

  function handleGoalSelect(goalId: GoalId) {
    if (isAdvancing) return;
    setSelectedGoal(goalId);
    setIsAdvancing(true);

    // Persist to onboarding state + profiles.primary_goal
    fetch("/api/user/onboarding", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ goals: [goalId], primaryGoal: goalId }),
    }).catch(() => { /* non-fatal */ });

    // Auto-advance into generation after 300ms selection flash
    setTimeout(() => setPhase("generating"), 300);
  }

  function handleProtocolReady(protocolId: string) {
    router.push(`/app/results/${protocolId}`);
  }

  return (
    <>
      {phase === "generating" && selectedGoal && (
        <GenerationScreen primaryGoal={selectedGoal} onComplete={handleProtocolReady} />
      )}

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 80px" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            color: "#F1F5F9",
            cursor: "pointer",
            fontSize: 14,
            fontFamily: FONT,
            padding: "10px 18px",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 400,
            transition: "all .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.10)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
        >
          ← Back
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 14, letterSpacing: ".1em", color: "#6366F1", fontFamily: FONT, textTransform: "uppercase", marginBottom: 12 }}>◎ Step 4 — Goals</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(24px,4vw,42px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 10 }}>
            What do you want to<br /><span style={GT}>optimise</span>
          </h1>
          <p style={{ fontSize: 16, color: T.muted, fontFamily: FONT, lineHeight: 1.7, maxWidth: 360, margin: "0 auto" }}>
            Your protocol will be built around this priority.
            {" "}<span style={{ color: "#94A3B8" }}>You can add a second goal later.</span>
          </p>
        </div>

        {/* Goal cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {GOALS.map((g) => (
            <GoalCard
              key={g.id}
              g={g}
              isSelected={selectedGoal === g.id}
              dimmed={isAdvancing && selectedGoal !== g.id}
              onClick={() => handleGoalSelect(g.id)}
              onPrepPack={() => router.push(`/app/onboarding/goal-prep?category=${g.prepCategory}`)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
