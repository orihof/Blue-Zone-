"use client";
/// components/bio-age/BioAgeWidget.tsx
// Unified widget that handles 3 states:
//   "locked"      — no bio age calculated yet (shows checklist + progress ring placeholder)
//   "calculating" — POST /api/bio-age/calculate in progress
//   "unlocked"    — score ready (ring + drivers + share + recalculate)

import { useState, useEffect, useCallback } from "react";
import { BioAgeRing }    from "./BioAgeRing";
import { BioAgeReveal }  from "./BioAgeReveal";
import { BioAgeShareSheet } from "./BioAgeShareSheet";

interface Driver {
  factor:    string;
  direction: "positive" | "negative" | "neutral";
  magnitude: number;
  detail:    string;
}

interface BioAgeData {
  biologicalAge:    number | null;
  delta:            number | null;
  percentile:       number | null;
  calculatedAt:     string | null;
  confidenceLevel:  string | null;
  revealed:         boolean;
  primaryDrivers:   Driver[];
  chronologicalAge: number | null;
}

interface BioAgeWidgetProps {
  initialData:       BioAgeData;
  hasBiomarkers:     boolean;
  hasWearable:       boolean;
}

type WidgetState = "locked" | "calculating" | "unlocked";

function dataToCounts(hasBiomarkers: boolean, hasWearable: boolean): number {
  return (hasBiomarkers ? 1 : 0) + (hasWearable ? 1 : 0);
}

export function BioAgeWidget({ initialData, hasBiomarkers, hasWearable }: BioAgeWidgetProps) {
  const [data,  setData]  = useState<BioAgeData>(initialData);
  const [state, setState] = useState<WidgetState>(
    initialData.biologicalAge != null ? "unlocked" : "locked"
  );
  const [showReveal,   setShowReveal]   = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [recalcCooldown, setRecalcCooldown] = useState(false);

  // Auto-trigger calculation if conditions met but no score exists
  useEffect(() => {
    if (data.biologicalAge == null && (hasBiomarkers || hasWearable)) {
      triggerCalculation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show reveal overlay if score was just calculated and not yet revealed
  useEffect(() => {
    if (state === "unlocked" && data.biologicalAge != null && !data.revealed) {
      setShowReveal(true);
    }
  }, [state, data.biologicalAge, data.revealed]);

  const triggerCalculation = useCallback(async (manual: boolean) => {
    setState("calculating");
    setError(null);
    try {
      const res  = await fetch("/api/bio-age/calculate", { method: "POST" });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError((json.error as string) ?? "Calculation failed");
        setState(manual ? "unlocked" : "locked");
        return;
      }
      setData(prev => ({
        ...prev,
        biologicalAge:    json.biologicalAge as number,
        delta:            json.delta as number,
        percentile:       (json.percentile as number | null) ?? null,
        confidenceLevel:  (json.confidenceLevel as string | null) ?? null,
        primaryDrivers:   (json.primaryDrivers as Driver[]) ?? [],
        chronologicalAge: (json.chronologicalAge as number | null) ?? null,
        revealed:         false,
      }));
      setState("unlocked");
      if (manual) {
        setRecalcCooldown(true);
        setTimeout(() => setRecalcCooldown(false), 60_000);
      }
    } catch {
      setError("Network error. Please try again.");
      setState(manual ? "unlocked" : "locked");
    }
  }, []);

  // ── Locked state ─────────────────────────────────────────────────────────────
  if (state === "locked") {
    const dataCount = dataToCounts(hasBiomarkers, hasWearable);
    const pct       = (dataCount / 2) * 100;

    return (
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Locked ring placeholder */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%", flexShrink: 0,
            background: "rgba(255,255,255,.03)",
            border: "2px dashed rgba(255,255,255,.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <svg width={80} height={80} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
              <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={6} />
              {pct > 0 && (
                <circle
                  cx={40} cy={40} r={32}
                  fill="none" stroke="#6366F1" strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - pct / 100)}
                />
              )}
            </svg>
            <span style={{ fontSize: 22, zIndex: 1 }}>🔒</span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 4 }}>
              Biological Age Score
            </div>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 16, fontWeight: 400, color: "#F1F5F9", marginBottom: 8 }}>
              Connect your data to unlock
            </div>

            {/* Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                { label: "Lab results / biomarkers", done: hasBiomarkers, link: "/app/onboarding/upload" },
                { label: "Wearable device", done: hasWearable, link: "/app/settings" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: item.done ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)",
                    border: `1px solid ${item.done ? "rgba(16,185,129,.35)" : "rgba(255,255,255,.1)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#34D399",
                  }}>
                    {item.done ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: 12, color: item.done ? "#64748B" : "#F1F5F9", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textDecoration: item.done ? "line-through" : "none" }}>
                    {item.label}
                  </span>
                  {!item.done && (
                    <a href={item.link} style={{ fontSize: 11, color: "#A5B4FC", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textDecoration: "none" }}>→ Add</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#F87171", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{error}</div>
        )}
      </div>
    );
  }

  // ── Calculating state ─────────────────────────────────────────────────────────
  if (state === "calculating") {
    const steps = ["Reviewing your biomarkers", "Analyzing wearable patterns", "Comparing to population data", "Estimating biological age"];
    return (
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 16 }}>
          🧬 Calculating Biological Age…
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: "#6366F1",
                animation: `glowPulse 1.2s ease-in-out ${i * .25}s infinite`,
              }} />
              <span style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Unlocked state ────────────────────────────────────────────────────────────
  const { biologicalAge, chronologicalAge, percentile, confidenceLevel, primaryDrivers } = data;
  if (biologicalAge == null) return null;

  const chrono = chronologicalAge ?? 40;
  const delta  = biologicalAge - chrono;
  const accentColor =
    delta <= -5  ? "#10B981" :
    delta <= 0   ? "#3B82F6" :
    delta <= 5   ? "#F59E0B" :
                   "#EF4444";

  return (
    <>
      {showReveal && (
        <BioAgeReveal
          biologicalAge={biologicalAge}
          chronologicalAge={chrono}
          percentile={percentile}
          confidenceLevel={confidenceLevel}
          primaryDrivers={primaryDrivers}
          onDismiss={() => {
            setShowReveal(false);
            setData(prev => ({ ...prev, revealed: true }));
          }}
        />
      )}

      {showShare && (
        <BioAgeShareSheet
          biologicalAge={biologicalAge}
          chronologicalAge={chrono}
          delta={delta}
          onClose={() => setShowShare(false)}
        />
      )}

      <div className="card" style={{ padding: 24, marginBottom: 20, position: "relative", overflow: "hidden" }}>
        {/* Top accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${accentColor},transparent)` }} />

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 3 }}>
              🧬 Biological Age Score
            </div>
            {confidenceLevel && (
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 100, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400,
                background: confidenceLevel === "high" ? "rgba(16,185,129,.1)" : confidenceLevel === "medium" ? "rgba(245,158,11,.1)" : "rgba(100,116,139,.1)",
                color: confidenceLevel === "high" ? "#34D399" : confidenceLevel === "medium" ? "#FCD34D" : "#94A3B8",
                border: `1px solid ${confidenceLevel === "high" ? "rgba(16,185,129,.25)" : confidenceLevel === "medium" ? "rgba(245,158,11,.25)" : "rgba(100,116,139,.25)"}`,
              }}>
                {confidenceLevel} confidence
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowShare(true)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12,
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                color: "#94A3B8", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)",
              }}
            >
              ↗ Share
            </button>
            <button
              onClick={() => !recalcCooldown && triggerCalculation(true)}
              disabled={recalcCooldown}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12,
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                color: recalcCooldown ? "#374151" : "#94A3B8",
                cursor: recalcCooldown ? "not-allowed" : "pointer",
                fontFamily: "var(--font-ui,'Inter',sans-serif)",
              }}
            >
              ↺ Recalculate
            </button>
          </div>
        </div>

        {/* Body: ring + drivers */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <BioAgeRing
            biologicalAge={biologicalAge}
            chronologicalAge={chrono}
            size={160}
            animate={false}
          />

          <div style={{ flex: 1, minWidth: 200 }}>
            {/* Chrono age + percentile sub stats */}
            <div style={{ display: "flex", gap: 18, marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 18, fontWeight: 300, color: "#64748B" }}>{chrono}</div>
                <div style={{ fontSize: 10, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".08em", textTransform: "uppercase" }}>chrono age</div>
              </div>
              {percentile != null && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 18, fontWeight: 300, color: accentColor }}>{percentile}th</div>
                  <div style={{ fontSize: 10, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".08em", textTransform: "uppercase" }}>percentile</div>
                </div>
              )}
            </div>

            {/* Drivers */}
            {primaryDrivers.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
                  Key Drivers
                </div>
                {primaryDrivers.slice(0, 4).map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: d.direction === "positive" ? "#10B981" : d.direction === "negative" ? "#EF4444" : "#64748B",
                    }} />
                    <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, fontWeight: 400, color: "#F1F5F9" }}>{d.factor}</span>
                    <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, flex: 1 }}>{d.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#F87171", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{error}</div>
        )}
      </div>
    </>
  );
}
