/// app/app/onboarding/page.tsx
// Multi-step onboarding orchestrator.
// Steps: 0 Welcome → 1 Data Sharing → 2 Goals → 3 Profile → 4 Upload → 5 Connect → 6 Analysis
// Handles OAuth redirect-backs via ?step=N&whoop=connected / ?step=N&oura=connected.
"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { toast } from "sonner";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";
import { ConsentOnboardingModal } from "@/components/consent/ConsentOnboardingModal";
import { WearablesClient } from "@/app/app/wearables/_client";
import { OnboardingSkeleton } from "@/components/onboarding/OnboardingSkeleton";

// ── Constants ─────────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";

const DB_STEP_MAP: Record<string, number> = {
  name:          0,
  consent:       1,
  goal:          2,
  personal_info: 3,
  upload:        4,
  wearables:     5,
  analysis:      6,
  done:          7,
  data:          7,
};
const GT   = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T    = { text: "#F1F5F9", muted: "#64748B" };

const STEP_LABELS = ["Welcome", "Data Sharing", "Goals", "Profile", "Upload", "Connect", "Analysis"];

// ── Storage helpers (survive OAuth redirects) ─────────────────────────────────
const SS_KEY = "bz_onboarding_v2";
interface SavedState {
  name: string;
  goals: Goal[];
  primaryGoal: string;
  age: number;
  gender: string;
  currentInjuries: string[];
  healthConditions: string[];
  medications: string[];
  budget: BudgetTier;
  preferences: Preferences;
  uploadData: { storagePath: string; fileName: string } | null;
}
function loadSaved(): SavedState | null {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "null"); } catch { return null; }
}
function saveSaved(s: SavedState) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Goal card definitions ─────────────────────────────────────────────────────
interface GoalCard {
  id: string;
  label: string;
  description: string;
  icon: string;
  goals: Goal[];
  accent: string;
  accentBorder: string;
}

const GOAL_CARDS: GoalCard[] = [
  {
    id:          "sports_competition",
    label:       "Prepare for a sports competition",
    description: "Phase-based protocol built around your race date, sport & injury profile",
    icon:        "🏆",
    goals:       ["energy", "strength", "recovery"],
    accent:      "rgba(124,58,237,.12)",
    accentBorder: "rgba(124,58,237,.40)",
  },
  {
    id:          "longevity",
    label:       "Optimize my longevity",
    description: "Slow your biological clock with evidence-based protocols across all health pillars",
    icon:        "⬡",
    goals:       ["longevity"],
    accent:      "rgba(59,130,246,.10)",
    accentBorder: "rgba(59,130,246,.35)",
  },
  {
    id:          "performance",
    label:       "Peak performance & energy",
    description: "Maximize daily energy, strength output, and recovery between sessions",
    icon:        "⚡",
    goals:       ["energy", "strength", "recovery"],
    accent:      "rgba(16,185,129,.10)",
    accentBorder: "rgba(16,185,129,.35)",
  },
  {
    id:          "health",
    label:       "Health & wellness",
    description: "Better sleep, sharper focus, balanced hormones — the foundations that drive everything else",
    icon:        "🌙",
    goals:       ["sleep", "focus", "hormones"],
    accent:      "rgba(99,102,241,.10)",
    accentBorder: "rgba(99,102,241,.35)",
  },
];

// ── Step 0: Welcome with name input ──────────────────────────────────────────
function WelcomeStep({ name, setName, onNext }: { name: string; setName: (n: string) => void; onNext: () => void }) {
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/onboarding/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), onboarding_step: "name" }),
      });
      onNext();
    } catch {
      toast.error("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ margin: "0 auto 28px" }}>
        <img src="/Blue-zone-white-full.svg" alt="Blue Zone" style={{ height: 28, width: "auto" }} />
      </div>
      <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4.5vw,38px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 14 }}>
        <span style={{ color: T.text }}>Welcome to</span>{" "}<span style={GT}>Blue Zone</span>
      </h1>
      <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.75, maxWidth: 380, margin: "0 auto 36px", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
        Your longevity intelligence platform. In the next few minutes, we&apos;ll build a protocol grounded in your biology — not generic advice.
      </p>

      {/* Name input */}
      <div className="card" style={{ padding: "24px 28px", marginBottom: 28, textAlign: "left" }}>
        <label style={{ display: "block", fontSize: 14, color: "#94A3B8", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 10, letterSpacing: 0, textTransform: "none" }}>
          First, what&apos;s your name?
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleContinue(); } }}
          placeholder="Your first name"
          autoFocus
          style={{
            width: "100%",
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 16,
            color: T.text,
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            fontWeight: 300,
            outline: "none",
            transition: "border-color .15s",
          }}
        />
      </div>

      <button className="cta" style={{ width: "100%" }} onClick={handleContinue} disabled={!name.trim() || saving}>
        {saving ? "Saving..." : "Let\u2019s begin →"}
      </button>
      <p style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 12 }}>
        ⏱ Takes about 5 minutes
      </p>
    </div>
  );
}

// ── Step 1: Data Sharing / consent ───────────────────────────────────────────
function ConsentStep({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ position: "relative" }}>
      <ConsentOnboardingModal onComplete={onNext} />
    </div>
  );
}

// ── Step 2: Goals (4 cards, single-select) ───────────────────────────────────
function GoalsStep({
  selectedGoal,
  onSelect,
  onNext,
  onSportsPrep,
}: {
  selectedGoal: string;
  onSelect: (id: string) => void;
  onNext: () => void;
  onSportsPrep: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!selectedGoal) return;
    if (selectedGoal === "sports_competition") {
      await fetch("/api/onboarding/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_goal: "sports_competition", onboarding_step: "goal" }),
      });
      onSportsPrep();
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/onboarding/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_goal: selectedGoal, onboarding_step: "goal" }),
      });
      onNext();
    } catch {
      toast.error("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3.5vw,34px)", ...GT, letterSpacing: "-.02em", marginBottom: 10 }}>
          What&apos;s your primary objective?
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Choose one — this shapes everything downstream.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
        {GOAL_CARDS.map((card, i) => {
          const isSelected = selectedGoal === card.id;

          return (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              style={{
                width: "100%",
                padding: "20px 24px",
                borderRadius: 16,
                textAlign: "left",
                cursor: "pointer",
                background: isSelected
                  ? card.accent
                  : i === 0
                    ? "rgba(124,58,237,.04)"
                    : "rgba(255,255,255,.02)",
                border: `1.5px solid ${
                  isSelected
                    ? card.accentBorder
                    : i === 0
                      ? "rgba(124,58,237,.18)"
                      : "rgba(255,255,255,.06)"
                }`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "all .2s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Selection indicator */}
              <div style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: `2px solid ${isSelected ? card.accentBorder : "rgba(255,255,255,.15)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: isSelected ? card.accent : "transparent",
                transition: "all .2s",
              }}>
                {isSelected && (
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: card.accentBorder }} />
                )}
              </div>

              <div style={{ fontSize: 28, flexShrink: 0 }}>{card.icon}</div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14,
                  color: isSelected ? T.text : i === 0 ? "#C4B5FD" : T.text,
                  fontFamily: "var(--font-ui,'Inter',sans-serif)",
                  fontWeight: 500,
                  marginBottom: 3,
                }}>
                  {card.label}
                </div>
                <div style={{
                  fontSize: 12,
                  color: T.muted,
                  fontFamily: "var(--font-ui,'Inter',sans-serif)",
                  fontWeight: 300,
                  lineHeight: 1.5,
                }}>
                  {card.description}
                </div>
              </div>

            </button>
          );
        })}
      </div>

      <button
        className="cta"
        style={{ width: "100%" }}
        onClick={handleContinue}
        disabled={!selectedGoal || saving}
      >
        {saving ? "Saving..." : "Continue →"}
      </button>
      {!selectedGoal && (
        <p style={{ fontSize: 11, color: T.muted, textAlign: "center", marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Select a goal to continue
        </p>
      )}
    </div>
  );
}

// ── Step 3: Personal data ─────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { value: "male",   label: "Male"   },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other"  },
] as const;

const INJURY_OPTIONS = [
  { value: "knee",     label: "Knee"     },
  { value: "shoulder", label: "Shoulder" },
  { value: "back",     label: "Back"     },
  { value: "hip",      label: "Hip"      },
  { value: "ankle",    label: "Ankle"    },
  { value: "wrist",    label: "Wrist"    },
] as const;

const BUDGETS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "low",    label: "Essentials",  desc: "High-impact basics only"  },
  { value: "medium", label: "Optimised",   desc: "Broader protocol coverage" },
  { value: "high",   label: "All-in",      desc: "Full longevity stack"      },
];

const CONDITION_OPTIONS = [
  { value: "hypertension", label: "Hypertension"  },
  { value: "high_ldl",     label: "High LDL"      },
  { value: "diabetes",     label: "Diabetes"       },
  { value: "sleep_apnea",  label: "Sleep Apnea"   },
] as const;

function PersonalDataStep({
  age, setAge,
  gender, setGender,
  currentInjuries, setCurrentInjuries,
  healthConditions, setHealthConditions,
  medications, setMedications,
  budget, setBudget,
  preferences, setPreferences,
  onNext,
}: {
  age: number; setAge: (n: number) => void;
  gender: string; setGender: (s: string) => void;
  currentInjuries: string[]; setCurrentInjuries: (a: string[]) => void;
  healthConditions: string[]; setHealthConditions: (a: string[]) => void;
  medications: string[]; setMedications: (a: string[]) => void;
  budget: BudgetTier; setBudget: (b: BudgetTier) => void;
  preferences: Preferences; setPreferences: (p: Preferences) => void;
  onNext: () => Promise<void>;
}) {
  const [saving, setSaving]   = useState(false);
  const [medInput, setMedInput] = useState("");

  async function handleNext() {
    setSaving(true);
    await onNext();
    setSaving(false);
  }

  function toggleInjury(val: string) {
    setCurrentInjuries(
      currentInjuries.includes(val)
        ? currentInjuries.filter((x) => x !== val)
        : [...currentInjuries, val],
    );
  }

  function toggleCondition(val: string) {
    setHealthConditions(
      healthConditions.includes(val)
        ? healthConditions.filter((x) => x !== val)
        : [...healthConditions, val],
    );
  }

  function addMedication() {
    const trimmed = medInput.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications([...medications, trimmed]);
    }
    setMedInput("");
  }

  function removeMedication(med: string) {
    setMedications(medications.filter((m) => m !== med));
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,32px)", ...GT, letterSpacing: "-.02em", marginBottom: 8 }}>
          Tell us about yourself.
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Used to calibrate your protocol — takes 30 seconds.
        </p>
      </div>

      {/* Age */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Your age</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setAge(Math.max(18, age - 1))} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", color: "#A5B4FC", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 48, ...GT, lineHeight: 1 }}>{age}</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>years old</div>
          </div>
          <button onClick={() => setAge(Math.min(80, age + 1))} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", color: "#A5B4FC", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
        <input type="range" min={18} max={80} value={age} onChange={(e) => setAge(+e.target.value)} style={{ width: "100%", marginTop: 14, accentColor: "#6366F1" }} />
      </div>

      {/* Biological sex */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Biological sex</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {GENDER_OPTIONS.map((g) => {
            const active = gender === g.value;
            return (
              <button
                key={g.value}
                onClick={() => setGender(g.value)}
                style={{ padding: "12px 8px", borderRadius: 10, background: active ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)", border: `1px solid ${active ? "rgba(99,102,241,.45)" : "rgba(255,255,255,.07)"}`, cursor: "pointer", fontSize: 13, color: active ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .15s" }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Injuries */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Current injuries or sensitivities</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setCurrentInjuries([])}
            className={`chip${currentInjuries.length === 0 ? " chip-a" : ""}`}
            style={{ fontSize: 12 }}
          >
            None
          </button>
          {INJURY_OPTIONS.map((inj) => {
            const active = currentInjuries.includes(inj.value);
            return (
              <button
                key={inj.value}
                onClick={() => toggleInjury(inj.value)}
                className={`chip${active ? " chip-a" : ""}`}
                style={{ fontSize: 12 }}
              >
                {inj.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Health conditions */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Known health conditions</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setHealthConditions([])}
            className={`chip${healthConditions.length === 0 ? " chip-a" : ""}`}
            style={{ fontSize: 12 }}
          >
            None
          </button>
          {CONDITION_OPTIONS.map((c) => {
            const active = healthConditions.includes(c.value);
            return (
              <button
                key={c.value}
                onClick={() => toggleCondition(c.value)}
                className={`chip${active ? " chip-a" : ""}`}
                style={{ fontSize: 12 }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Medications */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Current medications <span style={{ textTransform: "none", letterSpacing: 0, color: T.muted }}>(optional)</span></div>
        <div style={{ display: "flex", gap: 8, marginBottom: medications.length > 0 ? 10 : 0 }}>
          <input
            type="text"
            value={medInput}
            onChange={(e) => setMedInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMedication(); } }}
            placeholder="e.g. metformin, lisinopril"
            style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none" }}
          />
          <button
            onClick={addMedication}
            disabled={!medInput.trim()}
            style={{ padding: "9px 14px", borderRadius: 8, background: medInput.trim() ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)", border: `1px solid ${medInput.trim() ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)"}`, color: medInput.trim() ? "#A5B4FC" : T.muted, fontSize: 12, cursor: medInput.trim() ? "pointer" : "not-allowed", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
          >
            Add
          </button>
        </div>
        {medications.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {medications.map((med) => (
              <span key={med} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 100, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.3)", fontSize: 11, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                {med}
                <button onClick={() => removeMedication(med)} style={{ background: "none", border: "none", color: "#6366F1", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Monthly protocol budget</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {BUDGETS.map((b) => {
            const active = budget === b.value;
            return (
              <button
                key={b.value}
                onClick={() => setBudget(b.value)}
                style={{ padding: "12px 8px", borderRadius: 10, background: active ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)", border: `1px solid ${active ? "rgba(99,102,241,.45)" : "rgba(255,255,255,.07)"}`, cursor: "pointer", textAlign: "left", transition: "all .15s" }}
              >
                <div style={{ fontSize: 12, color: active ? "#A5B4FC" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{b.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dietary preferences */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {([["vegan", "🌱 Vegan"], ["caffeineFree", "☕ Caffeine-free"], ["noFishOil", "🐟 No fish oil"]] as [keyof Preferences, string][]).map(([key, label]) => {
          const active = !!preferences[key];
          return (
            <button
              key={key}
              onClick={() => setPreferences({ ...preferences, [key]: !preferences[key] })}
              className={`chip${active ? " chip-a" : ""}`}
              style={{ fontSize: 12 }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button className="cta" style={{ width: "100%" }} onClick={handleNext} disabled={saving || !gender}>
        {saving ? "Saving\u2026" : "Continue →"}
      </button>
      {!gender && (
        <p style={{ fontSize: 11, color: T.muted, textAlign: "center", marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Please select your biological sex to continue
        </p>
      )}
    </div>
  );
}

// ── Step 4: Upload blood tests ────────────────────────────────────────────────
type UploadPhase = "idle" | "uploading" | "success" | "error";

function fmtBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadStep({ onDone }: { onDone: (data: { storagePath: string; fileName: string }) => void }) {
  const [drag,        setDrag]        = useState(false);
  const [phase,       setPhase]       = useState<UploadPhase>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [sizeWarning, setSizeWarning] = useState("");

  const handleFile = useCallback(async (f: File) => {
    setSizeWarning("");
    setErrorMsg("");

    if (!f.name.toLowerCase().endsWith(".pdf") && f.type !== "application/pdf") {
      setErrorMsg("Only PDF files are accepted. Please upload a PDF lab report.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setSizeWarning(`This file is ${fmtBytes(f.size)} — files over 50 MB may take a while.`);
    }

    setUploadedFile(f);
    setPhase("uploading");

    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: f.name, size: f.size, type: f.type }] }),
      });
      if (!signRes.ok) {
        const e = await signRes.json().catch(() => ({}));
        throw new Error((e as Record<string, string>).error ?? "Failed to get upload URL");
      }
      const { files: signedFiles } = await signRes.json() as { files: { signedUrl: string; storagePath: string }[] };
      if (!signedFiles?.[0]) throw new Error("No signed URL returned");
      const { signedUrl, storagePath } = signedFiles[0];

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
        xhr.send(f);
      });

      await fetch("/api/uploads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: f.name, fileSize: f.size, mimeType: f.type }] }),
      });

      setPhase("success");
      setTimeout(() => onDone({ storagePath, fileName: f.name }), 800);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setPhase("error");
    }
  }, [onDone]);

  function resetToIdle() {
    setPhase("idle");
    setUploadedFile(null);
    setSizeWarning("");
    setErrorMsg("");
  }

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3.5vw,36px)", ...GT, marginBottom: 10, letterSpacing: "-.02em" }}>
          Upload your blood tests.
        </h2>
        <p style={{ fontSize: 14, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.7, maxWidth: 400, margin: "0 auto" }}>
          Lab reports, blood panels, DEXA scans, hormone tests. Our AI analyses every biomarker and builds a protocol grounded in your biology.
        </p>
      </div>

      <div className="card" style={{ padding: 8, overflow: "hidden" }}>
        <AnimatePresence mode="wait">

          {phase === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div
                className={`upload-zone${drag ? " drag" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => document.getElementById("bz-file-onboarding")?.click()}
              >
                <input id="bz-file-onboarding" type="file" accept=".pdf" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, color: T.text, marginBottom: 6 }}>
                  Drop your lab report here
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  PDF only · Blood tests, DEXA, hormones, VO₂ max
                </div>
                <button className="cta cta-sm" style={{ pointerEvents: "none" }}>Browse Files</button>
              </div>
              {errorMsg && (
                <p style={{ margin: "10px 12px 4px", fontSize: 12, color: "hsl(var(--destructive))", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  {errorMsg}
                </p>
              )}
            </motion.div>
          )}

          {phase === "uploading" && (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              style={{ padding: "40px 36px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 14, color: T.text, marginBottom: 4 }}>
                {uploadedFile?.name}
              </div>
              {sizeWarning && (
                <p style={{ fontSize: 11, color: "hsl(var(--destructive))", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>
                  {sizeWarning}
                </p>
              )}
              <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: T.muted, marginBottom: 16 }}>
                Uploading…
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  style={{ height: "100%", width: "50%", background: "linear-gradient(90deg, var(--ion-blue, #008AFF), var(--biolum, #00FFB3))", borderRadius: 4 }}
                />
              </div>
            </motion.div>
          )}

          {phase === "success" && (
            <motion.div key="success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ padding: "32px 36px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8, color: "#00b894" }}>✓</div>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: "#00b894", marginBottom: 4 }}>
                Upload complete
              </div>
              <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 2 }}>
                {uploadedFile?.name}
              </div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", marginBottom: 20 }}>
                {uploadedFile ? fmtBytes(uploadedFile.size) : ""}
              </div>
              <button onClick={resetToIdle}
                style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "underline" }}>
                Re-upload
              </button>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              style={{ padding: "32px 36px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "hsl(var(--destructive))", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 16 }}>
                {errorMsg}
              </div>
              <button onClick={resetToIdle} className="cta cta-sm">Try again</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          onClick={() => onDone({ storagePath: "", fileName: "" })}
          style={{ fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "underline" }}
        >
          Skip — I&apos;ll upload later
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24, flexWrap: "wrap" }}>
        {["Grounded in your data", "Updates every check-in", "Clinically referenced"].map((label) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            <span style={{ color: "#6366F1" }}>✓</span>{label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 6: Analysis / processing ─────────────────────────────────────────────
const PROC_STEPS = [
  "Ingesting health data",
  "Parsing uploads & OCR",
  "Normalising wearable metrics",
  "Building biomarker snapshot",
  "Generating personalised protocol",
];
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function FlickerWord({ word }: { word: string }) {
  const [displayed, setDisplayed] = useState(word);
  useEffect(() => {
    let iter = 0;
    const total = word.length * 3;
    const id = setInterval(() => {
      setDisplayed(word.split("").map((ch, i) => (i < Math.floor(iter / 3) ? ch : CHARS[Math.floor(Math.random() * CHARS.length)])).join(""));
      iter++;
      if (iter > total) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);
  return <span style={{ color: "#6366F1", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>{displayed}</span>;
}

function ProcessingStep({
  profile,
  onDone,
}: {
  profile: { age: number; goals: Goal[]; budget: BudgetTier; preferences: Preferences };
  onDone: (protocolId: string) => void | Promise<void>;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0]);
  const [started, setStarted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = Math.round(((currentStep + 1) / PROC_STEPS.length) * 100);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    function advance() {
      setCurrentStep((s) => {
        const next = s < PROC_STEPS.length - 1 ? s + 1 : s;
        if (next !== s) setVisibleSteps((prev) => prev.includes(next) ? prev : [...prev, next]);
        return next;
      });
    }
    intervalRef.current = setInterval(advance, 3200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || started) return;
    setStarted(true);
    (async () => {
      try {
        const res = await fetch("/api/protocols/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedAge:  profile.age,
            goals:        profile.goals,
            budget:       profile.budget,
            preferences:  profile.preferences,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as Record<string,string>).error ?? "Failed to create protocol");
        }
        const { protocolId } = await res.json() as { protocolId: string };
        await new Promise((r) => setTimeout(r, 2000));
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCurrentStep(PROC_STEPS.length - 1);
        setVisibleSteps(PROC_STEPS.map((_, i) => i));
        setTimeout(() => void onDone(protocolId), 1200);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Protocol generation failed");
      }
    })();
  }, [mounted, started, profile, onDone]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 55% 45% at 50% 40%,rgba(99,102,241,.07) 0%,transparent 70%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 400 }}>
        <img src="/Blue-zone-white-full.svg" alt="Blue Zone" style={{ height: 40, width: "auto" }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6 }}>
            Building your <FlickerWord word="PERSONAL" /> protocol
          </h2>
          <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>This usually takes 30–60 seconds</p>
        </div>
        <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", background: GRAD, borderRadius: 99, width: `${progress}%`, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {PROC_STEPS.map((s, i) => {
            if (!visibleSteps.includes(i)) return null;
            const isDone   = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isDone ? 0.6 : 1, transition: "opacity .3s" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: isDone ? "#10B981" : isActive ? "#6366F1" : "rgba(255,255,255,.15)", boxShadow: isActive ? "0 0 8px rgba(99,102,241,.6)" : "none", animation: isActive ? "glowPulse 1.2s ease-in-out infinite" : "none" }} />
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: isDone ? "#10B981" : isActive ? T.text : T.muted, textDecoration: isDone ? "line-through" : "none" }}>
                  {isDone ? "✓ " : isActive ? "→ " : "  "}{s}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
function OnboardingInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const initialStep = Math.max(0, Math.min(6, parseInt(searchParams.get("step") ?? "0", 10)));
  const whoopStatus = searchParams.get("whoop");
  const ouraStatus  = searchParams.get("oura");

  const [step, setStep] = useState(initialStep);
  const [stepResolved, setStepResolved] = useState(false);

  // Form state
  const [userName,         setUserName]         = useState("");
  const [primaryGoal,      setPrimaryGoal]      = useState("");
  const [goals,            setGoals]            = useState<Goal[]>([]);
  const [age,              setAge]              = useState(35);
  const [gender,           setGender]           = useState("");
  const [currentInjuries,  setCurrentInjuries]  = useState<string[]>([]);
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [medications,      setMedications]      = useState<string[]>([]);
  const [budget,           setBudget]           = useState<BudgetTier>("medium");
  const [preferences,      setPreferences]      = useState<Preferences>({ vegan: false, caffeineFree: false, noFishOil: false });
  const [uploadData,       setUploadData]       = useState<{ storagePath: string; fileName: string } | null>(null);

  // OAuth wearable connection state
  const [connected, setConnected] = useState<{ whoop: boolean; oura: boolean }>({
    whoop: whoopStatus === "connected",
    oura:  ouraStatus  === "connected",
  });
  const [extraConnected, setExtraConnected] = useState<string[]>([]);

  const { data: session } = useSession();

  useEffect(() => {
    const googleName = session?.user?.name;
    if (googleName && !userName) {
      setUserName(googleName.split(" ")[0]);
    }
  }, [session]);

  // Resolve correct step from DB on mount
  useEffect(() => {
    const urlStep = parseInt(searchParams.get("step") ?? "", 10);

    fetch("/api/onboarding/profile")
      .then(r => r.ok ? r.json() : null)
      .then((profile: { onboarding_step?: string } | null) => {
        if (!profile) {
          setStepResolved(true);
          return;
        }

        const dbStep = profile.onboarding_step;

        // Fully onboarded users should not be here
        if (dbStep === "done" || dbStep === "data") {
          // Clear stale onboarding data so it doesn't bleed into future sessions
          try { sessionStorage.removeItem(SS_KEY); } catch { /* ignore */ }
          router.replace("/app/dashboard");
          return;
        }

        // URL param takes priority over DB value
        if (!isNaN(urlStep) && urlStep >= 0 && urlStep <= 6) {
          setStep(urlStep);
        } else if (dbStep && DB_STEP_MAP[dbStep] !== undefined) {
          setStep(DB_STEP_MAP[dbStep]);
        }

        // Reset primaryGoal when landing on the goals step to prevent stale pre-selection
        if (dbStep && DB_STEP_MAP[dbStep] === 2) {
          setPrimaryGoal("");
        }

        setStepResolved(true);
      })
      .catch(() => {
        // Non-fatal — default to URL param or 0
        setStepResolved(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch existing wearable connections on mount
  useEffect(() => {
    fetch("/api/wearables/status")
      .then((r) => r.ok ? r.json() : { connections: [] })
      .then((data: { connections: { provider: string }[] }) => {
        const providers = data.connections.map((c) => c.provider);
        if (providers.includes("whoop")) setConnected((p) => ({ ...p, whoop: true }));
        if (providers.includes("oura"))  setConnected((p) => ({ ...p, oura: true }));
        setExtraConnected(providers.filter((p) => p !== "whoop" && p !== "oura"));
      })
      .catch(() => { /* non-fatal */ });
  }, []);

  // Restore sessionStorage on mount (survives OAuth redirects)
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      if (saved.name) setUserName(saved.name);
      // Don't restore primaryGoal on the goals step — prevents stale pre-selection
      if (saved.primaryGoal && initialStep !== 2) setPrimaryGoal(saved.primaryGoal);
      setGoals(saved.goals);
      setAge(saved.age);
      setGender(saved.gender);
      setCurrentInjuries(saved.currentInjuries);
      setHealthConditions(saved.healthConditions ?? []);
      setMedications(saved.medications ?? []);
      setBudget(saved.budget);
      setPreferences(saved.preferences);
      if (saved.uploadData) setUploadData(saved.uploadData);
    }
  }, [initialStep]);

  // Persist to sessionStorage
  useEffect(() => {
    saveSaved({ name: userName, primaryGoal, goals, age, gender, currentInjuries, healthConditions, medications, budget, preferences, uploadData });
  }, [userName, primaryGoal, goals, age, gender, currentInjuries, healthConditions, medications, budget, preferences, uploadData]);

  // Show toast on OAuth result
  useEffect(() => {
    if (whoopStatus === "connected") { toast.success("WHOOP connected!"); setConnected((p) => ({ ...p, whoop: true })); }
    if (whoopStatus === "error")     { toast.error("WHOOP connection failed — try again."); }
    if (ouraStatus  === "connected") { toast.success("Oura Ring connected!"); setConnected((p) => ({ ...p, oura: true })); }
    if (ouraStatus  === "error")     { toast.error("Oura connection failed — try again."); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whoopStatus, ouraStatus]);

  // When a goal card is selected, derive the Goal[] values for protocol generation
  function handleGoalSelect(cardId: string) {
    setPrimaryGoal(cardId);
    const card = GOAL_CARDS.find((c) => c.id === cardId);
    if (card) setGoals(card.goals);
  }

  // Persist profile + mark onboarding_step="data" after step 3
  async function handlePersonalDataNext() {
    await fetch("/api/onboarding/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age,
        gender,
        current_injuries:  currentInjuries,
        health_conditions: healthConditions,
        medications,
        onboarding_step:   "data",
      }),
    });
    setStep(4);
  }

  // Convert internal connected map → WearablesClient prop format
  const wearableConnections = [
    ...(connected.whoop ? [{ provider: "whoop", connectedAt: new Date().toISOString() }] : []),
    ...(connected.oura  ? [{ provider: "oura",  connectedAt: new Date().toISOString() }] : []),
    ...extraConnected.map((p) => ({ provider: p, connectedAt: new Date().toISOString() })),
  ];

  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const nav = document.querySelector("nav");
    if (nav) nav.setAttribute("aria-hidden", "true");
    return () => {
      document.body.style.overflow = "";
      if (nav) nav.removeAttribute("aria-hidden");
    };
  }, []);

  function handleSkip() {
    router.push("/app/dashboard");
  }

  const progressPct = (step / (STEP_LABELS.length - 1)) * 100;

  if (!stepResolved) {
    return <OnboardingSkeleton />;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Profile setup"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--void, #07080e)", overflowY: "auto" }}
      >
      {/* Step progress bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,8,15,.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            {STEP_LABELS.map((label, i) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, background: i < step ? GRAD : i === step ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.06)", color: i < step ? "#fff" : i === step ? "#A5B4FC" : T.muted, border: i === step ? "1px solid rgba(99,102,241,.4)" : "none", transition: "all .3s" }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="onboarding-step-label" style={{ fontSize: 9, color: i === step ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 2, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden", marginTop: 10 }}>
            <div style={{ height: "100%", background: GRAD, borderRadius: 99, width: `${progressPct}%`, transition: "width .5s cubic-bezier(.16,1,.3,1)" }} />
          </div>
        </div>
        <button
          onClick={handleSkip}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 10001,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "#64748B",
            cursor: "pointer",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            transition: "all .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.10)";
            e.currentTarget.style.color = "#F1F5F9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "#64748B";
          }}
          className="onboarding-close-btn"
          aria-label="Exit to dashboard"
        >
          ✕
        </button>
      </div>

      {/* Step content */}
      <div style={{ padding: "40px 20px 120px" }}>
        {step === 0 && <WelcomeStep name={userName} setName={setUserName} onNext={() => setStep(1)} />}
        {step === 1 && <ConsentStep onNext={() => setStep(2)} />}
        {step === 2 && (
          <GoalsStep
            selectedGoal={primaryGoal}
            onSelect={handleGoalSelect}
            onNext={() => setStep(3)}
            onSportsPrep={() => router.push("/app/onboarding/sports-prep?from=onboarding")}
          />
        )}
        {step === 3 && (
          <PersonalDataStep
            age={age}             setAge={setAge}
            gender={gender}       setGender={setGender}
            currentInjuries={currentInjuries} setCurrentInjuries={setCurrentInjuries}
            healthConditions={healthConditions} setHealthConditions={setHealthConditions}
            medications={medications}           setMedications={setMedications}
            budget={budget}       setBudget={setBudget}
            preferences={preferences} setPreferences={setPreferences}
            onNext={handlePersonalDataNext}
          />
        )}
        <div style={{ display: step === 4 ? "block" : "none" }}>
          <UploadStep onDone={(data) => { setUploadData(data); setStep(5); }} />
        </div>
        {step === 5 && (
          <WearablesClient
            connected={wearableConnections}
            isFirstUpload={true}
            lastUploadAt={null}
            onNext={() => setStep(6)}
          />
        )}
        {step === 6 && (
          <ProcessingStep
            profile={{ age, goals, budget, preferences }}
            onDone={async (protocolId) => {
              // Mark onboarding fully complete
              await fetch("/api/onboarding/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ onboarding_step: "done" }),
              }).catch(() => { /* non-fatal */ });
              sessionStorage.removeItem(SS_KEY);
              router.push(`/app/results/${protocolId}`);
            }}
          />
        )}
      </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
