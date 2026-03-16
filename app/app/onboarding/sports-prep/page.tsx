/// app/app/onboarding/sports-prep/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { type SportsPrepFormData, getBudgetTier, BUDGET_TIERS, RACE_DISTANCES, RACE_DISTANCE_LABELS } from "@/lib/db/sports-payload";
import AppleHealthHelpModal from "@/components/upload/AppleHealthHelpModal";
import SamsungHealthHelpModal from "@/components/upload/SamsungHealthHelpModal";
import { MissingMarkersModal } from "@/components/blood-test/MissingMarkersModal";
import { BloodPanelModal } from "@/components/onboarding/BloodPanelModal";
import { detectMissingMarkers, type DetectionResult } from "@/lib/blood-test/detect-missing-markers";
import type { IngestResult } from "@/lib/types/health";

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
function Step2({ form, update, invalidFields, clearInvalid }: {
  form: SportsPrepFormData;
  update: (p: Partial<SportsPrepFormData>) => void;
  invalidFields: Set<string>;
  clearInvalid: (field: string) => void;
}) {
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
        <input
          type="date" min={minDate} value={form.eventDate}
          onChange={(e) => { handleDateChange(e.target.value); clearInvalid("eventDate"); }}
          className={invalidFields.has("eventDate") ? "field-invalid" : ""}
          data-invalid={invalidFields.has("eventDate") ? "true" : undefined}
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
        <div
          className={invalidFields.has("priorityOutcome") ? "field-invalid" : ""}
          data-invalid={invalidFields.has("priorityOutcome") ? "true" : undefined}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {[
            { id: "pr_podium",    label: "PR / Podium Push",          sub: "I'm going for my best result" },
            { id: "finish_strong",label: "Finish Strong",             sub: "I want to complete it feeling good" },
            { id: "injury_free",  label: "Injury-Free Comeback",      sub: "I'm returning after time off or injury" },
          ].map((o) => (
            <SelectCard key={o.id} selected={form.priorityOutcome === o.id} onClick={() => { update({ priorityOutcome: o.id }); clearInvalid("priorityOutcome"); }}>
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
          <input
            type="number" min={16} max={80} placeholder="e.g. 42" value={form.age || ""}
            onChange={(e) => { update({ age: parseInt(e.target.value) || 0 }); clearInvalid("age"); }}
            className={invalidFields.has("age") ? "field-invalid" : ""}
            data-invalid={invalidFields.has("age") ? "true" : undefined}
            style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>Gender *</label>
          <div
            className={invalidFields.has("gender") ? "field-invalid" : ""}
            data-invalid={invalidFields.has("gender") ? "true" : undefined}
            style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}
          >
            {["Male", "Female", "Prefer not to say"].map((g) => (
              <OptionPill key={g} selected={form.gender === g} onClick={() => { update({ gender: g }); clearInvalid("gender"); }}>{g}</OptionPill>
            ))}
          </div>
        </div>
      </div>

      {/* Experience level */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>Experience Level *</label>
        <div
          className={invalidFields.has("experienceLevel") ? "field-invalid" : ""}
          data-invalid={invalidFields.has("experienceLevel") ? "true" : undefined}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {[
            { id: "first_timer",  label: "First Timer",   sub: "Never done this distance or sport before" },
            { id: "intermediate", label: "Intermediate",  sub: "I've completed this type of event before" },
            { id: "advanced",     label: "Advanced",      sub: "I compete regularly and train structured" },
          ].map((e) => (
            <SelectCard key={e.id} selected={form.experienceLevel === e.id} onClick={() => { update({ experienceLevel: e.id }); clearInvalid("experienceLevel"); }}>
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

// ── Step 4 — Blood Test Upload ─────────────────────────────────────────────────
function Step4BT({ uploaded, onUpload, eventName }: { uploaded: boolean; onUpload: (v: boolean) => void; eventName?: string }) {
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">(
    uploaded ? "success" : "idle"
  );
  const [fileName,         setFileName]         = useState<string | null>(null);
  const [drag,             setDrag]             = useState(false);
  const [detectionResult,  setDetectionResult]  = useState<DetectionResult | null>(null);
  const [showMissingModal, setShowMissingModal] = useState(false);
  // Show the recommended blood panel on first visit (if not already uploaded)
  const [showPanelModal,   setShowPanelModal]   = useState(!uploaded);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePanelDownload() {
    try {
      // Pass a full "all markers missing" detection result so the PDF lists the complete panel
      const fullDetection = detectMissingMarkers({});
      const { generateDoctorLetterPDF } = await import("@/lib/blood-test/generate-doctor-letter");
      await generateDoctorLetterPDF(fullDetection);
    } catch { /* PDF generation is best-effort */ }
  }

  async function handleFile(file: File) {
    setUploadState("uploading");
    setFileName(file.name);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: file.name, size: file.size, type: file.type }] }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload URL");
      const { files: signed } = await signRes.json();
      const { signedUrl, storagePath } = signed[0] as { signedUrl: string; storagePath: string };
      await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await fetch("/api/uploads/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: file.name, fileSize: file.size, mimeType: file.type }] }),
      });

      // OCR + missing-marker detection
      let markerMap: Record<string, number> = {};
      try {
        const ingestRes = await fetch("/api/ingest", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storagePath, mimeType: file.type, fileName: file.name }),
        });
        if (ingestRes.ok) {
          const ingestData = await ingestRes.json() as IngestResult;
          markerMap = Object.fromEntries(
            ingestData.normalizedBiomarkers.map((b) => [b.name, b.value]),
          );
        }
      } catch { /* non-fatal — empty map triggers modal */ }

      const detection = detectMissingMarkers(markerMap);
      setUploadState("success");

      if (detection.shouldShowModal) {
        setDetectionResult(detection);
        setShowMissingModal(true);
        // onUpload(true) is deferred until the user dismisses the modal
      } else {
        onUpload(true);
      }
    } catch {
      setUploadState("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ fontSize: 11, letterSpacing: ".1em", color: "#06B6D4", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 8 }}>🩸 Blood Test</p>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          Upload your blood test
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Your biomarker data lets us calibrate your supplement protocol precisely — not generically.
        </p>
      </div>

      {uploadState !== "success" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => uploadState !== "uploading" && fileRef.current?.click()}
          style={{ border: `2px dashed ${drag ? "rgba(6,182,212,.55)" : "rgba(255,255,255,.1)"}`, borderRadius: 16, padding: "40px 24px", textAlign: "center", cursor: uploadState === "uploading" ? "wait" : "pointer", transition: "border-color .18s, background .18s", background: drag ? "rgba(6,182,212,.04)" : "transparent" }}
        >
          <div style={{ fontSize: 38, marginBottom: 12 }}>{uploadState === "uploading" ? "⏳" : "🩸"}</div>
          <p style={{ fontSize: 14, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>
            {uploadState === "uploading" ? `Uploading ${fileName}…` : "Drop your blood test here or tap to browse"}
          </p>
          <p style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>PDF, PNG, JPG, or CSV</p>
          {uploadState === "error" && (
            <p style={{ fontSize: 11, color: "#F87171", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 8 }}>
              Upload failed — please try a different file format.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 14, background: "rgba(6,182,212,.06)", border: "1px solid rgba(6,182,212,.25)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(6,182,212,.15)", border: "1px solid rgba(6,182,212,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#67E8F9", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Blood test uploaded</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
          </div>
          <button onClick={() => { setUploadState("idle"); setFileName(null); onUpload(false); }}
            style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", flexShrink: 0 }}>
            Replace
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.csv" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
        <p style={{ fontSize: 10, letterSpacing: ".1em", color: T.muted, textTransform: "uppercase" as const, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>What your blood test unlocks</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "Supplement doses calibrated to your actual biomarkers",
            "Inflammation markers mapped to injury recovery protocol",
            "Cardiovascular risk factors factored into race-day strategy",
          ].map((item) => (
            <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "#06B6D4", fontSize: 11, flexShrink: 0, marginTop: 1 }}>→</span>
              <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended panel modal — shown on first visit before upload */}
      {showPanelModal && (
        <BloodPanelModal
          eventName={eventName}
          onDownload={handlePanelDownload}
          onContinue={() => setShowPanelModal(false)}
          onSkip={() => setShowPanelModal(false)}
          onClose={() => setShowPanelModal(false)}
        />
      )}

      {/* Missing markers modal — shown after upload when panel is incomplete */}
      {detectionResult && (
        <MissingMarkersModal
          isOpen={showMissingModal}
          onClose={() => { setShowMissingModal(false); onUpload(true); }}
          onContinue={() => { setShowMissingModal(false); onUpload(true); }}
          detectionResult={detectionResult}
        />
      )}
    </div>
  );
}

// ── Step 5 — Wearables ─────────────────────────────────────────────────────────
const WEARABLES_CP = [
  { id: "whoop",   name: "WHOOP",          icon: "⚡", desc: "HRV, recovery, sleep strain",   type: "oauth",  oauthHref: "/api/oauth/whoop/start",  accept: null },
  { id: "oura",    name: "Oura Ring",      icon: "💍", desc: "Readiness, sleep, heart rate",  type: "oauth",  oauthHref: "/api/oauth/oura/start",   accept: null },
  { id: "apple",   name: "Apple Health",   icon: "🍎", desc: "Upload your Health export",     type: "upload", oauthHref: null,                      accept: ".zip" },
  { id: "samsung", name: "Samsung Health", icon: "📱", desc: "Steps, heart rate, sleep CSV",  type: "upload", oauthHref: null,                      accept: ".zip,.csv" },
] as const;

function Step4W({ connected, onConnect }: { connected: string[]; onConnect: (ids: string[]) => void }) {
  const appleRef   = useRef<HTMLInputElement>(null);
  const samsungRef = useRef<HTMLInputElement>(null);
  const [appleUploading,   setAppleUploading]   = useState(false);
  const [samsungUploading, setSamsungUploading] = useState(false);
  const [showAppleModal,   setShowAppleModal]   = useState(false);
  const [showSamsungModal, setShowSamsungModal] = useState(false);

  async function handleAppleUpload(file: File) {
    setAppleUploading(true);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: file.name, size: file.size, type: file.type }] }),
      });
      if (!signRes.ok) throw new Error();
      const { files: signed } = await signRes.json();
      const { signedUrl, storagePath } = signed[0] as { signedUrl: string; storagePath: string };
      await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await fetch("/api/uploads/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: file.name, fileSize: file.size, mimeType: file.type }] }),
      });
      onConnect([...Array.from(new Set([...connected, "apple"]))]);
      if (appleRef.current) appleRef.current.value = "";
    } catch {
      toast.error("Apple Health upload failed");
    } finally {
      setAppleUploading(false);
    }
  }

  async function handleSamsungUpload(file: File) {
    setSamsungUploading(true);
    try {
      const { parseSamsungHealthZip } = await import("@/lib/wearables/samsung-health-parser");
      const summary = await parseSamsungHealthZip(file);
      const res = await fetch("/api/wearables/samsung/ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
      if (!res.ok) throw new Error();
      onConnect([...Array.from(new Set([...connected, "samsung"]))]);
      if (samsungRef.current) samsungRef.current.value = "";
    } catch {
      toast.error("Samsung Health import failed");
    } finally {
      setSamsungUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <p style={{ fontSize: 11, letterSpacing: ".1em", color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 8 }}>⌚ Wearables</p>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>
          Connect your wearable
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Live HRV and recovery data lets your protocol adapt to how your body is actually responding.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {WEARABLES_CP.map((w) => {
          const isConnected = connected.includes(w.id);
          const isBusy = (w.id === "apple" && appleUploading) || (w.id === "samsung" && samsungUploading);
          return (
            <div key={w.id} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: isConnected ? "rgba(16,185,129,.12)" : "rgba(124,58,237,.08)", border: `1px solid ${isConnected ? "rgba(16,185,129,.3)" : "rgba(124,58,237,.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {w.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, marginBottom: 1 }}>{w.name}</div>
                <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{w.desc}</div>
              </div>
              {isConnected ? (
                <span style={{ fontSize: 11, color: "#10B981", fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>✓ Done</span>
              ) : w.type === "oauth" ? (
                <a href={w.oauthHref}>
                  <button style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", background: PERF_GRAD, color: "#fff", border: "none", whiteSpace: "nowrap" }}>
                    Connect
                  </button>
                </a>
              ) : (
                <button
                  disabled={isBusy}
                  onClick={() => w.id === "apple" ? setShowAppleModal(true) : setShowSamsungModal(true)}
                  style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, cursor: isBusy ? "wait" : "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", background: PERF_GRAD, color: "#fff", border: "none", whiteSpace: "nowrap", opacity: isBusy ? 0.6 : 1 }}
                >
                  {isBusy ? "…" : "Upload"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {connected.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.2)" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
          <span style={{ fontSize: 12, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            {connected.length === 1 ? `${WEARABLES_CP.find((w) => w.id === connected[0])?.name ?? connected[0]} connected` : `${connected.length} devices connected`}
          </span>
        </div>
      )}

      <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
        <p style={{ fontSize: 10, letterSpacing: ".1em", color: T.muted, textTransform: "uppercase" as const, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>What your wearable unlocks</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "HRV-based daily training decisions (go hard vs. recover)",
            "Sleep quality mapped to recovery supplement timing",
            "Resting HR trends used to detect overtraining before race day",
          ].map((item) => (
            <div key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "#A78BFA", fontSize: 11, flexShrink: 0, marginTop: 1 }}>→</span>
              <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <input ref={appleRef}   type="file" accept=".zip"      style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAppleUpload(f);   }} />
      <input ref={samsungRef} type="file" accept=".zip,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSamsungUpload(f); }} />

      <AppleHealthHelpModal
        open={showAppleModal}
        onClose={() => setShowAppleModal(false)}
        onRequestUpload={() => appleRef.current?.click()}
      />
      <SamsungHealthHelpModal
        open={showSamsungModal}
        onClose={() => setShowSamsungModal(false)}
        onRequestUpload={() => samsungRef.current?.click()}
      />
    </div>
  );
}

// ── Step 6 — Budget ────────────────────────────────────────────────────────────
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
          <button key={t.tier} onClick={() => handleSlider(Math.round((t.min + t.max) / 2))} style={{ padding: "12px 14px", borderRadius: 10, background: t.tier === tier ? "rgba(124,58,237,.1)" : "rgba(255,255,255,.02)", border: `1px solid ${t.tier === tier ? "rgba(124,58,237,.35)" : "rgba(255,255,255,.06)"}`, transition: "all .2s", cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontSize: 10, color: t.tier === tier ? "#A78BFA" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 3 }}>Tier {t.tier}</div>
            <div style={{ fontSize: 11, color: t.tier === tier ? T.text : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{t.range}</div>
          </button>
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

function LoadingScreen({ form, onComplete, onError, preWarmPromise }: {
  form: SportsPrepFormData;
  onComplete: (id: string) => void;
  onError: (e: string) => void;
  preWarmPromise?: Promise<string | null>;
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

    function firePost() {
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

    if (preWarmPromise) {
      // Pre-warm is in-flight or already resolved — await it instead of firing a second POST
      preWarmPromise.then((id) => {
        if (id) {
          console.log("[sports-prep] pre-warm hit, skipping POST for id:", id);
          startPolling(id);
        } else {
          firePost();
        }
      });
    } else {
      firePost();
    }

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [form, onComplete, onError, preWarmPromise]);

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
const STEP_LABELS = ["Competition", "Event Details", "Constraints", "Blood Test", "Wearables", "Budget"];
const TOTAL_STEPS = 6;

function SportsPrepInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState<SportsPrepFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [bloodTestUploaded,  setBloodTestUploaded]  = useState(false);
  const [wearablesConnected, setWearablesConnected] = useState<string[]>([]);

  // Pre-warm refs — store the result of the early generate call
  const preWarmRef         = useRef<{ promise: Promise<string | null>; budgetTier: number } | null>(null);
  const lastPreWarmTierRef = useRef<number | null>(null);

  // Restore from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { step: s, form: f, bloodTestUploaded: bt, wearablesConnected: wc } = JSON.parse(saved);
        if (s  != null) setStep(s);
        if (f  != null) setForm(f);
        if (bt != null) setBloodTestUploaded(bt);
        if (wc != null) setWearablesConnected(wc);
      }
    } catch { /* silent */ }
  }, []);

  // Persist to sessionStorage on every change
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, form, bloodTestUploaded, wearablesConnected })); } catch { /* silent */ }
  }, [step, form, bloodTestUploaded, wearablesConnected]);

  // Pre-warm: fire the generate call as soon as the user reaches the budget step (step 5).
  // By the time they click "Generate", Claude may already be running or done.
  // Re-fires only when the budget tier changes — not on every slider tick.
  useEffect(() => {
    if (step !== 5) return;
    if (lastPreWarmTierRef.current === form.budgetTier) return;

    lastPreWarmTierRef.current = form.budgetTier;

    const snapshot      = { ...form };
    const capturedTier  = form.budgetTier;

    const promise: Promise<string | null> = fetch("/api/sports-prep/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const data = await r.json() as { sportsPrepId?: string };
        if (data.sportsPrepId && lastPreWarmTierRef.current === capturedTier) {
          console.log("[sports-prep] pre-warm ready, id:", data.sportsPrepId);
          return data.sportsPrepId;
        }
        return null;
      })
      .catch(() => null);

    preWarmRef.current = { promise, budgetTier: capturedTier };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.budgetTier]);

  function update(partial: Partial<SportsPrepFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  const clearInvalid = useCallback((field: string) => {
    setInvalidFields((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  // Step-specific validation
  function canAdvance(): boolean {
    if (step === 0) return !!form.competitionType;
    if (step === 1) return !!(form.eventDate && form.weeksToEvent > 0 && form.priorityOutcome && form.age >= 16 && form.gender && form.experienceLevel);
    if (step === 2) return !!form.stimulantTolerance;
    if (step === 3) return true; // optional — blood test
    if (step === 4) return true; // optional — wearables
    if (step === 5) return form.budgetValue > 0;
    return false;
  }

  function handleNext() {
    if (step === 1) {
      const missing = new Set<string>();
      if (!form.eventDate || form.weeksToEvent <= 0) missing.add("eventDate");
      if (!form.priorityOutcome)                     missing.add("priorityOutcome");
      if (!(form.age >= 16))                         missing.add("age");
      if (!form.gender)                              missing.add("gender");
      if (!form.experienceLevel)                     missing.add("experienceLevel");
      if (missing.size > 0) {
        setInvalidFields(missing);
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>("[data-invalid='true']");
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return;
      }
      setInvalidFields(new Set());
    } else if (!canAdvance()) {
      return;
    }
    console.log(`[analytics] sports_prep_step_${step + 1}_complete`);
    if (step === TOTAL_STEPS - 1) { setLoading(true); return; }
    setStep((s) => s + 1);
  }

  function handleBack() {
    if (step === 0) { router.push(fromOnboarding ? "/app/onboarding" : "/app/goals"); return; }
    setStep((s) => s - 1);
  }

  const handleComplete = useCallback((id: string) => {
    sessionStorage.removeItem(STORAGE_KEY);
    router.push(`/app/results/sports/${id}`);
  }, [router]);

  const handleError = useCallback((msg: string) => {
    const isRawApiError = msg.includes("rate_limit_error") || msg.includes("429") || msg.includes("overloaded_error");
    const displayMsg = isRawApiError
      ? "Our AI is currently busy. Please wait a moment and try again."
      : msg;
    setLoading(false);
    setError(displayMsg);
    setFailureCount((n) => n + 1);
    toast.error(displayMsg);
  }, []);

  if (loading) {
    const preWarmPromise = preWarmRef.current?.budgetTier === form.budgetTier
      ? preWarmRef.current?.promise
      : undefined;
    return (
      <div style={{ minHeight: "100vh", background: "#06080F", position: "relative" }}>
        <LoadingScreen form={form} onComplete={handleComplete} onError={handleError} preWarmPromise={preWarmPromise} />
        {error && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(5,5,10,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 24px"
          }}>
            <div style={{
              background: "var(--layer, #0f1120)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 16, padding: "32px 28px", maxWidth: 440, width: "100%",
              textAlign: "center"
            }}>
              <p style={{ color: "#FCA5A5", fontSize: 15, marginBottom: 8, fontFamily: "var(--font-syne)" }}>
                Generation failed
              </p>
              <p style={{ color: "#737aaa", fontSize: 13, marginBottom: 24, fontFamily: "var(--font-inter)" }}>
                {error}
              </p>
              {failureCount < 2 ? (
                <button
                  onClick={() => { setError(null); setLoading(false); }}
                  style={{
                    background: "linear-gradient(135deg, #6c5ce7, #00cec9)",
                    border: "none", borderRadius: 10, color: "#fff",
                    padding: "12px 28px", fontSize: 14, cursor: "pointer",
                    fontFamily: "var(--font-inter)"
                  }}
                >
                  Try Again
                </button>
              ) : (
                <button
                  onClick={() => router.push("/app/dashboard")}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10, color: "#eef0ff",
                    padding: "12px 28px", fontSize: 14, cursor: "pointer",
                    fontFamily: "var(--font-inter)"
                  }}
                >
                  Continue to Dashboard →
                </button>
              )}
            </div>
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
        {step === 1 && <Step2 form={form} update={update} invalidFields={invalidFields} clearInvalid={clearInvalid} />}
        {step === 2 && <Step3 form={form} update={update} />}
        {step === 3 && (
          <Step4BT
            uploaded={bloodTestUploaded}
            onUpload={setBloodTestUploaded}
            eventName={COMPETITION_TYPES.find((c) => c.id === form.competitionType)?.label}
          />
        )}
        {step === 4 && <Step4W  connected={wearablesConnected} onConnect={setWearablesConnected} />}
        {step === 5 && <Step4   form={form} update={update} />}
      </div>

      {/* Sticky CTA */}
      {(() => {
        const isOptional  = step === 3 || step === 4;
        const optionalDone = (step === 3 && bloodTestUploaded) || (step === 4 && wearablesConnected.length > 0);
        const showGhost   = isOptional && !optionalDone;
        const ok          = canAdvance();
        return (
          <div style={{ position: "sticky", bottom: 0, padding: "20px 0 8px", background: "linear-gradient(0deg,#06080F 70%,transparent)" }}>
            <button
              onClick={handleNext}
              disabled={false}
              style={{ width: "100%", padding: "16px 28px", borderRadius: 12, fontSize: 15, fontWeight: 400,
                cursor: ok ? "pointer" : "default",
                border: showGhost ? "1px solid rgba(255,255,255,.12)" : "none",
                transition: "all .18s", fontFamily: "var(--font-ui,'Inter',sans-serif)",
                background: showGhost ? "transparent" : (ok ? PERF_GRAD : "rgba(255,255,255,.06)"),
                color: showGhost ? T.muted : (ok ? "#fff" : T.muted),
                opacity: ok ? 1 : 0.5,
                boxShadow: (!showGhost && ok) ? "0 0 24px rgba(124,58,237,0.35)" : "none" }}>
              {step === TOTAL_STEPS - 1 ? "Generate My Competition Pack →" : showGhost ? "Skip for now →" : "Continue →"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}

export default function SportsPrepPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bz-midnight,#06080F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7C3AED", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <SportsPrepInner />
    </Suspense>
  );
}
