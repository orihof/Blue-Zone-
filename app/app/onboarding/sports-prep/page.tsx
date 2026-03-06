/// app/app/onboarding/sports-prep/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type SportsPrepFormData, getBudgetTier, BUDGET_TIERS, RACE_DISTANCES, RACE_DISTANCE_LABELS } from "@/lib/db/sports-payload";

const PERF_GRAD = "linear-gradient(135deg,#7C3AED,#06B6D4)";
const T         = { text: "#F1F5F9", muted: "#64748B" };
const STORAGE_KEY = "bz_sports_prep_v1";

// ── Types ──────────────────────────────────────────────────────────────────────
const COMPETITION_TYPES = [
  { id: "triathlon",   label: "Triathlon",               icon: "🏊" },
  { id: "running_race", label: "Running Race",             icon: "🏃" },
  { id: "cycling",     label: "Cycling Event",            icon: "🚴" },
  { id: "mma",         label: "MMA Competition",          icon: "🥊" },
  { id: "ski_racing",  label: "Alpine Ski Racing",        icon: "⛷️" },
  { id: "swimming",    label: "Swimming Competition",     icon: "🏊" },
  { id: "golf",        label: "Golf Tournament",          icon: "⛳" },
] as const;

const INJURY_OPTIONS   = ["Knee", "Achilles", "Ankle", "Back", "Shoulder", "Hip", "None"];
const CONDITION_OPTIONS= ["Hypertension", "High LDL", "Diabetes", "Sleep Apnea", "None"];

const EMPTY_FORM: SportsPrepFormData = {
  competitionType:    "",
  eventDate:          "",
  weeksToEvent:       0,
  priorityOutcome:    "",
  age:                0,
  gender:             "",
  experienceLevel:    "",
  currentInjuries:    [],
  knownConditions:    [],
  medications:        "",
  stimulantTolerance: "",
  budgetValue:        500,
  budgetTier:         1,
  raceDistance:       "half_marathon",
};

// ── Shared button primitives ───────────────────────────────────────────────────
function SelectCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", padding: "18px 20px", borderRadius: 14, textAlign: "left", cursor: "pointer", transition: "all .18s",
        background: selected ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.03)",
        border: selected ? "1.5px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.08)",
        boxShadow: selected ? "0 0 14px rgba(99,102,241,.15)" : "none" }}>
      {children}
    </button>
  );
}

function OptionPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ padding: "10px 18px", borderRadius: 100, fontSize: 13, cursor: "pointer", transition: "all .15s", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300,
        background: selected ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
        border: selected ? "1.5px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.08)",
        color: selected ? "#A5B4FC" : T.muted }}>
      {children}
    </button>
  );
}

function MultiChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ padding: "8px 16px", borderRadius: 100, fontSize: 12, cursor: "pointer", transition: "all .15s", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300,
        background: selected ? "rgba(6,182,212,.12)" : "rgba(255,255,255,.04)",
        border: selected ? "1px solid rgba(6,182,212,.4)" : "1px solid rgba(255,255,255,.08)",
        color: selected ? "#06B6D4" : T.muted }}>
      {children}
    </button>
  );
}

// ── Step 1 — Competition Type ──────────────────────────────────────────────────
function Step1({ form, update }: { form: SportsPrepFormData; update: (p: Partial<SportsPrepFormData>) => void }) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 8, letterSpacing: "-.02em" }}>
        What competition are you preparing for?
      </h2>
      <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 28 }}>Select one to tailor your protocol.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
        {COMPETITION_TYPES.map((c) => (
          <SelectCard key={c.id} selected={form.competitionType === c.id}
            onClick={() => update({ competitionType: c.id, ...(c.id !== "running_race" ? { raceDistance: undefined } : {}) })}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 14, color: form.competitionType === c.id ? "#C4B5FD" : T.text }}>{c.label}</div>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

// ── Distance Slider (Running Race only) ───────────────────────────────────────
// THUMB_W must match the native rendered thumb width (20px on Chrome/Safari macOS).
// The correction formula shifts each position by half a thumb-width so labels align
// under the knob center rather than its left edge.
const THUMB_W = 20; // px

function thumbLeft(index: number): string {
  const pct = index / (RACE_DISTANCES.length - 1); // 0 → 1
  return `calc(${pct * 100}% - ${pct * THUMB_W}px + ${THUMB_W / 2}px)`;
}

function DistanceSlider({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const currentIdx = Math.max(0, RACE_DISTANCES.indexOf((value ?? "half_marathon") as typeof RACE_DISTANCES[number]));
  return (
    <div style={{ paddingTop: 16, paddingBottom: 16 }}>
      <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 12 }}>
        Distance *
      </label>

      {/* Selected label — tracks knob center; 56px container + 24px margin = 80px clearance above track */}
      <div style={{ position: "relative", height: 56, marginBottom: 24 }}>
        <span style={{
          position: "absolute",
          left: thumbLeft(currentIdx),
          transform: "translateX(-50%)",
          transition: "left .1s ease",
          fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300,
          fontSize: "clamp(28px,5vw,42px)", letterSpacing: ".06em",
          background: PERF_GRAD, WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent", backgroundClip: "text",
          whiteSpace: "nowrap",
        }}>
          {RACE_DISTANCE_LABELS[RACE_DISTANCES[currentIdx]]}
        </span>
      </div>

      <input
        type="range" min={0} max={4} step={1} value={currentIdx}
        onChange={(e) => onChange(RACE_DISTANCES[parseInt(e.target.value)])}
        style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer", height: 6, touchAction: "none", display: "block" }}
      />

      {/* Tick labels — 12px below track */}
      <div style={{ position: "relative", height: 22, marginTop: 12 }}>
        {RACE_DISTANCES.map((d, i) => (
          <span key={d} style={{
            position: "absolute",
            left: thumbLeft(i),
            transform: "translateX(-50%)",
            fontSize: 9, whiteSpace: "nowrap",
            color: RACE_DISTANCES[currentIdx] === d ? "#A5B4FC" : T.muted,
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            fontWeight: RACE_DISTANCES[currentIdx] === d ? 400 : 300,
            lineHeight: 1.2,
          }}>
            {RACE_DISTANCE_LABELS[d]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Step 2 — Event Details ─────────────────────────────────────────────────────
function Step2({ form, update }: { form: SportsPrepFormData; update: (p: Partial<SportsPrepFormData>) => void }) {
  const today = new Date();
  const minDate = new Date(today.getTime() + 86400000).toISOString().split("T")[0];
  const closeEvent = form.eventDate && Math.round((new Date(form.eventDate).getTime() - today.getTime()) / (7 * 86400000)) < 2;

  function handleDateChange(val: string) {
    const weeks = val ? Math.max(0, Math.round((new Date(val).getTime() - today.getTime()) / (7 * 86400000))) : 0;
    update({ eventDate: val, weeksToEvent: weeks });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 8, letterSpacing: "-.02em" }}>Tell us about your event</h2>
      </div>

      {/* Event date */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>Event Date *</label>
        <input type="date" min={minDate} value={form.eventDate} onChange={(e) => handleDateChange(e.target.value)}
          style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none", colorScheme: "dark" }} />
        {form.eventDate && form.weeksToEvent > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            {form.weeksToEvent} weeks to event
          </div>
        )}
        {closeEvent && (
          <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", fontSize: 11, color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            ⚡ Your event is very close — your protocol will focus on taper and race-week preparation.
          </div>
        )}
      </div>

      {/* Distance slider — Running Race only */}
      {form.competitionType === "running_race" && (
        <DistanceSlider
          value={form.raceDistance}
          onChange={(v) => update({ raceDistance: v })}
        />
      )}

      {/* Priority outcome */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>What&apos;s your main goal for this event? *</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { id: "pr_podium",    label: "PR / Podium Push",          sub: "I'm going for my best result" },
            { id: "finish_strong",label: "Finish Strong",             sub: "I want to complete it feeling good" },
            { id: "injury_free",  label: "Injury-Free Comeback",      sub: "I'm returning after time off or injury" },
          ].map((o) => (
            <SelectCard key={o.id} selected={form.priorityOutcome === o.id} onClick={() => update({ priorityOutcome: o.id })}>
              <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, fontSize: 13, color: form.priorityOutcome === o.id ? "#C4B5FD" : T.text }}>{o.label}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{o.sub}</div>
            </SelectCard>
          ))}
        </div>
      </div>

      {/* Age + Gender row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>Your Age *</label>
          <input type="number" min={16} max={80} placeholder="e.g. 42" value={form.age || ""}
            onChange={(e) => update({ age: parseInt(e.target.value) || 0 })}
            style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>Gender *</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {["Male", "Female", "Prefer not to say"].map((g) => (
              <OptionPill key={g} selected={form.gender === g} onClick={() => update({ gender: g })}>{g}</OptionPill>
            ))}
          </div>
        </div>
      </div>

      {/* Experience level */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>Experience Level *</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { id: "first_timer",  label: "First Timer",   sub: "Never done this distance or sport before" },
            { id: "intermediate", label: "Intermediate",  sub: "I've completed this type of event before" },
            { id: "advanced",     label: "Advanced",      sub: "I compete regularly and train structured" },
          ].map((e) => (
            <SelectCard key={e.id} selected={form.experienceLevel === e.id} onClick={() => update({ experienceLevel: e.id })}>
              <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, fontSize: 13, color: form.experienceLevel === e.id ? "#C4B5FD" : T.text }}>{e.label}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{e.sub}</div>
            </SelectCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — Constraints ───────────────────────────────────────────────────────
function Step3({ form, update }: { form: SportsPrepFormData; update: (p: Partial<SportsPrepFormData>) => void }) {
  function toggleMulti(field: "currentInjuries" | "knownConditions", val: string) {
    const current = form[field];
    if (val === "None") { update({ [field]: ["None"] }); return; }
    const withoutNone = current.filter((v) => v !== "None");
    if (withoutNone.includes(val)) update({ [field]: withoutNone.filter((v) => v !== val) });
    else update({ [field]: [...withoutNone, val] });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          Last thing — let&apos;s make this safe and realistic
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>This helps us flag what to avoid and what to discuss with your doctor.</p>
      </div>

      {/* Current injuries */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>Any current or recent injuries?</label>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {INJURY_OPTIONS.map((o) => (
            <MultiChip key={o} selected={form.currentInjuries.includes(o)} onClick={() => toggleMulti("currentInjuries", o)}>{o}</MultiChip>
          ))}
        </div>
      </div>

      {/* Known conditions */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>Any known health conditions?</label>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {CONDITION_OPTIONS.map((o) => (
            <MultiChip key={o} selected={form.knownConditions.includes(o)} onClick={() => toggleMulti("knownConditions", o)}>{o}</MultiChip>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>Current Medications (if any)</label>
        <input type="text" value={form.medications} placeholder="e.g. statins, beta-blockers, metformin — or leave blank"
          onChange={(e) => update({ medications: e.target.value })}
          style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none" }} />
      </div>

      {/* Stimulant tolerance */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>How do you respond to stimulants like caffeine? *</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { id: "low",    label: "Low",    sub: "Sensitive — even small amounts affect me" },
            { id: "medium", label: "Medium", sub: "Normal response to caffeine" },
            { id: "high",   label: "High",   sub: "High tolerance, I use pre-workouts regularly" },
          ].map((s) => (
            <SelectCard key={s.id} selected={form.stimulantTolerance === s.id} onClick={() => update({ stimulantTolerance: s.id })}>
              <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, fontSize: 13, color: form.stimulantTolerance === s.id ? "#C4B5FD" : T.text }}>{s.label}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{s.sub}</div>
            </SelectCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 4 — Budget ────────────────────────────────────────────────────────────
function Step4({ form, update }: { form: SportsPrepFormData; update: (p: Partial<SportsPrepFormData>) => void }) {
  const tier = getBudgetTier(form.budgetValue);
  const tierInfo = BUDGET_TIERS.find((t) => t.tier === tier)!;

  function handleSlider(val: number) {
    update({ budgetValue: val, budgetTier: getBudgetTier(val) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          What&apos;s your budget for this prep?
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Includes supplements, testing, gear, and services.</p>
      </div>

      {/* Budget display */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(36px,6vw,56px)", letterSpacing: "-.03em", background: PERF_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          ${form.budgetValue.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 4 }}>selected budget</div>
      </div>

      {/* Slider */}
      <div>
        <input type="range" min={1} max={20000} step={50} value={form.budgetValue}
          onChange={(e) => handleSlider(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer", height: 6 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>$1</span>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>$20,000</span>
        </div>
      </div>

      {/* Tier info card */}
      <div style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(124,58,237,.08)", border: "1px solid rgba(124,58,237,.25)" }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 6 }}>
          Tier {tier} — {tierInfo.label}
        </div>
        <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, fontSize: 13, color: T.text, marginBottom: 4 }}>{tierInfo.description}</div>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{tierInfo.range}</div>
      </div>

      {/* Tier breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
        {BUDGET_TIERS.map((t) => (
          <div key={t.tier} style={{ padding: "12px 14px", borderRadius: 10, background: t.tier === tier ? "rgba(124,58,237,.1)" : "rgba(255,255,255,.02)", border: `1px solid ${t.tier === tier ? "rgba(124,58,237,.35)" : "rgba(255,255,255,.06)"}`, transition: "all .2s" }}>
            <div style={{ fontSize: 10, color: t.tier === tier ? "#A78BFA" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 3 }}>Tier {t.tier}</div>
            <div style={{ fontSize: 11, color: t.tier === tier ? T.text : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{t.range}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 5 — Loading ───────────────────────────────────────────────────────────
const LOADING_MESSAGE = "Analyzing your biomarker data, wearable metrics, and performance goals";

const LOADING_STEPS = [
  { id: "parse",      label: "Parsing your uploaded files" },
  { id: "biomarkers", label: "Extracting biomarkers and ranges" },
  { id: "wearables",  label: "Aggregating wearable trends (sleep, HRV, load)" },
  { id: "matching",   label: "Matching to event demands" },
  { id: "building",   label: "Building your prep pack" },
] as const;

function useTypewriter(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
      else { setDone(true); clearInterval(interval); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return { displayed, done };
}

function LoopingEllipsis() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(interval);
  }, []);
  return <span style={{ color: "#A78BFA" }}>{dots}</span>;
}

function LoadingScreen({ form, onComplete, onError, preWarmedId }: {
  form: SportsPrepFormData;
  onComplete: (id: string) => void;
  onError: (e: string) => void;
  preWarmedId?: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const startedRef = useRef(false);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const { displayed, done } = useTypewriter(LOADING_MESSAGE);

  // Time-based step advancement — step 0 is active on mount; steps 1–4 advance via timers
  useEffect(() => {
    const timings = [1500, 4000, 7000, 10000];
    const timers = timings.map((delay, i) =>
      setTimeout(() => setCurrentStep((prev) => Math.max(prev, i + 1)), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    function startPolling(id: string) {
      const POLL_INTERVAL_MS = 1500;
      const TIMEOUT_MS       = 120_000;
      const timeoutId = setTimeout(() => {
        clearInterval(pollRef.current!);
        onError("Generation is taking longer than expected. Please try again.");
      }, TIMEOUT_MS);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/sports-prep/status/${id}`);
          if (!res.ok) return; // transient error — keep polling
          const { status, error: errMsg } = await res.json() as { status: string; error: string | null };

          if (status === "ready") {
            clearTimeout(timeoutId);
            clearInterval(pollRef.current!);
            setCurrentStep(LOADING_STEPS.length); // mark all complete
            console.log("[analytics] sports_prep_protocol_generated", { competitionType: form.competitionType, budgetTier: form.budgetTier, weeksToEvent: form.weeksToEvent });
            setTimeout(() => onComplete(id), 600);
          } else if (status === "failed") {
            clearTimeout(timeoutId);
            clearInterval(pollRef.current!);
            onError(errMsg ?? "Protocol generation failed. Please try again.");
          }
        } catch { /* network hiccup — keep polling */ }
      }, POLL_INTERVAL_MS);
    }

    if (preWarmedId) {
      // Pre-warm hit — Claude is already running, skip the POST entirely
      console.log("[sports-prep] pre-warm hit, skipping POST for id:", preWarmedId);
      startPolling(preWarmedId);
    } else {
      // Normal flow — POST first, then poll
      fetch("/api/sports-prep/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            throw new Error((body as { error?: string }).error ?? `Server error ${r.status}`);
          }
          return r.json() as Promise<{ sportsPrepId: string }>;
        })
        .then(({ sportsPrepId }) => startPolling(sportsPrepId))
        .catch((err) => onError(err instanceof Error ? err.message : "Something went wrong"));
    }

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [form, onComplete, onError, preWarmedId]);

  return (
    <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 50% 40%,rgba(124,58,237,.09) 0%,transparent 70%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 420 }}>

        {/* Icon */}
        <div style={{ width: 60, height: 60, borderRadius: 18, background: PERF_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 0 40px rgba(124,58,237,.45)", animation: "glowPulse 2.2s ease-in-out infinite" }}>🏆</div>

        {/* Heading + typewriter subtext */}
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 10, letterSpacing: "-.02em" }}>
            Preparing your Competition Prep Pack
          </h2>
          <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.6, minHeight: 20 }}>
            {displayed}
            {done ? <LoopingEllipsis /> : <span className="animate-pulse" style={{ color: T.muted }}>|</span>}
          </p>
        </div>

        {/* Step list — replaces horizontal progress bar */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {LOADING_STEPS.map((step, i) => {
            const isDone   = i < currentStep;
            const isActive = i === currentStep && currentStep < LOADING_STEPS.length;
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 16, fontSize: 13, flexShrink: 0, color: isDone ? "#10B981" : isActive ? "#fff" : T.muted, animation: isActive ? "glowPulse 1.2s ease-in-out infinite" : "none" }}>
                  {isDone ? "✓" : isActive ? "→" : "●"}
                </span>
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, color: isDone ? "#10B981" : isActive ? T.text : T.muted }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const STEP_LABELS = ["Competition", "Event Details", "Constraints", "Budget"];
const TOTAL_STEPS = 4;

export default function SportsPrepPage() {
  const router = useRouter();
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState<SportsPrepFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-warm refs — store the result of the early generate call
  const preWarmRef         = useRef<{ sportsPrepId: string; budgetTier: number } | null>(null);
  const lastPreWarmTierRef = useRef<number | null>(null);

  // Restore from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { step: s, form: f } = JSON.parse(saved);
        if (s != null) setStep(s);
        if (f != null) setForm(f);
      }
    } catch { /* silent */ }
  }, []);

  // Persist to sessionStorage on every change
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, form })); } catch { /* silent */ }
  }, [step, form]);

  // Pre-warm: fire the generate call as soon as the user reaches the budget step (step 3).
  // By the time they click "Generate", Claude may already be running or done.
  // Re-fires only when the budget tier changes — not on every slider tick.
  useEffect(() => {
    if (step !== 3) return;
    if (lastPreWarmTierRef.current === form.budgetTier) return;

    lastPreWarmTierRef.current = form.budgetTier;
    preWarmRef.current = null; // invalidate any result from a previous tier

    const snapshot      = { ...form };
    const capturedTier  = form.budgetTier;

    fetch("/api/sports-prep/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    })
      .then(async (r) => {
        if (!r.ok) return; // silent — LoadingScreen will fire its own POST if needed
        const data = await r.json() as { sportsPrepId?: string };
        if (data.sportsPrepId && lastPreWarmTierRef.current === capturedTier) {
          preWarmRef.current = { sportsPrepId: data.sportsPrepId, budgetTier: capturedTier };
          console.log("[sports-prep] pre-warm ready, id:", data.sportsPrepId);
        }
      })
      .catch(() => {}); // silent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.budgetTier]);

  function update(partial: Partial<SportsPrepFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  // Step-specific validation
  function canAdvance(): boolean {
    if (step === 0) return !!form.competitionType;
    if (step === 1) return !!(form.eventDate && form.weeksToEvent > 0 && form.priorityOutcome && form.age >= 16 && form.gender && form.experienceLevel);
    if (step === 2) return !!form.stimulantTolerance;
    if (step === 3) return form.budgetValue > 0;
    return false;
  }

  function handleNext() {
    if (!canAdvance()) return;
    console.log(`[analytics] sports_prep_step_${step + 1}_complete`);
    if (step === TOTAL_STEPS - 1) { setLoading(true); return; }
    setStep((s) => s + 1);
  }

  function handleBack() {
    if (step === 0) { router.push("/app/goals"); return; }
    setStep((s) => s - 1);
  }

  const handleComplete = useCallback((id: string) => {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push(`/app/results/sports/${id}`);
  }, [router]);

  const handleError = useCallback((msg: string) => {
    setLoading(false);
    setError(msg);
    toast.error(msg);
  }, []);

  if (loading) {
    const preWarmedId = preWarmRef.current?.budgetTier === form.budgetTier
      ? preWarmRef.current?.sportsPrepId
      : undefined;
    return (
      <div style={{ minHeight: "100vh", background: "#06080F", position: "relative" }}>
        <LoadingScreen form={form} onComplete={handleComplete} onError={handleError} preWarmedId={preWarmedId} />
        {error && (
          <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 12, padding: "14px 20px", display: "flex", gap: 12, alignItems: "center", zIndex: 200 }}>
            <span style={{ fontSize: 13, color: "#FCA5A5", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{error}</span>
            <button onClick={() => { setError(null); setLoading(false); }}
              style={{ fontSize: 11, color: "#A5B4FC", background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={handleBack} style={{ background: "transparent", border: "none", color: T.muted, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </button>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Step {step + 1} of {TOTAL_STEPS} — {STEP_LABELS[step]}
          </span>
          <div style={{ width: 48 }} />
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", background: PERF_GRAD, borderRadius: 99, width: `${((step + 1) / TOTAL_STEPS) * 100}%`, transition: "width .4s cubic-bezier(.16,1,.3,1)" }} />
        </div>
      </div>

      {/* Eyebrow */}
      <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#7C3AED", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <span>⚡</span> Competition Prep
      </div>

      {/* Step content */}
      <div style={{ animation: "fadeUp .3s ease both" }} key={step}>
        {step === 0 && <Step1 form={form} update={update} />}
        {step === 1 && <Step2 form={form} update={update} />}
        {step === 2 && <Step3 form={form} update={update} />}
        {step === 3 && <Step4 form={form} update={update} />}
      </div>

      {/* Sticky CTA */}
      <div style={{ position: "sticky", bottom: 0, padding: "20px 0 8px", background: "linear-gradient(0deg,#06080F 70%,transparent)" }}>
        <button
          onClick={handleNext}
          disabled={!canAdvance()}
          style={{ width: "100%", padding: "16px 28px", borderRadius: 12, fontSize: 15, fontWeight: 400, cursor: canAdvance() ? "pointer" : "default", border: "none", transition: "all .18s", fontFamily: "var(--font-ui,'Inter',sans-serif)",
            background: canAdvance() ? PERF_GRAD : "rgba(255,255,255,.06)",
            color: canAdvance() ? "#fff" : T.muted,
            opacity: canAdvance() ? 1 : 0.5,
            boxShadow: canAdvance() ? "0 0 24px rgba(124,58,237,0.35)" : "none" }}>
          {step === TOTAL_STEPS - 1 ? "Generate My Competition Pack →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
