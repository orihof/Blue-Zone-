/// components/goals/GoalResultsPage.tsx
"use client";

import { useState } from "react";
import { GOAL_CATEGORIES } from "@/lib/db/goal-payload";
import type {
  GoalProtocolPayload,
  GoalPhase,
  GoalSupplementItem,
  GoalTrackingMetric,
} from "@/lib/db/goal-payload";

const PERF_GRAD = "linear-gradient(135deg,#7C3AED,#06B6D4)";
const T         = { text: "#F1F5F9", muted: "#64748B" };

// ── Phase color map ───────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  "Foundation":             { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA" },
  "Cellular Priming":       { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA" },
  "Neuro Foundation":       { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA" },
  "Sleep Hygiene Reset":    { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA" },
  "Scalp & Follicle Prep":  { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA" },
  "Neuro-Nutritional Foundation": { bg: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.4)", label: "#60A5FA" },
  "Hormonal Foundation":    { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA" },
  "Conditioning Base":      { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA" },

  "Active Loss":            { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },
  "Active Intervention":    { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },
  "Stack Building":         { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },
  "Circadian Anchoring":    { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },
  "Active Treatment":       { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },
  "Mood Stack Build":       { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },
  "Active Optimization":    { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },
  "Capacity Build":         { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8" },

  "Plateau Management":        { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },
  "Biomarker Optimization":    { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },
  "Peak Performance":          { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },
  "Deep Sleep Optimization":   { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },
  "Growth Acceleration":       { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },
  "Optimization":              { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },
  "Performance Peak":          { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },
  "Peak":                      { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA" },

  "Maintenance":               { bg: "rgba(16,185,129,.1)",   border: "rgba(16,185,129,.35)", label: "#34D399" },
  "Longevity Maintenance":     { bg: "rgba(16,185,129,.1)",   border: "rgba(16,185,129,.35)", label: "#34D399" },
  "Resilience Maintenance":    { bg: "rgba(16,185,129,.1)",   border: "rgba(16,185,129,.35)", label: "#34D399" },
  "Sustainable Vitality":      { bg: "rgba(16,185,129,.1)",   border: "rgba(16,185,129,.35)", label: "#34D399" },
  "Recovery":                  { bg: "rgba(16,185,129,.1)",   border: "rgba(16,185,129,.35)", label: "#34D399" },
};

function phaseStyle(phase: string) {
  return PHASE_COLORS[phase] ?? { bg: "rgba(99,102,241,.1)", border: "rgba(99,102,241,.3)", label: "#A5B4FC" };
}

// ── Timing bucket order ───────────────────────────────────────────────────────
const TIMING_ORDER = ["Morning", "Pre-workout", "During", "Post-workout", "With meals", "Evening"];

function groupByTiming(items: GoalSupplementItem[]): Record<string, GoalSupplementItem[]> {
  const groups: Record<string, GoalSupplementItem[]> = {};
  for (const item of items) {
    const key = item.timing ?? "Other";
    (groups[key] = groups[key] ?? []).push(item);
  }
  return groups;
}

// ── Section 1: Goal Phases ────────────────────────────────────────────────────
function PhasesSection({ phases }: { phases: GoalPhase[] }) {
  const [expanded, setExpanded] = useState<number | null>(0);
  return (
    <section className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 16, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        ⏱ Goal Timeline
      </div>

      {/* Horizontal phase strip */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {phases.map((ph, i) => {
          const c = phaseStyle(ph.phase);
          const isActive = expanded === i;
          return (
            <button key={i} onClick={() => setExpanded(isActive ? null : i)}
              style={{ flex: "0 0 auto", padding: "10px 14px", borderRadius: 10, border: `1px solid ${isActive ? c.border : "rgba(255,255,255,.07)"}`,
                background: isActive ? c.bg : "rgba(255,255,255,.025)", cursor: "pointer", transition: "all .15s",
                minWidth: 90, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: isActive ? c.label : T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 400, marginBottom: 3 }}>
                {ph.phase}
              </div>
              <div style={{ fontSize: 13, color: isActive ? T.text : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                {ph.durationWeeks}w
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded detail */}
      {expanded !== null && phases[expanded] && (() => {
        const ph = phases[expanded]!;
        const c  = phaseStyle(ph.phase);
        return (
          <div style={{ borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 18, animation: "fadeUp .2s ease both" }}>
            <div style={{ fontSize: 12, color: c.label, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 6 }}>
              {ph.phaseFocus}
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
              {ph.keyActions.map((a, j) => (
                <li key={j} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.6, marginBottom: 4 }}>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </section>
  );
}

// ── Section 2: Red Flags ──────────────────────────────────────────────────────
function RedFlagsSection({ redFlags }: { redFlags: GoalProtocolPayload["redFlags"] }) {
  const [open, setOpen] = useState(false);
  const hasContent =
    redFlags.contraindications.length > 0 ||
    redFlags.doctorDiscussion.length > 0 ||
    redFlags.weeklyMonitoring.length > 0;

  if (!hasContent) return null;

  return (
    <section style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", padding: "16px 20px", borderRadius: 14, border: "1px solid rgba(245,158,11,.3)", background: "rgba(245,158,11,.07)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>Red Flags &amp; Safety</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
              {redFlags.contraindications.length} contraindication{redFlags.contraindications.length !== 1 ? "s" : ""} · {redFlags.doctorDiscussion.length} items to discuss with your doctor
            </div>
          </div>
        </div>
        <span style={{ color: "#FCD34D", fontSize: 16 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 4, padding: 20, borderRadius: 14, border: "1px solid rgba(245,158,11,.2)", background: "rgba(245,158,11,.05)", animation: "fadeUp .2s ease both" }}>
          {redFlags.contraindications.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
                Avoid
              </div>
              {redFlags.contraindications.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ color: "#EF4444", flexShrink: 0 }}>✕</span>
                  <span style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{c}</span>
                </div>
              ))}
            </div>
          )}

          {redFlags.doctorDiscussion.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
                Discuss With Doctor
              </div>
              {redFlags.doctorDiscussion.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ color: "#FCD34D", flexShrink: 0 }}>?</span>
                  <span style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{d}</span>
                </div>
              ))}
            </div>
          )}

          {redFlags.weeklyMonitoring.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
                Monitor Weekly
              </div>
              {redFlags.weeklyMonitoring.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ color: "#60A5FA", flexShrink: 0 }}>📊</span>
                  <span style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Section 3: Goal Pack (tabbed) ─────────────────────────────────────────────
type PackTab = "supplements" | "testing" | "lifestyle" | "services" | "roi";

function GoalPackSection({ tierPack }: { tierPack: GoalProtocolPayload["tierPack"] }) {
  const [tab, setTab] = useState<PackTab>("supplements");

  const allTabs: { id: PackTab; label: string; count: number }[] = [
    { id: "supplements", label: "Supplements", count: tierPack.supplements.length },
    { id: "testing",     label: "Testing",     count: tierPack.testing.length },
    { id: "lifestyle",   label: "Lifestyle",   count: tierPack.lifestyle.length },
    { id: "services",    label: "Services",    count: tierPack.services.length },
    { id: "roi",         label: "ROI Ranking", count: tierPack.biggestROI.length },
  ];
  const tabs = allTabs.filter((t) => t.count > 0);

  return (
    <section className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          🎯 Tier {tierPack.tier} Goal Pack
        </div>
        {tierPack.whatYouAreMissing.length > 0 && (
          <span style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
            +{tierPack.whatYouAreMissing.length} upgrade{tierPack.whatYouAreMissing.length !== 1 ? "s" : ""} available
          </span>
        )}
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: "0 0 auto", padding: "8px 16px", borderRadius: 8, border: `1px solid ${tab === t.id ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.07)"}`,
              background: tab === t.id ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.025)",
              cursor: "pointer", transition: "all .15s",
              fontSize: 12, color: tab === t.id ? "#A5B4FC" : T.muted,
              fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: tab === t.id ? 400 : 300 }}>
            {t.label}
            <span style={{ marginLeft: 6, fontSize: 10, color: tab === t.id ? "#818CF8" : T.muted }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ animation: "fadeUp .2s ease both" }}>
        {tab === "supplements" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tierPack.supplements.map((s, i) => (
              <div key={i} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 3 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>{s.dose} · {s.timing}</div>
                  </div>
                </div>
                {s.notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.5 }}>{s.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "testing" && (
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {tierPack.testing.map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7 }}>{item}</li>
            ))}
          </ul>
        )}

        {tab === "lifestyle" && (
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {tierPack.lifestyle.map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7 }}>{item}</li>
            ))}
          </ul>
        )}

        {tab === "services" && (
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {tierPack.services.map((s, i) => {
              if (typeof s === "string") {
                return <li key={i} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7 }}>{s}</li>;
              }
              return (
                <li key={i} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7 }}>
                  <span style={{ fontWeight: 500 }}>{s.name}</span>
                  {s.rationale && <span style={{ color: "#94A3B8" }}> — {s.rationale}</span>}
                  {s.priceRange && <span style={{ color: "#64748B", fontSize: 11 }}> ({s.priceRange})</span>}
                </li>
              );
            })}
          </ul>
        )}

        {tab === "roi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tierPack.biggestROI.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? PERF_GRAD : "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: 12, color: i === 0 ? "#fff" : "#A5B4FC", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 600 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{item}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What you're missing */}
      {tierPack.whatYouAreMissing.length > 0 && (
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(99,102,241,.2)", background: "rgba(99,102,241,.05)" }}>
          <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#818CF8", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
            Unlock Next Tier
          </div>
          {tierPack.whatYouAreMissing.map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.6 }}>
              → {m}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Section 4: Supplement Schedule ────────────────────────────────────────────
function SupplementScheduleSection({ schedule }: { schedule: GoalSupplementItem[] }) {
  const groups = groupByTiming(schedule);
  const orderedKeys = [
    ...TIMING_ORDER.filter((k) => k in groups),
    ...Object.keys(groups).filter((k) => !TIMING_ORDER.includes(k)),
  ];

  if (schedule.length === 0) return null;

  return (
    <section className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        💊 Daily Supplement Schedule
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {orderedKeys.map((timing) => (
          <div key={timing}>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 400, letterSpacing: ".06em", marginBottom: 10, textTransform: "uppercase" }}>
              {timing}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups[timing]!.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: PERF_GRAD, flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: "#A5B4FC", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>{item.dose}</span>
                      {item.withFood && (
                        <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, padding: "1px 7px", borderRadius: 100, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>
                          with food
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 3, lineHeight: 1.5 }}>{item.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section 5: Tracking Metrics ───────────────────────────────────────────────
function TrackingMetricsSection({ metrics }: { metrics: GoalTrackingMetric[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 18, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        📊 Metrics to Track
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {metrics.map((m, i) => {
          const isOpen = expanded === i;
          return (
            <button key={i} onClick={() => setExpanded(isOpen ? null : i)}
              style={{ padding: 18, borderRadius: 12, border: `1px solid ${isOpen ? "rgba(6,182,212,.4)" : "rgba(255,255,255,.07)"}`,
                background: isOpen ? "rgba(6,182,212,.07)" : "rgba(255,255,255,.025)",
                cursor: "pointer", transition: "all .15s", textAlign: "left" }}>
              <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 6 }}>
                {m.metric}
              </div>
              {isOpen ? (
                <div style={{ animation: "fadeUp .15s ease both" }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Good trend</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.5 }}>{m.goodTrend}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#F87171", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Concerning</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.5 }}>{m.concerningTrend}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Intervention</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.5 }}>{m.intervention}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.4 }}>
                  {m.intervention.slice(0, 70)}{m.intervention.length > 70 ? "…" : ""}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Goal meta banner ──────────────────────────────────────────────────────────
interface GoalMeta {
  category:     string;
  age:          number;
  gender:       string;
  budgetTier:   number;
  budgetValue:  number;
  categoryData: Record<string, unknown>;
}

function GoalBanner({ meta }: { meta: GoalMeta }) {
  const catInfo = GOAL_CATEGORIES[meta.category] ?? { label: meta.category, icon: "⬡", description: "" };

  return (
    <div style={{ padding: "20px 24px", borderRadius: 16, border: "1px solid rgba(124,58,237,.3)", background: "rgba(124,58,237,.07)", marginBottom: 20,
      backgroundImage: "radial-gradient(ellipse 70% 80% at 0% 50%,rgba(124,58,237,.08) 0%,transparent 70%)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 }}>
            {catInfo.icon} Goal Protocol
          </div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,28px)", color: T.text }}>
            {catInfo.label}
          </h1>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
            {catInfo.description}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ padding: "6px 14px", borderRadius: 100, fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300,
            background: "rgba(6,182,212,.1)", border: "1px solid rgba(6,182,212,.3)", color: "#06B6D4" }}>
            Tier {meta.budgetTier} · ${meta.budgetValue.toLocaleString()}
          </span>
          <span style={{ padding: "6px 14px", borderRadius: 100, fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300,
            background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.3)", color: "#A5B4FC" }}>
            {meta.gender} · {meta.age}y
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function GoalResultsPage({
  payload,
  goalMeta,
}: {
  payload: GoalProtocolPayload;
  goalMeta: GoalMeta;
}) {
  return (
    <div className="px-4 lg:px-6 py-6 lg:py-8" style={{ paddingBottom: "max(112px, calc(64px + env(safe-area-inset-bottom)))" }}>
      <GoalBanner meta={goalMeta} />

      <PhasesSection phases={payload.goalPhases} />
      <RedFlagsSection redFlags={payload.redFlags} />
      <GoalPackSection tierPack={payload.tierPack} />
      <SupplementScheduleSection schedule={payload.supplementSchedule} />
      <TrackingMetricsSection metrics={payload.trackingMetrics} />

      {/* CTA */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <a href="/app/dashboard"
          style={{ padding: "12px 24px", borderRadius: 10, background: PERF_GRAD, color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
          Dashboard →
        </a>
        <a href="/app/goals"
          style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, fontWeight: 300, textDecoration: "none" }}>
          ← Back to Goals
        </a>
      </div>
    </div>
  );
}
