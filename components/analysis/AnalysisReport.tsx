/// components/analysis/AnalysisReport.tsx
"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/analysis/biomarker-engine";
import type {
  DomainScore,
  Finding,
  CrossDomainSignal,
  SupplementRecommendation,
  NutritionRecommendation,
  TrainingRecommendation,
  SleepRecommendation,
  DiagnosticRecommendation,
  CriticalFlag,
} from "@/lib/analysis/types";

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = { text: "#F1F5F9", muted: "#64748B", sub: "#94A3B8", border: "rgba(255,255,255,.07)" };

const GRADE_COLOR: Record<string, string> = {
  A: "#10B981", B: "#3B82F6", C: "#F59E0B", D: "#F97316", F: "#EF4444",
};

const STATUS_COLOR: Record<string, string> = {
  optimal: "#10B981", normal: "#3B82F6", low: "#F59E0B", high: "#F97316", critical: "#EF4444",
};

const DOMAIN_ICON: Record<string, string> = {
  metabolic: "🔬", cardiovascular: "❤️", hormonal: "⚗️",
  inflammatory: "🔥", nutritional: "🌿", recovery: "⚡", cognitive: "🧠",
};

const URGENCY_COLOR: Record<string, string> = {
  discuss_at_next_visit: "#3B82F6",
  schedule_soon:         "#F59E0B",
  seek_care_today:       "#EF4444",
};
const URGENCY_LABEL: Record<string, string> = {
  discuss_at_next_visit: "Discuss next visit",
  schedule_soon:         "Schedule soon",
  seek_care_today:       "Seek care today",
};

const PROTO_TABS = ["Supplements", "Nutrition", "Training", "Sleep", "Diagnostics"] as const;
type ProtoTab = typeof PROTO_TABS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function chip(label: string, color: string) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 500,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      fontFamily: "var(--font-ui,'Inter',sans-serif)",
    }}>
      {label}
    </span>
  );
}

// ── Critical flags banner ─────────────────────────────────────────────────────

function CriticalFlagsBanner({ flags }: { flags: CriticalFlag[] }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const topUrgency = flags.some((f) => f.urgency === "seek_care_today")
    ? "seek_care_today"
    : flags.some((f) => f.urgency === "schedule_soon")
      ? "schedule_soon"
      : "discuss_at_next_visit";
  const c = URGENCY_COLOR[topUrgency];

  return (
    <div style={{
      marginBottom: 24, padding: "16px 18px",
      borderRadius: 12, background: `${c}0d`, border: `1px solid ${c}55`,
      position: "relative",
    }}>
      <button
        onClick={() => setOpen(false)}
        aria-label="Dismiss"
        style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
      >
        ×
      </button>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", color: c, marginBottom: 10, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        ⚠ {flags.length} Critical Flag{flags.length > 1 ? "s" : ""} Detected
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flags.map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: URGENCY_COLOR[f.urgency], marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${URGENCY_COLOR[f.urgency]}` }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, fontWeight: 500, color: T.text }}>
                  {f.marker}{f.value ? ` (${f.value})` : ""}
                </span>
                {chip(URGENCY_LABEL[f.urgency], URGENCY_COLOR[f.urgency])}
              </div>
              <p style={{ margin: 0, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.sub, fontWeight: 300, lineHeight: 1.5 }}>
                {f.concern} — <span style={{ color: URGENCY_COLOR[f.urgency] }}>{f.action}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Biological age hero ───────────────────────────────────────────────────────

function BioAgeHero({
  biologicalAge, delta, chronologicalAge,
}: { biologicalAge: number | null; delta: number | null; chronologicalAge: number | null }) {
  const hasAge  = biologicalAge !== null;
  const absDelta = delta != null ? Math.abs(Math.round(delta)) : null;
  const younger  = delta != null && delta < 0;
  const deltaColor = younger ? "#10B981" : (delta ?? 0) === 0 ? "#3B82F6" : "#F97316";

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        Biological Age
      </div>
      {hasAge ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{
              fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(52px,7vw,72px)",
              fontWeight: 300, lineHeight: 1,
              background: `linear-gradient(135deg,${deltaColor},#fff)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              {Math.round(biologicalAge!)}
            </span>
            <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 13, color: T.muted, fontWeight: 300 }}>yrs</span>
          </div>
          {absDelta !== null && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 100,
              background: `${deltaColor}18`, border: `1px solid ${deltaColor}44`,
            }}>
              <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: deltaColor, fontWeight: 500 }}>
                {younger ? "−" : "+"}{absDelta}y
              </span>
              <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: deltaColor }}>
                {younger ? "younger" : "older"} than {chronologicalAge ?? "chrono"} yr baseline
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{
            fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(44px,6vw,60px)",
            fontWeight: 300, lineHeight: 1, color: T.muted, marginBottom: 6,
          }}>—</div>
          <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: T.muted, fontWeight: 300, margin: 0, maxWidth: 220 }}>
            Complete 2+ analyses to unlock biological age estimation.
          </p>
        </>
      )}
    </div>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const c     = GRADE_COLOR[grade] ?? "#3B82F6";
  const r     = 64;
  const cx    = 80;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
      <svg width={160} height={160} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={12} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={c} strokeWidth={12}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${c}99)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 36, fontWeight: 300, color: c, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 10, color: T.muted, marginTop: 3, letterSpacing: ".08em" }}>GRADE {grade}</span>
        <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 9, color: T.muted, fontWeight: 300, letterSpacing: ".06em" }}>OVERALL</span>
      </div>
    </div>
  );
}

// ── Domain card ───────────────────────────────────────────────────────────────

function DomainCard({ d }: { d: DomainScore }) {
  const c    = GRADE_COLOR[d.grade] ?? "#3B82F6";
  const icon = DOMAIN_ICON[d.domain] ?? "🔬";
  return (
    <div style={{
      padding: "16px 14px", borderRadius: 12,
      background: "rgba(255,255,255,.03)", border: `1px solid ${T.border}`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c},transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <div style={{
            fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, fontWeight: 500,
            color: T.sub, textTransform: "capitalize", marginTop: 4, letterSpacing: ".03em",
          }}>
            {d.domain}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 26, fontWeight: 300, color: c, lineHeight: 1 }}>{d.score}</div>
          <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 9, color: T.muted, marginTop: 1 }}>/ 100</div>
        </div>
      </div>
      {/* Score bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ height: "100%", width: `${d.score}%`, background: c, borderRadius: 2, boxShadow: `0 0 4px ${c}88` }} />
      </div>
      {/* Grade chip */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {chip(`Grade ${d.grade}`, c)}
        {d.keyMarkers.length > 0 && (
          <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 9, color: T.muted }}>
            {d.keyMarkers.slice(0, 2).join(", ")}
          </span>
        )}
      </div>
      {d.summary && (
        <p style={{
          marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: T.muted,
          fontWeight: 300, lineHeight: 1.5, margin: "8px 0 0",
        }}>
          {d.summary}
        </p>
      )}
    </div>
  );
}

// 8th card: data coverage summary
function CoverageCard({ completeness, retestIn, generatedAt }: { completeness: number; retestIn: string; generatedAt: string }) {
  const pct = Math.round(completeness * 100);
  const c   = pct >= 75 ? "#10B981" : pct >= 50 ? "#3B82F6" : "#F59E0B";
  const genDate = new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div style={{
      padding: "16px 14px", borderRadius: 12,
      background: "rgba(255,255,255,.03)", border: `1px solid ${T.border}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c},transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 18 }}>📊</span>
          <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, fontWeight: 500, color: T.sub, marginTop: 4, letterSpacing: ".03em" }}>
            Coverage
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 26, fontWeight: 300, color: c, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 9, color: T.muted, marginTop: 1 }}>data</div>
        </div>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 2, boxShadow: `0 0 4px ${c}88` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
        {chip(`Retest in ${retestIn}`, "#6366F1")}
        <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 9, color: T.muted }}>{genDate}</span>
      </div>
    </div>
  );
}

// ── Protocol section ──────────────────────────────────────────────────────────

function SupplementRow({ s }: { s: SupplementRecommendation }) {
  const c = s.priority === 1 ? "#7C3AED" : s.priority === 2 ? "#3B82F6" : "#64748B";
  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
        <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text }}>{s.name}</span>
        {chip(`P${s.priority}`, c)}
      </div>
      <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#A5B4FC", marginBottom: 6 }}>
        {s.dose} · {s.timing}{s.form ? ` · ${s.form}` : ""}
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.55, margin: 0 }}>
        {s.rationale}
      </p>
      {(s.contraindications ?? []).length > 0 && (
        <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)" }}>
          <span style={{ fontSize: 10, color: "#FCA5A5", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            ⚠ {s.contraindications!.join("; ")}
          </span>
        </div>
      )}
    </div>
  );
}

function NutritionRow({ n }: { n: NutritionRecommendation }) {
  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 4 }}>{n.intervention}</div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.55, margin: 0 }}>{n.description}</p>
    </div>
  );
}

function TrainingRow({ t }: { t: TrainingRecommendation }) {
  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 4 }}>{t.type}</div>
      <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#A5B4FC", marginBottom: 6 }}>
        {t.frequency} · {t.duration} · {t.intensity}
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.55, margin: 0 }}>{t.rationale}</p>
    </div>
  );
}

function SleepRow({ s }: { s: SleepRecommendation }) {
  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 4 }}>{s.intervention}</div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.55, margin: 0 }}>{s.description}</p>
    </div>
  );
}

function DiagnosticsRow({ d }: { d: DiagnosticRecommendation }) {
  const urgColors: Record<string, string> = { routine: "#3B82F6", soon: "#F59E0B", urgent: "#EF4444" };
  const c = urgColors[d.urgency] ?? "#3B82F6";
  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
        <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text }}>{d.test}</span>
        {chip(d.urgency, c)}
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.55, margin: 0 }}>{d.rationale}</p>
    </div>
  );
}

// ── Cross-domain signals ──────────────────────────────────────────────────────

function SignalCard({ s }: { s: CrossDomainSignal }) {
  const pC: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#3B82F6" };
  const c = pC[s.priority] ?? "#3B82F6";
  return (
    <div style={{ padding: "16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${c}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
        <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text, flex: 1 }}>{s.signal}</span>
        {chip(s.priority.toUpperCase(), c)}
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.6, margin: "0 0 10px" }}>
        {s.explanation}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {s.domains.map((d) => (
          <span key={d} style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: "rgba(99,102,241,.1)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,.2)", textTransform: "capitalize" }}>
            {d}
          </span>
        ))}
        {s.markers.slice(0, 3).map((m) => (
          <span key={m} style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: "rgba(255,255,255,.04)", color: T.muted, border: `1px solid ${T.border}` }}>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Reasoning chain accordion ─────────────────────────────────────────────────

function FindingAccordion({ findings }: { findings: Finding[] }) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {findings.map((f, i) => {
        const c       = STATUS_COLOR[f.status] ?? "#3B82F6";
        const isOpen  = openSet.has(i);
        const sigC: Record<string, string> = { low: T.muted, moderate: "#F59E0B", high: "#F97316", critical: "#EF4444" };
        return (
          <div key={i} style={{ borderRadius: 10, border: `1px solid ${isOpen ? `${c}44` : T.border}`, overflow: "hidden", background: "rgba(255,255,255,.02)" }}>
            {/* Collapsed header */}
            <button
              onClick={() => toggle(i)}
              style={{
                width: "100%", padding: "12px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0, boxShadow: `0 0 5px ${c}88` }} />
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, color: T.text, fontWeight: 500 }}>
                  {f.marker}
                </span>
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: c }}>
                  {f.value} {f.unit}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {chip(f.clinicalSignificance, sigC[f.clinicalSignificance] ?? T.muted)}
                <span style={{ color: T.muted, fontSize: 12, transition: "transform .15s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${T.border}` }}>
                <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.sub, fontWeight: 300, lineHeight: 1.65, margin: "12px 0 10px" }}>
                  {f.interpretation}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {f.relatedDomains.map((d) => (
                    <span key={d} style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: "rgba(99,102,241,.1)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,.2)", textTransform: "capitalize" }}>
                      {d}
                    </span>
                  ))}
                  {f.optimalMin != null && (
                    <span style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: `${c}15`, color: c, border: `1px solid ${c}33` }}>
                      optimal ≥ {f.optimalMin} {f.unit}
                    </span>
                  )}
                  {f.optimalMax != null && (
                    <span style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: `${c}15`, color: c, border: `1px solid ${c}33` }}>
                      optimal ≤ {f.optimalMax} {f.unit}
                    </span>
                  )}
                  {f.confidence != null && (
                    <span style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: "rgba(255,255,255,.05)", color: T.muted, border: `1px solid ${T.border}` }}>
                      confidence {Math.round(f.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ label, children, advancedOnly }: { label: string; children: React.ReactNode; advancedOnly?: boolean }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          {label}
        </div>
        {advancedOnly && (
          <span style={{ padding: "1px 7px", borderRadius: 100, fontSize: 9, background: "rgba(124,58,237,.15)", color: "#A5B4FC", border: "1px solid rgba(124,58,237,.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".06em" }}>
            ADVANCED
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface AnalysisReportProps {
  result:            AnalysisResult;
  reportId:          string;
  generatedAt:       string;
  biologicalAge:     number | null;
  biologicalAgeDelta: number | null;
  chronologicalAge:  number | null;
  userTier:          string;
}

export function AnalysisReport({
  result,
  reportId,
  generatedAt,
  biologicalAge,
  biologicalAgeDelta,
  chronologicalAge,
  userTier,
}: AnalysisReportProps) {
  const [protoTab, setProtoTab] = useState<ProtoTab>("Supplements");
  const isAdvanced = userTier === "advanced";

  return (
    <div style={{ padding: "24px 16px 64px", maxWidth: 860, margin: "0 auto" }}>

      {/* Page label */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 6, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          Biomarker Analysis · Report #{reportId.slice(0, 8)}
        </div>
        <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3vw,30px)", color: "#F1F5F9", margin: "0 0 3px", letterSpacing: "-.02em" }}>
          Health Report
        </h1>
      </div>

      {/* ── 1. Critical flags banner ─────────────────────────────────────────── */}
      {result.criticalFlags.length > 0 && (
        <CriticalFlagsBanner flags={result.criticalFlags} />
      )}

      {/* ── 2. Hero — bio age + score ring ──────────────────────────────────── */}
      <div className="card" style={{ padding: "24px 22px", marginBottom: 24, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
        {/* Subtle aurora background */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 50%,rgba(124,58,237,.08) 0%,transparent 70%)", pointerEvents: "none" }} />
        <BioAgeHero biologicalAge={biologicalAge} delta={biologicalAgeDelta} chronologicalAge={chronologicalAge} />
        <div style={{ borderLeft: `1px solid ${T.border}`, height: 120, flexShrink: 0, alignSelf: "center", display: "none" }} className="divider" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
          <ScoreRing score={result.overallScore} grade={result.overallGrade} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: T.sub, fontWeight: 300, lineHeight: 1.65, margin: "0 0 12px" }}>
            {result.summary}
          </p>
          <a href="/app/dashboard" style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#A5B4FC", textDecoration: "none" }}>
            ← Dashboard
          </a>
        </div>
      </div>

      {/* ── 3. Domain grid (4×2 = 7 domain cards + 1 coverage card) ─────────── */}
      <Section label="Domain Scores">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {result.domainScores.map((d) => <DomainCard key={d.domain} d={d} />)}
          <CoverageCard
            completeness={result.dataCompleteness}
            retestIn={result.retestIn}
            generatedAt={generatedAt}
          />
        </div>
        <style>{`@media(max-width:700px){.domain-grid{grid-template-columns:repeat(2,1fr)!important}}`}</style>
      </Section>

      {/* ── 4. Protocol tabs ─────────────────────────────────────────────────── */}
      <Section label="Your Protocol">
        {/* Tab strip */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {PROTO_TABS.map((t) => {
            const active = t === protoTab;
            return (
              <button key={t} onClick={() => setProtoTab(t)} style={{
                padding: "7px 14px", borderRadius: 8, border: active ? "1px solid rgba(124,58,237,.5)" : `1px solid ${T.border}`,
                background: active ? "rgba(124,58,237,.15)" : "transparent",
                color: active ? "#A5B4FC" : T.muted,
                fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, cursor: "pointer",
                fontWeight: active ? 500 : 300, transition: "all .15s",
              }}>
                {t}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {protoTab === "Supplements"  && (result.protocol.supplements.length  === 0 ? <Empty text="No supplement recommendations." /> : result.protocol.supplements.map((s, i) => <SupplementRow key={i} s={s} />))}
          {protoTab === "Nutrition"    && (result.protocol.nutrition.length    === 0 ? <Empty text="No nutrition interventions." /> : result.protocol.nutrition.map((n, i) => <NutritionRow key={i} n={n} />))}
          {protoTab === "Training"     && (result.protocol.training.length     === 0 ? <Empty text="No training recommendations." /> : result.protocol.training.map((t, i) => <TrainingRow key={i} t={t} />))}
          {protoTab === "Sleep"        && (result.protocol.sleep.length        === 0 ? <Empty text="No sleep interventions." /> : result.protocol.sleep.map((s, i) => <SleepRow key={i} s={s} />))}
          {protoTab === "Diagnostics"  && (result.protocol.diagnostics.length  === 0 ? <Empty text="No diagnostic recommendations." /> : result.protocol.diagnostics.map((d, i) => <DiagnosticsRow key={i} d={d} />))}
        </div>
      </Section>

      {/* ── 5. Cross-domain signals (advanced only) ──────────────────────────── */}
      {isAdvanced && result.crossDomainSignals.length > 0 && (
        <Section label="Cross-Domain Signals" advancedOnly>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.crossDomainSignals.map((s, i) => <SignalCard key={i} s={s} />)}
          </div>
        </Section>
      )}

      {/* ── 6. Reasoning chain accordion (advanced only) ─────────────────────── */}
      {isAdvanced && result.keyFindings.length > 0 && (
        <Section label="Reasoning Chain" advancedOnly>
          <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.5, margin: "0 0 12px" }}>
            Individual biomarker findings that informed the domain scores and protocol recommendations. Expand each to see the clinical interpretation.
          </p>
          <FindingAccordion findings={result.keyFindings} />
        </Section>
      )}

      {/* ── 7. Disclaimer footer ─────────────────────────────────────────────── */}
      <div style={{ padding: "16px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: `1px solid ${T.border}` }}>
        <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: T.muted, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
          {result.disclaimer}
        </p>
      </div>

    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: T.muted, fontWeight: 300, padding: "12px 0" }}>
      {text}
    </p>
  );
}
