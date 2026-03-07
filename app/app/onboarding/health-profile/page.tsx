/// app/app/onboarding/health-profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const GRAD      = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const PERF_GRAD = "linear-gradient(135deg,#7C3AED,#06B6D4)";
const T         = { text: "#F1F5F9", muted: "#64748B" };
const STORAGE_KEY = "bz_health_profile_v1";
const TOTAL_STEPS = 3;

// ── Types ──────────────────────────────────────────────────────────────────────
interface FormState {
  biologicalSex:      string;
  heightFt:           number;
  heightIn:           number;
  weightLbs:          number;
  activityLevel:      string;
  athleteArchetype:   string;
  healthGoals:        string[];
  conditions:         string[];
  currentMedications: string;
  currentSupplements: string;
}

const DEFAULTS: FormState = {
  biologicalSex:      "",
  heightFt:           5,
  heightIn:           8,
  weightLbs:          160,
  activityLevel:      "",
  athleteArchetype:   "",
  healthGoals:        [],
  conditions:         [],
  currentMedications: "",
  currentSupplements: "",
};

// ── Option lists ───────────────────────────────────────────────────────────────
const SEX_OPTIONS = [
  { id: "male",   label: "Male" },
  { id: "female", label: "Female" },
  { id: "other",  label: "Prefer not to say" },
];

const ACTIVITY_OPTIONS = [
  { id: "sedentary",   label: "Sedentary",        desc: "Desk job, little exercise" },
  { id: "light",       label: "Lightly Active",    desc: "1–2 workouts/week" },
  { id: "moderate",    label: "Moderately Active", desc: "3–4 workouts/week" },
  { id: "active",      label: "Active",            desc: "5–6 workouts/week" },
  { id: "very_active", label: "Very Active",       desc: "Daily training or physical job" },
];

const ARCHETYPE_OPTIONS = [
  { id: "endurance",       label: "Endurance",       icon: "🏃" },
  { id: "strength",        label: "Strength",         icon: "🏋️" },
  { id: "cycling",         label: "Cycling",          icon: "🚴" },
  { id: "crossfit",        label: "CrossFit / HIIT",  icon: "⚡" },
  { id: "team_sport",      label: "Team Sport",       icon: "⚽" },
  { id: "swimming",        label: "Swimming",         icon: "🏊" },
  { id: "yoga_pilates",    label: "Yoga / Pilates",   icon: "🧘" },
  { id: "recreational",    label: "General Fitness",  icon: "💪" },
];

const HEALTH_GOAL_OPTIONS = [
  { id: "weight_loss",   label: "Weight Loss" },
  { id: "muscle_gain",   label: "Muscle Gain" },
  { id: "longevity",     label: "Longevity" },
  { id: "energy",        label: "Energy & Vitality" },
  { id: "sleep",         label: "Better Sleep" },
  { id: "cognition",     label: "Sharper Thinking" },
  { id: "hormones",      label: "Hormonal Balance" },
  { id: "recovery",      label: "Faster Recovery" },
  { id: "anti_aging",    label: "Anti-Aging" },
  { id: "gut",           label: "Gut Health" },
];

const CONDITION_OPTIONS = [
  { id: "hypertension",   label: "Hypertension" },
  { id: "high_ldl",       label: "High LDL / Cholesterol" },
  { id: "diabetes_t2",    label: "Type 2 Diabetes" },
  { id: "hypothyroid",    label: "Hypothyroid" },
  { id: "anxiety",        label: "Anxiety" },
  { id: "depression",     label: "Depression" },
  { id: "sleep_apnea",    label: "Sleep Apnea" },
  { id: "ibd_ibs",        label: "IBD / IBS" },
  { id: "none",           label: "None" },
];

const STEP_LABELS = ["Physical", "Activity", "Health Context"];

// ── Helpers ────────────────────────────────────────────────────────────────────
function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54 * 10) / 10;
}
function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.4536 * 10) / 10;
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Chip({
  label, selected, onClick, icon,
}: { label: string; selected: boolean; onClick: () => void; icon?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px", borderRadius: 100, fontSize: 12,
        fontFamily: "var(--font-ui,'Inter',sans-serif)",
        cursor: "pointer", transition: "all .15s", outline: "none",
        background: selected ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
        border: selected ? "1.5px solid rgba(99,102,241,.6)" : "1px solid rgba(255,255,255,.1)",
        color: selected ? "#C4B5FD" : T.muted,
        fontWeight: selected ? 500 : 400,
      }}
    >
      {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: ".1em", color: "#A78BFA", textTransform: "uppercase" as const, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 10 }}>
      {children}
    </p>
  );
}

// ── Step 0 — Physical metrics ──────────────────────────────────────────────────
function Step0({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <p style={{ fontSize: 11, letterSpacing: ".1em", color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 8 }}>👤 Physical</p>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          Your physical profile
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Used to personalise dosing recommendations and body-composition targets.
        </p>
      </div>

      {/* Biological sex */}
      <div>
        <SectionLabel>Biological sex</SectionLabel>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          {SEX_OPTIONS.map((o) => (
            <Chip key={o.id} label={o.label} selected={form.biologicalSex === o.id} onClick={() => update({ biologicalSex: o.id })} />
          ))}
        </div>
      </div>

      {/* Height */}
      <div>
        <SectionLabel>Height</SectionLabel>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={form.heightFt}
            onChange={(e) => update({ heightFt: parseInt(e.target.value) })}
            style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: T.text, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none", cursor: "pointer" }}
          >
            {[3, 4, 5, 6, 7].map((f) => <option key={f} value={f}>{f} ft</option>)}
          </select>
          <select
            value={form.heightIn}
            onChange={(e) => update({ heightIn: parseInt(e.target.value) })}
            style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: T.text, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none", cursor: "pointer" }}
          >
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i} in</option>)}
          </select>
          <span style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            ({ftInToCm(form.heightFt, form.heightIn)} cm)
          </span>
        </div>
      </div>

      {/* Weight */}
      <div>
        <SectionLabel>Weight</SectionLabel>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(28px,5vw,40px)", letterSpacing: "-.03em", background: PERF_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {form.weightLbs} lbs
          </span>
          <span style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginLeft: 8 }}>({lbsToKg(form.weightLbs)} kg)</span>
        </div>
        <input
          type="range" min={80} max={400} step={1} value={form.weightLbs}
          onChange={(e) => update({ weightLbs: parseInt(e.target.value) })}
          style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer", height: 6 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>80 lbs</span>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>400 lbs</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 1 — Activity & archetype ──────────────────────────────────────────────
function Step1({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  function toggleGoal(id: string) {
    update({
      healthGoals: form.healthGoals.includes(id)
        ? form.healthGoals.filter((g) => g !== id)
        : form.healthGoals.length < 4 ? [...form.healthGoals, id] : form.healthGoals,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <p style={{ fontSize: 11, letterSpacing: ".1em", color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 8 }}>💪 Activity</p>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          Activity & goals
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Used to calibrate training load recommendations and energy targets.
        </p>
      </div>

      {/* Activity level */}
      <div>
        <SectionLabel>Activity level</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ACTIVITY_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => update({ activityLevel: o.id })}
              style={{
                padding: "12px 16px", borderRadius: 12, textAlign: "left" as const, cursor: "pointer", outline: "none",
                background: form.activityLevel === o.id ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.03)",
                border: form.activityLevel === o.id ? "1.5px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.08)",
                transition: "all .15s",
              }}
            >
              <div style={{ fontSize: 13, color: form.activityLevel === o.id ? "#C4B5FD" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, marginBottom: 2 }}>{o.label}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{o.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Athlete archetype */}
      <div>
        <SectionLabel>Training focus</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {ARCHETYPE_OPTIONS.map((o) => (
            <Chip key={o.id} label={o.label} icon={o.icon} selected={form.athleteArchetype === o.id} onClick={() => update({ athleteArchetype: o.id })} />
          ))}
        </div>
      </div>

      {/* Health goals */}
      <div>
        <SectionLabel>Health goals (up to 4)</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {HEALTH_GOAL_OPTIONS.map((o) => (
            <Chip
              key={o.id} label={o.label}
              selected={form.healthGoals.includes(o.id)}
              onClick={() => toggleGoal(o.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Health context ────────────────────────────────────────────────────
function Step2({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  function toggleCondition(id: string) {
    if (id === "none") { update({ conditions: ["none"] }); return; }
    const without = form.conditions.filter((c) => c !== "none");
    update({
      conditions: without.includes(id)
        ? without.filter((c) => c !== id)
        : [...without, id],
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <p style={{ fontSize: 11, letterSpacing: ".1em", color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 8 }}>🩺 Health Context</p>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          Medical & supplement context
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Keeps recommendations safe. All data stays private and is never shared.
        </p>
      </div>

      {/* Conditions */}
      <div>
        <SectionLabel>Known conditions</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {CONDITION_OPTIONS.map((o) => (
            <Chip key={o.id} label={o.label} selected={form.conditions.includes(o.id)} onClick={() => toggleCondition(o.id)} />
          ))}
        </div>
      </div>

      {/* Medications */}
      <div>
        <SectionLabel>Current medications</SectionLabel>
        <textarea
          value={form.currentMedications}
          onChange={(e) => update({ currentMedications: e.target.value })}
          placeholder="e.g. Metformin 500mg, Lisinopril 10mg — or leave blank"
          rows={3}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12, resize: "vertical" as const,
            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
            color: T.text, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)",
            outline: "none", lineHeight: 1.6, boxSizing: "border-box" as const,
          }}
        />
      </div>

      {/* Supplements */}
      <div>
        <SectionLabel>Current supplements</SectionLabel>
        <textarea
          value={form.currentSupplements}
          onChange={(e) => update({ currentSupplements: e.target.value })}
          placeholder="e.g. Vitamin D3 5000IU, Magnesium Glycinate 400mg — or leave blank"
          rows={3}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12, resize: "vertical" as const,
            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
            color: T.text, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)",
            outline: "none", lineHeight: 1.6, boxSizing: "border-box" as const,
          }}
        />
        <p style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 6 }}>
          Used to prevent duplicate recommendations and flag interactions.
        </p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HealthProfilePage() {
  const router  = useRouter();
  const [step,  setStep]    = useState(0);
  const [form,  setForm]    = useState<FormState>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { step: s, form: f } = JSON.parse(saved);
        if (typeof s === "number") setStep(s);
        if (f) setForm((prev) => ({ ...prev, ...f }));
      }
    } catch { /* silent */ }
  }, []);

  // Persist on every change
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, form })); } catch { /* silent */ }
  }, [step, form]);

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function canAdvance(): boolean {
    if (step === 0) return !!form.biologicalSex;
    if (step === 1) return !!form.activityLevel;
    return true; // step 2 is all optional
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biologicalSex:      form.biologicalSex,
          heightCm:           ftInToCm(form.heightFt, form.heightIn),
          weightKg:           lbsToKg(form.weightLbs),
          activityLevel:      form.activityLevel,
          athleteArchetype:   form.athleteArchetype || null,
          healthGoals:        form.healthGoals,
          conditions:         form.conditions,
          currentMedications: form.currentMedications.trim(),
          currentSupplements: form.currentSupplements.trim(),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success("Health profile saved");
      router.push("/app/profile");
    } catch {
      toast.error("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else handleSubmit();
  }

  const ok = canAdvance();

  return (
    <div style={{ minHeight: "100dvh", background: "#06080F", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 40% at 50% 0%,rgba(99,102,241,.07) 0%,transparent 70%)" }} />

      <div style={{ position: "relative", maxWidth: 540, margin: "0 auto", padding: "40px 20px 120px" }}>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          {STEP_LABELS.map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 600,
                  fontFamily: "var(--font-ui,'Inter',sans-serif)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < step ? GRAD : i === step ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.06)",
                  color: i <= step ? (i < step ? "#fff" : "#A5B4FC") : T.muted,
                  border: i === step ? "1px solid rgba(99,102,241,.5)" : "none",
                  transition: "all .3s",
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i === step ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", display: i === step ? "inline" : "none" }}>
                  {label}
                </span>
              </div>
              {i < TOTAL_STEPS - 1 && (
                <div style={{ width: 20, height: 1, background: i < step ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)", transition: "background .3s" }} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && <Step0 form={form} update={update} />}
        {step === 1 && <Step1 form={form} update={update} />}
        {step === 2 && <Step2 form={form} update={update} />}

        {/* Back + CTA */}
        <div style={{ position: "sticky", bottom: 0, padding: "16px 0", background: "linear-gradient(0deg,#06080F 70%,transparent)", paddingBottom: "max(16px,env(safe-area-inset-bottom))", display: "flex", gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              style={{ padding: "14px 20px", borderRadius: 14, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", background: "rgba(255,255,255,.05)", color: T.muted, border: "1px solid rgba(255,255,255,.1)", outline: "none", flexShrink: 0 }}
            >
              ←
            </button>
          )}
          <button
            disabled={!ok || saving}
            onClick={handleNext}
            style={{
              flex: 1, padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 500,
              cursor: ok && !saving ? "pointer" : "default",
              fontFamily: "var(--font-ui,'Inter',sans-serif)",
              background: ok ? PERF_GRAD : "rgba(255,255,255,.06)",
              color: ok ? "#fff" : T.muted, border: "none", outline: "none",
              opacity: saving ? 0.7 : 1, transition: "all .2s",
            }}
          >
            {saving ? "Saving…" : step === TOTAL_STEPS - 1 ? "Save health profile →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
