/// components/marketing/FoundingCohortApplication.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, CheckCircle2, X } from "lucide-react";

/* ── Types ── */
interface FormData {
  firstName: string;
  email: string;
  athleteType: string;
  wearables: string[];
  bloodSources: string[];
  primaryGoal: string;
  feedbackConsent: boolean;
}

const INITIAL: FormData = {
  firstName: "",
  email: "",
  athleteType: "",
  wearables: [],
  bloodSources: [],
  primaryGoal: "",
  feedbackConsent: false,
};

const ATHLETE_TYPES = [
  "Endurance athlete",
  "Strength athlete",
  "Recreational athlete",
  "Biohacker / optimizer",
  "Other",
];
const WEARABLE_OPTIONS = ["WHOOP", "Oura Ring", "Garmin", "Apple Health", "TrainingPeaks", "Strava", "None yet"];
const BLOOD_OPTIONS = ["InsideTracker", "Function Health", "LabCorp / Quest", "Doctor ordered panel", "None yet"];

/* ── Pill button ── */
function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 16px",
        borderRadius: 100,
        fontSize: 13,
        fontFamily: "var(--font-ui,'Inter',sans-serif)",
        fontWeight: 400,
        border: selected ? "1px solid var(--ion-blue)" : "1px solid rgba(255,255,255,0.1)",
        background: selected ? "rgba(0,138,255,0.12)" : "rgba(255,255,255,0.04)",
        color: selected ? "var(--ion-blue)" : "rgba(255,255,255,0.6)",
        cursor: "pointer",
        transition: "all 150ms",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

/* ── Main component ── */
export function FoundingCohortApplication({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Reset on close
  const handleClose = useCallback(() => {
    onClose();
    // Delay reset so closing animation can play
    setTimeout(() => {
      setStep(1);
      setForm(INITIAL);
      setSubmitted(false);
      setError("");
    }, 200);
  }, [onClose]);

  const toggleArray = (arr: string[], val: string): string[] => {
    // "None yet" is exclusive
    if (val === "None yet") return arr.includes(val) ? [] : ["None yet"];
    const without = arr.filter((v) => v !== "None yet");
    return without.includes(val) ? without.filter((v) => v !== val) : [...without, val];
  };

  const step1Valid = form.firstName.trim() && form.email.trim() && form.athleteType;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName.trim(),
          email: form.email.trim(),
          athlete_type: form.athleteType,
          wearables: form.wearables.filter((w) => w !== "None yet"),
          blood_sources: form.bloodSources.filter((b) => b !== "None yet"),
          primary_goal: form.primaryGoal.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const progressWidth = submitted ? 100 : (step / 3) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 50 }}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Founding cohort application"
        className="fixed inset-4 md:inset-8 lg:inset-y-12 lg:inset-x-[20%]"
        style={{ background: "#0D0D14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Founding Cohort Application</div>
              {!submitted && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>Step {step} of 3 · 2 minutes</div>
              )}
            </div>
            <button type="button" onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} aria-label="Close">
              <X size={20} style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 1, marginTop: 12 }}>
            <div style={{ height: "100%", width: `${progressWidth}%`, background: "var(--ion-blue)", borderRadius: 1, transition: "width 300ms ease" }} />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 32px" }}>
          {submitted ? (
            /* ── Confirmation ── */
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <CheckCircle2 size={40} style={{ color: "var(--ion-blue)", margin: "0 auto" }} />
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 24, fontWeight: 700, color: "#FFFFFF", marginTop: 16 }}>Application received.</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 12, maxWidth: 360, margin: "12px auto 0", lineHeight: 1.65 }}>
                We review every application personally. You&apos;ll hear back within 48 hours at <strong style={{ color: "rgba(255,255,255,0.8)" }}>{form.email}</strong>.
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 8 }}>
                No action needed. We&apos;ll reach out when your spot is ready.
              </p>
            </div>
          ) : step === 1 ? (
            /* ── Step 1: Who are you ── */
            <div>
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 20 }}>Who are you?</h3>
              {/* First name */}
              <label style={{ display: "block", marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "block", marginBottom: 6 }}>First name</span>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Your first name"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "#111118", color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none" }}
                />
              </label>
              {/* Email */}
              <label style={{ display: "block", marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "block", marginBottom: 6 }}>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "#111118", color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none" }}
                />
              </label>
              {/* Athlete type */}
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "block", marginBottom: 8 }}>What best describes you?</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ATHLETE_TYPES.map((t) => (
                    <Pill key={t} label={t} selected={form.athleteType === t} onClick={() => setForm((f) => ({ ...f, athleteType: t }))} />
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.5, marginTop: 12 }}>
                Blue Zone is currently optimized for endurance and hybrid athletes. We&apos;ll let you know if your profile is outside the current beta scope.
              </p>
            </div>
          ) : step === 2 ? (
            /* ── Step 2: Current stack ── */
            <div>
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 6 }}>What data do you already have?</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 24, lineHeight: 1.5 }}>
                Select everything that applies — this tells us if Blue Zone can generate your first protocol immediately.
              </p>
              {/* Wearables */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "block", marginBottom: 8 }}>WEARABLES</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {WEARABLE_OPTIONS.map((w) => (
                    <Pill key={w} label={w} selected={form.wearables.includes(w)} onClick={() => setForm((f) => ({ ...f, wearables: toggleArray(f.wearables, w) }))} />
                  ))}
                </div>
              </div>
              {/* Blood work */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "block", marginBottom: 8 }}>BLOOD WORK</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BLOOD_OPTIONS.map((b) => (
                    <Pill key={b} label={b} selected={form.bloodSources.includes(b)} onClick={() => setForm((f) => ({ ...f, bloodSources: toggleArray(f.bloodSources, b) }))} />
                  ))}
                </div>
              </div>
              {/* Goal textarea */}
              <div>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "block", marginBottom: 6 }}>What&apos;s the one thing you&apos;re trying to solve? <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span></span>
                <textarea
                  value={form.primaryGoal}
                  onChange={(e) => setForm((f) => ({ ...f, primaryGoal: e.target.value }))}
                  placeholder="e.g. My HRV keeps declining despite reduced training load"
                  rows={3}
                  style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", background: "#111118", color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none", resize: "none" }}
                />
              </div>
            </div>
          ) : (
            /* ── Step 3: Review ── */
            <div>
              <h3 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 600, color: "#FFFFFF", marginBottom: 16 }}>You&apos;re almost in.</h3>
              {/* Review card */}
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
                {/* Name + Email */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>APPLICANT</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{form.firstName}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>{form.email}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>{form.athleteType}</div>
                  </div>
                  <button type="button" onClick={() => setStep(1)} style={{ fontSize: 12, color: "var(--ion-blue)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Edit</button>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>DATA SOURCES</div>
                      {form.wearables.length > 0 && (
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Wearables: {form.wearables.join(", ")}</div>
                      )}
                      {form.bloodSources.length > 0 && (
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>Blood: {form.bloodSources.join(", ")}</div>
                      )}
                      {form.wearables.length === 0 && form.bloodSources.length === 0 && (
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>None selected</div>
                      )}
                    </div>
                    <button type="button" onClick={() => setStep(2)} style={{ fontSize: 12, color: "var(--ion-blue)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Edit</button>
                  </div>
                  {form.primaryGoal && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>GOAL</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic" }}>{form.primaryGoal}</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Consent checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={form.feedbackConsent}
                  onChange={(e) => setForm((f) => ({ ...f, feedbackConsent: e.target.checked }))}
                  style={{ marginTop: 3, accentColor: "var(--ion-blue)" }}
                />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.5 }}>
                  I understand this is a founding cohort — I&apos;ll provide feedback to help shape the product
                </span>
              </label>
              {error && (
                <div style={{ fontSize: 13, color: "#FB923C", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 12, padding: "10px 14px", background: "rgba(249,115,22,0.08)", borderRadius: 10, border: "1px solid rgba(249,115,22,0.2)" }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!submitted && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !step1Valid}
                className="cta cta-sm"
                style={{ opacity: step === 1 && !step1Valid ? 0.4 : 1, pointerEvents: step === 1 && !step1Valid ? "none" : "auto" }}
              >
                Continue <ArrowRight size={14} strokeWidth={1.5} style={{ display: "inline", verticalAlign: "middle", marginTop: -1, marginLeft: 4 }} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!form.feedbackConsent || submitting}
                className="cta cta-sm"
                style={{ opacity: !form.feedbackConsent || submitting ? 0.4 : 1, pointerEvents: !form.feedbackConsent || submitting ? "none" : "auto" }}
              >
                {submitting ? "Submitting..." : "Submit Application"}
                {!submitting && <ArrowRight size={14} strokeWidth={1.5} style={{ display: "inline", verticalAlign: "middle", marginTop: -1, marginLeft: 4 }} />}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
