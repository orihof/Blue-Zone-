/// app/app/onboarding/page.tsx
// Multi-step onboarding orchestrator.
// Steps: 0 Privacy → 1 Welcome → 2 Goals → 3 Profile → 4 Upload → 5 Connect → 6 Analysis
// Handles OAuth redirect-backs via ?step=N&whoop=connected / ?step=N&oura=connected.
"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";
import { ConsentOnboardingModal } from "@/components/consent/ConsentOnboardingModal";
import { WearablesClient } from "@/app/app/wearables/_client";

// ── Constants ─────────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT   = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T    = { text: "#F1F5F9", muted: "#64748B" };

const STEP_LABELS = ["Privacy", "Welcome", "Goals", "Profile", "Upload", "Connect", "Analysis"];

// ── Storage helpers (survive OAuth redirects) ─────────────────────────────────
const SS_KEY = "bz_onboarding_v2";
interface SavedState {
  goals: Goal[];
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

// ── Step 0: Privacy / consent ─────────────────────────────────────────────────
function ConsentStep({ onNext }: { onNext: () => void }) {
  return <ConsentOnboardingModal onComplete={onNext} />;
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────
function WelcomeStep({ onNext }: { onNext: () => void }) {
  const ITEMS: [string, string][] = [
    ["🎯", "Choose your primary health goals"],
    ["📋", "Share your health profile"],
    ["🧬", "Upload blood test data"],
    ["⌚", "Connect your wearables"],
    ["⚗️", "Generate your personalised protocol"],
  ];
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 28px", boxShadow: "0 0 40px rgba(99,102,241,.35)" }}>
        ⬡
      </div>
      <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(26px,4.5vw,38px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 14 }}>
        <span style={{ color: T.text }}>Welcome to</span>{" "}<span style={GT}>Blue Zone</span>
      </h1>
      <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.75, maxWidth: 380, margin: "0 auto 36px", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
        In the next few minutes, you&apos;ll share your goals, health data, and wearable connections. We&apos;ll build a protocol grounded in your biology — not generic advice.
      </p>
      <div className="card" style={{ padding: "8px 24px", marginBottom: 32, textAlign: "left" }}>
        {ITEMS.map(([icon, label], i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < ITEMS.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{icon}</span>
            <span style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{label}</span>
          </div>
        ))}
      </div>
      <button className="cta" style={{ width: "100%" }} onClick={onNext}>
        Let&apos;s begin →
      </button>
      <p style={{ fontSize: 11, color: T.muted, marginTop: 10, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
        Takes about 5 minutes
      </p>
    </div>
  );
}

// ── Step 2: Goals ─────────────────────────────────────────────────────────────
const GOAL_OPTIONS: { value: Goal; label: string; icon: string }[] = [
  { value: "energy",    label: "Energy",    icon: "⚡" },
  { value: "sleep",     label: "Sleep",     icon: "🌙" },
  { value: "focus",     label: "Focus",     icon: "🎯" },
  { value: "strength",  label: "Strength",  icon: "💪" },
  { value: "fat_loss",  label: "Fat Loss",  icon: "🔥" },
  { value: "recovery",  label: "Recovery",  icon: "🔄" },
  { value: "hormones",  label: "Hormones",  icon: "◉" },
  { value: "longevity", label: "Longevity", icon: "⬡" },
];

function GoalsStep({ goals, setGoals, onNext, onSportsPrep }: { goals: Goal[]; setGoals: (g: Goal[]) => void; onNext: () => void; onSportsPrep: () => void }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,32px)", ...GT, letterSpacing: "-.02em", marginBottom: 8 }}>
          What are you optimising for?
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Select all that apply — we&apos;ll weight your protocol accordingly.
        </p>
      </div>
      <div className="card" style={{ padding: "20px 24px", marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {GOAL_OPTIONS.map((g) => {
            const active = goals.includes(g.value);
            return (
              <button
                key={g.value}
                onClick={() => setGoals(active ? goals.filter((x) => x !== g.value) : [...goals, g.value])}
                style={{ padding: "12px 4px", borderRadius: 10, textAlign: "center", background: active ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)", border: `1px solid ${active ? "rgba(99,102,241,.45)" : "rgba(255,255,255,.07)"}`, cursor: "pointer", transition: "all .15s" }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{g.icon}</div>
                <div style={{ fontSize: 10, color: active ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{g.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sports event special route */}
      <button
        onClick={onSportsPrep}
        style={{ width: "100%", padding: "16px 20px", borderRadius: 14, textAlign: "left", cursor: "pointer", background: "rgba(124,58,237,.06)", border: "1px solid rgba(124,58,237,.22)", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all .15s" }}
      >
        <div>
          <div style={{ fontSize: 13, color: "#C4B5FD", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, marginBottom: 3 }}>
            🏆 Prepare for an upcoming sports event
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Phase-based protocol built around your race date, sport &amp; injury profile
          </div>
        </div>
        <span style={{ fontSize: 13, color: "#A5B4FC", flexShrink: 0, marginLeft: 16 }}>→</span>
      </button>

      <button className="cta" style={{ width: "100%" }} onClick={onNext} disabled={goals.length === 0}>
        Continue →
      </button>
      {goals.length === 0 && (
        <p style={{ fontSize: 11, color: T.muted, textAlign: "center", marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Select at least one goal to continue
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
        {saving ? "Saving…" : "Continue →"}
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
const STATUS_STEPS = ["Reading file…", "Extracting biomarkers…", "Normalizing values…", "Preparing analysis…"];

function UploadStep({ onDone }: { onDone: (data: { storagePath: string; fileName: string }) => void }) {
  const [drag, setDrag]           = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [pct,  setPct]            = useState(0);
  const [uploading, setUploading] = useState(false);

  const statusText = pct < 30 ? STATUS_STEPS[0] : pct < 60 ? STATUS_STEPS[1] : pct < 85 ? STATUS_STEPS[2] : STATUS_STEPS[3];

  const startUpload = useCallback(async (f: File) => {
    setFile(f); setUploading(true); setPct(0);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: f.name, size: f.size, type: f.type }] }),
      });
      if (!signRes.ok) {
        const e = await signRes.json().catch(() => ({}));
        throw new Error((e as Record<string,string>).error ?? "Failed to get upload URL");
      }
      const { files: signedFiles } = await signRes.json() as { files: { signedUrl: string; storagePath: string }[] };
      if (!signedFiles?.[0]) throw new Error("No signed URL returned");
      const { signedUrl, storagePath } = signedFiles[0];

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 85)); };
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
        xhr.send(f);
      });

      setPct(95);
      await fetch("/api/uploads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: f.name, fileSize: f.size, mimeType: f.type }] }),
      });
      setPct(100);
      setTimeout(() => onDone({ storagePath, fileName: f.name }), 500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setUploading(false); setPct(0); setFile(null);
    }
  }, [onDone]);

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

      <div className="card" style={{ padding: 8 }}>
        {!uploading ? (
          <div
            className={`upload-zone${drag ? " drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) startUpload(f); }}
            onClick={() => document.getElementById("bz-file")?.click()}
          >
            <input id="bz-file" type="file" accept=".pdf,.csv,.json,.xml" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) startUpload(f); }} />
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, color: T.text, marginBottom: 6 }}>Drop your lab report here</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              PDF, CSV, JSON, XML · Blood tests, DEXA, hormones, VO₂ max
            </div>
            <button className="cta cta-sm" style={{ pointerEvents: "none" }}>Browse Files</button>
          </div>
        ) : (
          <div style={{ padding: "40px 36px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 14, color: T.text, marginBottom: 5 }}>
              {file?.name ?? "lab-report.pdf"}
            </div>
            <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: T.muted, marginBottom: 16 }}>
              {pct < 100 ? statusText : "✓ Upload complete"}
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div style={{ fontSize: 10, color: "#334155", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", textAlign: "right" }}>
              {Math.round(Math.min(pct, 100))}%
            </div>
          </div>
        )}
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
  onDone: (protocolId: string) => void;
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
        setTimeout(() => onDone(protocolId), 1200);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Protocol generation failed");
      }
    })();
  }, [mounted, started, profile, onDone]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 55% 45% at 50% 40%,rgba(99,102,241,.07) 0%,transparent 70%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 400 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 0 32px rgba(99,102,241,.4)", animation: "glowPulse 2.4s ease-in-out infinite" }}>⬡</div>
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

  // Form state
  const [goals,            setGoals]            = useState<Goal[]>(["energy", "sleep"] as Goal[]);
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

  // Restore sessionStorage on mount (survives OAuth redirects)
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
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
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    saveSaved({ goals, age, gender, currentInjuries, healthConditions, medications, budget, preferences, uploadData });
  }, [goals, age, gender, currentInjuries, healthConditions, medications, budget, preferences, uploadData]);

  // Show toast on OAuth result
  useEffect(() => {
    if (whoopStatus === "connected") { toast.success("WHOOP connected!"); setConnected((p) => ({ ...p, whoop: true })); }
    if (whoopStatus === "error")     { toast.error("WHOOP connection failed — try again."); }
    if (ouraStatus  === "connected") { toast.success("Oura Ring connected!"); setConnected((p) => ({ ...p, oura: true })); }
    if (ouraStatus  === "error")     { toast.error("Oura connection failed — try again."); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whoopStatus, ouraStatus]);

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
  ];

  const progressPct = (step / (STEP_LABELS.length - 1)) * 100;

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Step progress bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,8,15,.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            {STEP_LABELS.map((label, i) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, background: i < step ? GRAD : i === step ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.06)", color: i < step ? "#fff" : i === step ? "#A5B4FC" : T.muted, border: i === step ? "1px solid rgba(99,102,241,.4)" : "none", transition: "all .3s" }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 9, color: i === step ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 2, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", background: GRAD, borderRadius: 99, width: `${progressPct}%`, transition: "width .5s cubic-bezier(.16,1,.3,1)" }} />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div style={{ padding: "40px 20px 120px" }}>
        {step === 0 && <ConsentStep onNext={() => setStep(1)} />}
        {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
        {step === 2 && (
          <GoalsStep
            goals={goals} setGoals={setGoals}
            onNext={() => setStep(3)}
            onSportsPrep={() => router.push("/app/onboarding/sports-prep")}
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
        {step === 4 && (
          <UploadStep onDone={(data) => { setUploadData(data); setStep(5); }} />
        )}
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
            onDone={(protocolId) => {
              sessionStorage.removeItem(SS_KEY);
              router.push(`/app/results/${protocolId}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
