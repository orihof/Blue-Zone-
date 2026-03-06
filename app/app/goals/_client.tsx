/// app/app/goals/_client.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Goal } from "@/lib/recommendations/generate";

const GRAD     = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const PERF_GRAD = "linear-gradient(135deg,#7C3AED,#06B6D4)";
const GT       = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T        = { text: "#F1F5F9", muted: "#64748B" };

const GOALS = [
  { id: "weight_loss",   label: "Weight Loss",          icon: "🔥", desc: "Optimize body composition & fat metabolism",  badge: "🔥 Most popular" },
  { id: "anti_aging",    label: "Looking Younger",       icon: "✨", desc: "Slow biological aging & improve skin health", badge: null },
  { id: "performance",   label: "Physical Performance",  icon: "💪", desc: "Strength, endurance & peak athletic output",  badge: null },
  { id: "cognition",     label: "Sharper Thinking",      icon: "🧠", desc: "Focus, memory & cognitive performance",       badge: null },
  { id: "sleep",         label: "Sleep",                 icon: "🌙", desc: "Deep sleep quality & circadian rhythm",       badge: "🔥 Most popular" },
  { id: "hair",          label: "Hair Loss",             icon: "💆", desc: "Support follicle health & reduce shedding",   badge: null },
  { id: "mood",          label: "Mood",                  icon: "☀️", desc: "Emotional wellbeing & stress resilience",     badge: null },
  { id: "sexual_health", label: "Sexual Health",         icon: "❤️", desc: "Hormonal balance & vitality",                badge: null },
  { id: "gut",           label: "Gut Health",            icon: "🫁", desc: "Microbiome diversity & digestive function",   badge: null },
  { id: "stress",        label: "Reducing Stress",       icon: "🧘", desc: "Cortisol regulation & calm focus",           badge: null },
  { id: "longevity",     label: "Longevity",             icon: "🧬", desc: "Extend healthspan & slow biological aging",   badge: null },
] as const;

const GOAL_MAP: Record<string, Goal> = {
  weight_loss:   "fat_loss",
  anti_aging:    "longevity",
  performance:   "strength",
  cognition:     "focus",
  sleep:         "sleep",
  hair:          "hormones",
  mood:          "energy",
  sexual_health: "hormones",
  gut:           "recovery",
  stress:        "recovery",
  longevity:     "longevity",
};

const MAX_GOALS = 3;

// ── FlickerText ────────────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
function FlickerText({ text, active }: { text: string; active: boolean }) {
  const [displayed, setDisplayed] = useState(text);
  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    let iter = 0;
    const total = text.length * 3;
    const id = setInterval(() => {
      setDisplayed(text.split("").map((ch, i) => (i < Math.floor(iter / 3) ? ch : CHARS[Math.floor(Math.random() * CHARS.length)])).join(""));
      iter++;
      if (iter > total) { setDisplayed(text); clearInterval(id); }
    }, 35);
    return () => clearInterval(id);
  }, [text, active]);
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

function GenerationScreen({ onComplete }: { onComplete: (id: string) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [pct, setPct]                 = useState(0);
  const [visibleSteps, setVisible]    = useState<number[]>([0]);
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentStep((prev) => {
        const next = Math.min(prev + 1, GEN_STEPS.length - 1);
        setVisible((v) => (v.includes(next) ? v : [...v, next]));
        setPct(Math.round(((next + 1) / GEN_STEPS.length) * 100));
        return next;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    fetch("/api/user/onboarding")
      .then((r) => r.json())
      .then(async ({ goals: savedGoals }: { goals: string[] }) => {
        const mapped: Goal[] = Array.from(new Set(savedGoals.map((g: string) => GOAL_MAP[g] ?? "energy")));
        const minDelay = new Promise((r) => setTimeout(r, 3000));
        const protocol = fetch("/api/protocols/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedAge: 35, goals: mapped.length > 0 ? mapped : ["energy"], budget: "medium", preferences: {} }),
        }).then((r) => {
          if (!r.ok) throw new Error("Protocol generation failed");
          return r.json() as Promise<{ protocolId: string }>;
        });
        const [, { protocolId }] = await Promise.all([minDelay, protocol]);
        setCurrentStep(GEN_STEPS.length - 1);
        setVisible(GEN_STEPS.map((_, i) => i));
        setPct(100);
        setTimeout(() => onComplete(protocolId), 800);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Something went wrong"));
  }, [onComplete]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "#06080F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 50% 40%,rgba(99,102,241,.09) 0%,transparent 70%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 420 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 0 40px rgba(99,102,241,.45)", animation: "glowPulse 2.2s ease-in-out infinite" }}>⬡</div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,30px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
            Creating your <FlickerText text="PERSONAL" active /> protocol
          </h2>
          <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Analyzing your data and goals — takes a few seconds</p>
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
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: isDone ? "#10B981" : isActive ? T.text : T.muted }}>
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

// ── Sports Tile (premium, unlockable) ─────────────────────────────────────────
function SportsTile({ unlocked }: { unlocked: boolean }) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hovered, setHovered] = useState(false);

  function handleClick() {
    if (!unlocked) { setShowTooltip(true); setTimeout(() => setShowTooltip(false), 3000); return; }
    console.log("[analytics] sports_prep_tile_clicked");
    router.push("/app/onboarding/sports-prep");
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "100%",
          minHeight: 160,
          padding: "22px 20px",
          borderRadius: 16,
          textAlign: "left",
          cursor: "pointer",
          transition: "all .2s",
          opacity: unlocked ? 1 : 0.5,
          background: hovered && unlocked ? "rgba(124,58,237,.13)" : "rgba(124,58,237,.08)",
          border: "1.5px solid transparent",
          backgroundClip: "padding-box",
          boxShadow: unlocked ? `0 0 ${hovered ? "32px" : "24px"} rgba(124,58,237,${hovered ? "0.28" : "0.2"})` : "none",
          transform: hovered && unlocked ? "translateY(-1px)" : "none",
          position: "relative",
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* Gradient border via pseudo-element simulation */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 16, padding: 1.5, background: PERF_GRAD, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none" }} />

        {/* PERFORMANCE badge */}
        <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, fontWeight: 600, letterSpacing: ".08em", color: "#06B6D4", background: "rgba(6,182,212,.12)", border: "1px solid rgba(6,182,212,.3)", borderRadius: 100, padding: "2px 8px", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          ⚡ PERFORMANCE
        </div>

        {/* Lock icon when locked */}
        {!unlocked && (
          <div style={{ position: "absolute", top: 10, left: 10, fontSize: 11, color: "#64748B" }}>🔒</div>
        )}

        <div style={{ fontSize: 28, marginBottom: 10 }}>🏆</div>
        <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: unlocked ? "#C4B5FD" : T.muted, marginBottom: 5, letterSpacing: "-.01em" }}>
          Prepare for Upcoming Sports Event
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.55 }}>
          {unlocked
            ? "Competition prep protocol with periodized training, race-day strategy & tier-based supplement pack"
            : "Upload blood test + connect wearable to unlock"}
        </div>
        {unlocked && (
          <div style={{ fontSize: 10, color: "#2DD4BF", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, marginTop: 8 }}>
            Periodized timeline · Tier-based stack · Race-week protocol
          </div>
        )}
      </button>

      {/* Inline tooltip when locked */}
      {showTooltip && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1E293B", border: "1px solid rgba(99,102,241,.3)", borderRadius: 10, padding: "8px 14px", fontSize: 11, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap", zIndex: 10, animation: "fadeUp .2s ease both", boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>
          Upload your blood test and connect a wearable to unlock this
        </div>
      )}
    </div>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({
  g, isSelected, maxed, onToggle,
}: {
  g: typeof GOALS[number];
  isSelected: boolean;
  maxed: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bg     = isSelected ? "rgba(99,102,241,.14)" : hovered && !maxed ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.03)";
  const border = isSelected ? "1.5px solid rgba(99,102,241,.5)" : hovered && !maxed ? "1px solid rgba(99,102,241,.3)" : "1px solid rgba(255,255,255,.08)";
  const shadow = isSelected
    ? "0 0 18px rgba(99,102,241,.15), inset 0 0 0 1px rgba(99,102,241,.1)"
    : hovered && !maxed ? "0 4px 16px rgba(99,102,241,.1)" : "none";

  return (
    <button
      onClick={onToggle}
      disabled={maxed}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", minHeight: 160, padding: "22px 20px", borderRadius: 16, textAlign: "left",
        cursor: maxed ? "not-allowed" : "pointer",
        opacity: maxed ? 0.4 : 1,
        transition: "all .2s",
        background: bg,
        border,
        boxShadow: shadow,
        transform: hovered && !maxed && !isSelected ? "translateY(-1px)" : "none",
        position: "relative", overflow: "hidden",
        outline: "none",
      }}
    >
      {/* Social proof badge — top left */}
      {g.badge && (
        <div style={{ position: "absolute", top: 10, left: 10, fontSize: 9, fontWeight: 500, letterSpacing: ".04em", color: "#FCD34D", background: "rgba(245,158,11,.13)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 100, padding: "2px 8px", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          {g.badge}
        </div>
      )}

      {/* Selected checkmark — top right */}
      {isSelected && (
        <div style={{ position: "absolute", top: 12, right: 12, width: 18, height: 18, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>✓</div>
      )}

      <div style={{ fontSize: 28, marginBottom: 10, marginTop: g.badge ? 18 : 0 }}>{g.icon}</div>
      <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: isSelected ? "#C4B5FD" : T.text, marginBottom: 5, letterSpacing: "-.01em" }}>{g.label}</div>
      <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.55 }}>{g.desc}</div>
    </button>
  );
}

// ── Main client component ──────────────────────────────────────────────���──────
export function GoalsClient({ hasUploads }: { hasUploads: boolean; hasWearables?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase]       = useState<"select" | "generating">("select");
  const sportsUnlocked = hasUploads;

  function toggleGoal(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= MAX_GOALS) { toast.error(`Maximum ${MAX_GOALS} goals`); return prev; }
      return [...prev, id];
    });
  }

  async function handleContinue() {
    if (selected.length === 0) return;
    try {
      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: selected }),
      });
    } catch {
      toast.error("Failed to save goals");
      return;
    }
    console.log("[analytics] goals_selected", { goals: selected });
    setPhase("generating");
  }

  function handleProtocolReady(protocolId: string) {
    router.push(`/app/results/${protocolId}`);
  }

  const ctaSubtext = selected.length > 0
    ? selected.map((id) => GOALS.find((g) => g.id === id)?.label).join(", ")
    : null;

  const counterLabel =
    selected.length === 0 ? "Choose up to 3 goals" :
    selected.length === 1 ? "You can add 2 more" :
    selected.length === 2 ? "You can add 1 more" :
    "Maximum selected — ready to build";

  return (
    <>
      {phase === "generating" && <GenerationScreen onComplete={handleProtocolReady} />}

      <div className="px-4 lg:px-8" style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>⬡ Step 3 — Goals</div>
          <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(24px,4vw,42px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 10 }}>
            What do you want to<br /><span style={GT}>optimise</span>
          </h1>
          <p style={{ fontSize: 14, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.7 }}>
            Choose up to 3 goals. Your protocol will be built around these priorities.
          </p>
        </div>

        {/* Selection counter — filled dot tracker */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: "50%",
                background: i < selected.length ? GRAD : "rgba(255,255,255,.12)",
                transition: "all .3s",
                transform: i < selected.length ? "scale(1.15)" : "scale(1)",
                boxShadow: i < selected.length ? "0 0 8px rgba(99,102,241,.5)" : "none",
              }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: selected.length === MAX_GOALS ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "color .2s" }}>
            {counterLabel}
          </span>
        </div>

        {/* Goal cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginBottom: 40 }}>
          {/* Sports prep tile */}
          <SportsTile unlocked={sportsUnlocked} />

          {/* Standard goal tiles */}
          {GOALS.map((g) => {
            const isSelected = selected.includes(g.id);
            const maxed      = !isSelected && selected.length >= MAX_GOALS;
            return (
              <GoalCard
                key={g.id}
                g={g}
                isSelected={isSelected}
                maxed={maxed}
                onToggle={() => toggleGoal(g.id)}
              />
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ position: "sticky", bottom: 0, padding: "16px 0", background: "linear-gradient(0deg,#06080F 70%,transparent)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingBottom: "max(16px,env(safe-area-inset-bottom))" }}>
          {ctaSubtext && (
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              Based on: {ctaSubtext}
            </div>
          )}
          <button
            className="cta"
            style={{ width: "100%", maxWidth: 400, opacity: selected.length > 0 ? 1 : 0.4, cursor: selected.length > 0 ? "pointer" : "default", outline: "none", border: "none" }}
            disabled={selected.length === 0}
            onClick={handleContinue}>
            {selected.length === 0 ? "Select at least 1 goal" : "Build my protocol →"}
          </button>
        </div>
      </div>
    </>
  );
}
