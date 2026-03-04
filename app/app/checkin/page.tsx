"use client";
/// app/app/checkin/page.tsx
import { useState } from "react";
import Link from "next/link";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT = {
  background: GRAD,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
  backgroundClip: "text" as const,
};

const ENERGY_OPTIONS = ["Depleted", "Low", "Moderate", "High", "Exceptional"];

export default function CheckInPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [energy, setEnergy] = useState<string | null>(null);
  const [sleep, setSleep] = useState(6);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = 2;

  async function submit() {
    setSubmitting(true);
    try {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energy, sleepScore: sleep }),
      });
    } catch {
      // fail silently — checkin is best-effort
    }
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div style={{
        textAlign: "center", padding: "80px 24px",
        animation: "fadeIn .5s ease both",
      }}>
        <div style={{
          fontSize: 52, marginBottom: 20,
          animation: "countUp .4s ease both",
        }}>
          ✅
        </div>
        <h2 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 400, fontSize: 28,
          color: "#F1F5F9", marginBottom: 10, letterSpacing: "-.02em",
        }}>
          Protocol updating
        </h2>
        <p style={{
          fontSize: 14, color: "#64748B", fontFamily: "'Inter',sans-serif",
          fontWeight: 300, marginBottom: 28, lineHeight: 1.65,
        }}>
          Next update ready within 24 hours based on your responses.
        </p>
        <Link href="/app/results">
          <button className="cta cta-sm">View Protocol</button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "52px 24px" }}>
      {/* Progress bar */}
      <div style={{
        height: 2, background: "rgba(255,255,255,.06)",
        borderRadius: 2, overflow: "hidden", marginBottom: 36,
      }}>
        <div style={{
          height: "100%",
          width: `${((step + 1) / totalSteps) * 100}%`,
          background: GRAD,
          transition: "width .5s cubic-bezier(.16,1,.3,1)",
          borderRadius: 2,
        }} />
      </div>

      {/* Label */}
      <div style={{
        fontSize: 11, fontWeight: 400, letterSpacing: ".1em",
        color: "#6366F1", fontFamily: "'Inter',sans-serif",
        textTransform: "uppercase", marginBottom: 10,
      }}>
        Weekly Check-in · {step + 1}/{totalSteps}
      </div>

      {/* Step 0 — Energy */}
      {step === 0 && (
        <>
          <h2 style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 400, fontSize: 26,
            color: "#F1F5F9", marginBottom: 28, letterSpacing: "-.02em",
          }}>
            How has your energy been this week?
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))",
            gap: 8, marginBottom: 8,
          }}>
            {ENERGY_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setEnergy(opt)}
                style={{
                  padding: "14px 12px", borderRadius: 12,
                  border: `1px solid ${energy === opt ? "rgba(99,102,241,.6)" : "rgba(255,255,255,.08)"}`,
                  background: energy === opt ? "rgba(99,102,241,.12)" : "rgba(255,255,255,.02)",
                  color: energy === opt ? "#A5B4FC" : "#64748B",
                  fontSize: 13, cursor: "pointer",
                  fontFamily: "'Inter',sans-serif", fontWeight: 300,
                  transition: "all .18s",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 1 — Sleep slider */}
      {step === 1 && (
        <>
          <h2 style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 400, fontSize: 26,
            color: "#F1F5F9", marginBottom: 28, letterSpacing: "-.02em",
          }}>
            Rate your sleep quality
          </h2>
          <div>
            <div style={{
              textAlign: "center", fontFamily: "'Syne',sans-serif", fontWeight: 400,
              fontSize: 52, marginBottom: 20, ...GT,
            }}>
              {sleep}
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={sleep}
              onChange={e => setSleep(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
            />
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 11, color: "#64748B",
              fontFamily: "'Inter',sans-serif", fontWeight: 300, marginTop: 6,
            }}>
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>
        </>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
        <button
          className="cta cta-sm"
          disabled={step === 0 && !energy || submitting}
          onClick={() => {
            if (step < totalSteps - 1) {
              setStep(step + 1);
            } else {
              submit();
            }
          }}
          style={{ opacity: (step === 0 && !energy) ? 0.5 : 1 }}
        >
          {step < totalSteps - 1 ? "Continue →" : submitting ? "Submitting…" : "Submit Check-in"}
        </button>
      </div>
    </div>
  );
}
