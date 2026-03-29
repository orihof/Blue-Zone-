/// components/landing/InsightForm.tsx
"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export interface InsightFormData {
  ferritin: number | null;
  hrvTrend: "declining" | "stable" | "improving";
  trainingPhase: "base" | "build" | "peak" | "recovery";
  sleepQuality: number;
  athleteType: string;
  primarySymptom: string | null;
}

interface InsightFormProps {
  onSubmit: (data: InsightFormData) => void;
  isLoading: boolean;
}

const ATHLETE_TYPES = ["Endurance athlete", "Strength athlete", "Recreational athlete", "Biohacker / optimizer"];
const HRV_OPTIONS = [
  { label: "↓ Declining", value: "declining" },
  { label: "→ Stable", value: "stable" },
  { label: "↑ Improving", value: "improving" },
] as const;
const PHASE_OPTIONS = [
  { label: "Base", value: "base" },
  { label: "Build", value: "build" },
  { label: "Peak", value: "peak" },
  { label: "Recovery", value: "recovery" },
] as const;

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm cursor-pointer transition-all duration-200 ${
        selected
          ? "border-[color:var(--ion-blue)]/50 text-[color:var(--ion-blue)] bg-[color:var(--ion-blue)]/8"
          : "border-white/10 text-white/50 bg-transparent"
      }`}
      style={{ border: `1px solid ${selected ? "rgba(0,138,255,0.5)" : "rgba(255,255,255,0.1)"}`, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
    >
      {label}
    </button>
  );
}

export function InsightForm({ onSubmit, isLoading }: InsightFormProps) {
  const [ferritin, setFerritin] = useState("");
  const [hrvTrend, setHrvTrend] = useState("");
  const [trainingPhase, setTrainingPhase] = useState("");
  const [sleepQuality, setSleepQuality] = useState(7);
  const [athleteType, setAthleteType] = useState("");
  const [primarySymptom, setPrimarySymptom] = useState("");

  const isValid = athleteType !== "" && hrvTrend !== "" && trainingPhase !== "";

  function handleSubmit() {
    if (!isValid || isLoading) return;
    onSubmit({
      ferritin: ferritin.trim() ? Number(ferritin) : null,
      hrvTrend: hrvTrend as InsightFormData["hrvTrend"],
      trainingPhase: trainingPhase as InsightFormData["trainingPhase"],
      sleepQuality,
      athleteType,
      primarySymptom: primarySymptom.trim() || null,
    });
  }

  return (
    <div style={{ maxWidth: 576, margin: "0 auto" }}>
      {/* Step label */}
      <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 24, textAlign: "center" }}>
        ENTER YOUR DATA
      </div>

      {/* Field 1 — Athlete type */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
          What best describes you?
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ATHLETE_TYPES.map((t) => (
            <Pill key={t} label={t} selected={athleteType === t} onClick={() => setAthleteType(t)} />
          ))}
        </div>
      </div>

      {/* Field 2 — Ferritin */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>
          Ferritin (ng/mL)
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
          From your last blood panel — leave blank if unknown
        </div>
        <input
          type="number"
          min={1}
          max={500}
          value={ferritin}
          onChange={(e) => setFerritin(e.target.value)}
          placeholder="e.g. 58"
          className="w-full md:w-32 focus:outline-none"
          style={{
            background: "#111118",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 14,
            color: "#FFFFFF",
            fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
          }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(0,138,255,0.4)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
      </div>

      {/* Field 3 — HRV trend */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
          HRV trend (last 2 weeks)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {HRV_OPTIONS.map((o) => (
            <Pill key={o.value} label={o.label} selected={hrvTrend === o.value} onClick={() => setHrvTrend(o.value)} />
          ))}
        </div>
      </div>

      {/* Field 4 — Training phase */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
          Current training phase
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PHASE_OPTIONS.map((o) => (
            <Pill key={o.value} label={o.label} selected={trainingPhase === o.value} onClick={() => setTrainingPhase(o.value)} />
          ))}
        </div>
      </div>

      {/* Field 5 — Sleep quality */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>
          Sleep quality (last 2 weeks)
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
          1 = terrible, 10 = excellent
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSleepQuality(n)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms",
                fontFamily: "var(--font-ui,'Inter',sans-serif)",
                background: n === sleepQuality ? "rgba(0,138,255,0.15)" : "rgba(255,255,255,0.05)",
                color: n === sleepQuality ? "var(--ion-blue)" : "rgba(255,255,255,0.3)",
                border: `1px solid ${n === sleepQuality ? "rgba(0,138,255,0.4)" : "rgba(255,255,255,0.05)"}`,
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Field 6 — Primary symptom */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>
          What&apos;s the one thing you&apos;re trying to solve?
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
          Optional — helps us be more specific
        </div>
        <textarea
          value={primarySymptom}
          onChange={(e) => setPrimarySymptom(e.target.value)}
          placeholder="e.g. Stalled performance despite consistent training"
          rows={2}
          className="w-full focus:outline-none"
          style={{
            background: "#111118",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 14,
            color: "rgba(255,255,255,0.8)",
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            resize: "none",
          }}
          onFocus={(e) => { e.target.style.borderColor = "rgba(0,138,255,0.4)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="cta w-full"
        style={{ opacity: !isValid && !isLoading ? 0.4 : 1, pointerEvents: !isValid || isLoading ? "none" : "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Analyzing your signals...
          </>
        ) : (
          <>
            Analyze my signals <ArrowRight size={15} strokeWidth={1.5} />
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-ui,'Inter',sans-serif)", textAlign: "center", marginTop: 12 }}>
        Educational only — not medical advice. Consult a physician before changing your protocol.
      </p>
    </div>
  );
}
