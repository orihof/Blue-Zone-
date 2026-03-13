/// components/analysis/AnalysisResultsPage.tsx
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

const T  = { text: "#F1F5F9", muted: "#64748B", border: "rgba(255,255,255,.07)" };
const GRADE_C: Record<string, string> = {
  A: "#10B981", B: "#3B82F6", C: "#F59E0B", D: "#F97316", F: "#EF4444",
};

const STATUS_C: Record<string, string> = {
  optimal: "#10B981", normal: "#3B82F6", low: "#F59E0B", high: "#F97316", critical: "#EF4444",
};

const DOMAIN_ICONS: Record<string, string> = {
  metabolic: "🔬", cardiovascular: "❤️", hormonal: "⚗️",
  inflammatory: "🔥", nutritional: "🌿", recovery: "⚡", cognitive: "🧠",
};

const URGENCY_C: Record<string, string> = {
  discuss_at_next_visit: "#3B82F6",
  schedule_soon:         "#F59E0B",
  seek_care_today:       "#EF4444",
};
const URGENCY_L: Record<string, string> = {
  discuss_at_next_visit: "Discuss at next visit",
  schedule_soon:         "Schedule soon",
  seek_care_today:       "Seek care today",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreCircle({ score, grade }: { score: number; grade: string }) {
  const c  = GRADE_C[grade] ?? "#3B82F6";
  const r  = 54;
  const cx = 64;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
      <svg width={128} height={128} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={10} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={c} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${c}88)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 32, fontWeight: 300, color: c, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: T.muted, marginTop: 2 }}>Grade {grade}</span>
      </div>
    </div>
  );
}

function DomainBar({ d }: { d: DomainScore }) {
  const c = GRADE_C[d.grade] ?? "#3B82F6";
  return (
    <div style={{ padding: "13px 16px", background: "rgba(255,255,255,.03)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15 }}>{DOMAIN_ICONS[d.domain] ?? "🔬"}</span>
          <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, fontWeight: 500, color: T.text, textTransform: "capitalize" }}>{d.domain}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, color: c }}>{d.score}</span>
          <span style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, fontWeight: 500, background: `${c}22`, color: c, border: `1px solid ${c}44` }}>{d.grade}</span>
        </div>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${d.score}%`, background: `linear-gradient(90deg,${c},${c}99)`, borderRadius: 2, boxShadow: `0 0 6px ${c}66` }} />
      </div>
      {d.summary && (
        <p style={{ marginTop: 7, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: T.muted, fontWeight: 300, lineHeight: 1.5 }}>{d.summary}</p>
      )}
    </div>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const c = STATUS_C[f.status] ?? "#3B82F6";
  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${c}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 13, fontWeight: 500, color: T.text }}>{f.marker}</span>
          <span style={{ marginLeft: 8, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, color: c }}>{f.value} {f.unit}</span>
        </div>
        <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 500, background: `${c}22`, color: c, border: `1px solid ${c}44`, flexShrink: 0, marginLeft: 8, textTransform: "capitalize" }}>
          {f.status}
        </span>
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.55, margin: 0 }}>
        {f.interpretation}
      </p>
      {f.relatedDomains.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {f.relatedDomains.map((d) => (
            <span key={d} style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: "rgba(255,255,255,.05)", color: T.muted, border: `1px solid ${T.border}`, textTransform: "capitalize" }}>{d}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SignalCard({ s }: { s: CrossDomainSignal }) {
  const pColors: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#3B82F6" };
  const c = pColors[s.priority] ?? "#3B82F6";
  return (
    <div style={{ padding: "16px", background: "rgba(255,255,255,.03)", borderRadius: 10, border: `1px solid ${c}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text, flex: 1 }}>{s.signal}</span>
        <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 500, background: `${c}22`, color: c, border: `1px solid ${c}44`, flexShrink: 0, marginLeft: 10, textTransform: "uppercase" }}>{s.priority}</span>
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.55, margin: "0 0 10px" }}>{s.explanation}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {s.domains.map((d) => (
          <span key={d} style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: "rgba(99,102,241,.12)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,.25)", textTransform: "capitalize" }}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function SupplementCard({ s }: { s: SupplementRecommendation }) {
  const c = s.priority === 1 ? "#7C3AED" : s.priority === 2 ? "#3B82F6" : "#64748B";
  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text }}>{s.name}</span>
        <span style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: `${c}22`, color: c, border: `1px solid ${c}44` }}>P{s.priority}</span>
      </div>
      <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#A5B4FC", marginBottom: 6 }}>
        {s.dose} · {s.timing}{s.form ? ` · ${s.form}` : ""}
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.5, margin: 0 }}>{s.rationale}</p>
      {(s.contraindications ?? []).length > 0 && (
        <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)" }}>
          <span style={{ fontSize: 10, color: "#FCA5A5", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>⚠ {s.contraindications!.join("; ")}</span>
        </div>
      )}
    </div>
  );
}

function SimpleCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ padding: "13px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 4 }}>{label}</div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.5, margin: 0 }}>{desc}</p>
    </div>
  );
}

function CriticalFlagCard({ f }: { f: CriticalFlag }) {
  const c = URGENCY_C[f.urgency] ?? "#F59E0B";
  return (
    <div style={{ padding: "16px", background: `${c}0a`, borderRadius: 10, border: `1px solid ${c}44` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 13, fontWeight: 500, color: T.text }}>{f.marker}{f.value ? ` (${f.value})` : ""}</span>
        <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600, background: `${c}22`, color: c, border: `1px solid ${c}55` }}>{URGENCY_L[f.urgency]}</span>
      </div>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.text, fontWeight: 300, lineHeight: 1.5, margin: "0 0 8px" }}>{f.concern}</p>
      <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: c, fontWeight: 400, lineHeight: 1.5, margin: 0 }}>→ {f.action}</p>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 4, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>{title}</div>
        {subtitle && <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, margin: 0 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const PROTOCOL_TABS = ["Supplements", "Nutrition", "Training", "Sleep", "Diagnostics"] as const;
type ProtocolTab = typeof PROTOCOL_TABS[number];

export function AnalysisResultsPage({
  result,
  reportId,
  generatedAt,
}: {
  result:      AnalysisResult;
  reportId:    string;
  generatedAt: string;
}) {
  const [tab, setTab] = useState<ProtocolTab>("Supplements");

  const gradeColor = GRADE_C[result.overallGrade] ?? "#3B82F6";
  const genDate    = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ padding: "24px 16px 48px", maxWidth: 800, margin: "0 auto" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 6, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>Biomarker Analysis</div>
        <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3vw,32px)", color: T.text, margin: "0 0 4px", letterSpacing: "-.02em" }}>
          Your Health Report
        </h1>
        <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: T.muted }}>
          Generated {genDate} · Report #{reportId.slice(0, 8)}
        </div>
      </div>

      {/* ── Overall score ────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 24, display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <ScoreCircle score={result.overallScore} grade={result.overallGrade} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: gradeColor, marginBottom: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
            Overall Health Score
          </div>
          <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, color: T.text, fontWeight: 300, lineHeight: 1.6, margin: "0 0 12px" }}>{result.summary}</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 10, color: T.muted, marginBottom: 2 }}>DATA COMPLETENESS</div>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 18, fontWeight: 300, color: T.text }}>{Math.round(result.dataCompleteness * 100)}%</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 10, color: T.muted, marginBottom: 2 }}>RETEST IN</div>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 18, fontWeight: 300, color: T.text }}>{result.retestIn}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Critical flags ───────────────────────────────────────────────────── */}
      {result.criticalFlags.length > 0 && (
        <Section title="Critical Flags" subtitle="These findings may require prompt medical attention.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.criticalFlags.map((f, i) => <CriticalFlagCard key={i} f={f} />)}
          </div>
        </Section>
      )}

      {/* ��─ Domain scores ────────────────────────────────────────────────────── */}
      <Section title="Domain Scores" subtitle="Health optimization score per clinical domain (0–100).">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          {result.domainScores.map((d) => <DomainBar key={d.domain} d={d} />)}
        </div>
      </Section>

      {/* ── Key findings ─────────────────────────────────────────────────────── */}
      {result.keyFindings.length > 0 && (
        <Section title="Key Findings" subtitle="Notable biomarker observations ranked by clinical significance.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.keyFindings.map((f, i) => <FindingCard key={i} f={f} />)}
          </div>
        </Section>
      )}

      {/* ── Cross-domain signals ─────────────────────────────────────────────── */}
      {result.crossDomainSignals.length > 0 && (
        <Section title="Cross-Domain Signals" subtitle="Patterns that span multiple clinical domains — often the most actionable insights.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.crossDomainSignals.map((s, i) => <SignalCard key={i} s={s} />)}
          </div>
        </Section>
      )}

      {/* ── Protocol ─────────────────────────────────────────────────────────── */}
      <Section title="Your Protocol" subtitle="Personalised interventions across supplements, nutrition, training, sleep, and diagnostics.">
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {PROTOCOL_TABS.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding:    "7px 14px",
                  borderRadius: 8,
                  border:     active ? "1px solid rgba(124,58,237,.5)" : `1px solid ${T.border}`,
                  background: active ? "rgba(124,58,237,.15)" : "transparent",
                  color:      active ? "#A5B4FC" : T.muted,
                  fontFamily: "var(--font-ui,'Inter',sans-serif)",
                  fontSize:   12,
                  cursor:     "pointer",
                  fontWeight: active ? 500 : 300,
                  transition: "all .15s",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === "Supplements" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.protocol.supplements.length === 0
              ? <p style={{ color: T.muted, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>No supplement recommendations.</p>
              : result.protocol.supplements.map((s, i) => <SupplementCard key={i} s={s} />)
            }
          </div>
        )}

        {tab === "Nutrition" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.protocol.nutrition.length === 0
              ? <p style={{ color: T.muted, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>No nutrition interventions.</p>
              : result.protocol.nutrition.map((n: NutritionRecommendation, i) => (
                <SimpleCard key={i} label={n.intervention} desc={n.description} />
              ))
            }
          </div>
        )}

        {tab === "Training" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.protocol.training.length === 0
              ? <p style={{ color: T.muted, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>No training recommendations.</p>
              : result.protocol.training.map((t: TrainingRecommendation, i) => (
                <div key={i} style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 4 }}>{t.type}</div>
                  <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#A5B4FC", marginBottom: 6 }}>
                    {t.frequency} · {t.duration} · {t.intensity}
                  </div>
                  <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.5, margin: 0 }}>{t.rationale}</p>
                </div>
              ))
            }
          </div>
        )}

        {tab === "Sleep" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.protocol.sleep.length === 0
              ? <p style={{ color: T.muted, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>No sleep interventions.</p>
              : result.protocol.sleep.map((s: SleepRecommendation, i) => (
                <SimpleCard key={i} label={s.intervention} desc={s.description} />
              ))
            }
          </div>
        )}

        {tab === "Diagnostics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.protocol.diagnostics.length === 0
              ? <p style={{ color: T.muted, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>No diagnostic recommendations.</p>
              : result.protocol.diagnostics.map((d: DiagnosticRecommendation, i) => {
                const urgColors: Record<string, string> = { routine: "#3B82F6", soon: "#F59E0B", urgent: "#EF4444" };
                const uc = urgColors[d.urgency] ?? "#3B82F6";
                return (
                  <div key={i} style={{ padding: "14px 16px", background: "rgba(255,255,255,.025)", borderRadius: 10, border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: T.text }}>{d.test}</span>
                      <span style={{ padding: "1px 7px", borderRadius: 100, fontSize: 10, background: `${uc}22`, color: uc, border: `1px solid ${uc}44`, textTransform: "capitalize" }}>{d.urgency}</span>
                    </div>
                    <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: T.muted, fontWeight: 300, lineHeight: 1.5, margin: 0 }}>{d.rationale}</p>
                  </div>
                );
              })
            }
          </div>
        )}
      </Section>

      {/* ── Disclaimer ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: `1px solid ${T.border}`, marginTop: 8 }}>
        <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: T.muted, fontWeight: 300, lineHeight: 1.6, margin: 0 }}>
          {result.disclaimer}
        </p>
      </div>

      {/* ── Back link ────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <a href="/app/dashboard" style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: T.muted, textDecoration: "none" }}>
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
