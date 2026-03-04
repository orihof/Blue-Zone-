/// app/app/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";

// ── Inline shared components ────────────────────────────────────────────────

function SparkLine({ data, color, w = 200, h = 40 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  const lastPt = pts.split(" ").at(-1)!.split(",");
  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, "")}-${w}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color} />
    </svg>
  );
}

function RingScore({ value, max = 100, size = 64, color }: { value: number; max?: number; size?: number; color: string }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${circ * (value / max)} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.16,1,.3,1)" }}
      />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 400, letterSpacing: ".12em", textTransform: "uppercase" as const,
      color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)",
    }}>
      {children}
    </span>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 100,
      background: bg, color, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400,
    }}>
      {label}
    </span>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T = { text: "#F1F5F9", muted: "#64748B" };

const STATUS = {
  optimal: { color: "#10B981", bg: "rgba(16,185,129,.15)", label: "Optimal" },
  good:    { color: "#3B82F6", bg: "rgba(59,130,246,.15)", label: "Good" },
  warning: { color: "#F59E0B", bg: "rgba(245,158,11,.15)", label: "Needs Work" },
  critical:{ color: "#EF4444", bg: "rgba(239,68,68,.15)",  label: "Critical" },
} as const;

// ── Data ─────────────────────────────────────────────────────────────────────

const HERO_METRICS = [
  {
    label: "Biological Age", value: 34, unit: " yrs", sub: "4 years younger than chronological",
    trend: [37, 36, 36, 35, 35, 34, 34], color: "#10B981", progress: 85,
    status: "optimal" as const,
  },
  {
    label: "Vitality Score", value: 83, unit: "/100", sub: "+6 from last month",
    trend: [70, 72, 75, 77, 79, 81, 83], color: "#3B82F6", progress: 83,
    status: "good" as const,
  },
  {
    label: "Readiness", value: 74, unit: "/100", sub: "Trending up",
    trend: [64, 66, 68, 70, 71, 72, 74], color: "#A855F7", progress: 74,
    status: "good" as const,
  },
];

const BAR_CHART = {
  days:   ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  scores: [71, 78, 74, 82, 79, 85, 83],
};

interface Module {
  id: string; title: string; category: string; value: string;
  trend: number[]; color: string; status: keyof typeof STATUS;
  evidenceTier: "A" | "B" | "C"; detail: string; chips: string[];
}

const MODULES: Module[] = [
  { id: "m1",  title: "Biological Age Trend",  category: "Longevity",       value: "34 yrs",    trend: [37,36,36,35,35,34,34],              color: "#10B981", status: "optimal", evidenceTier: "A", detail: "Biological age is 4 years below chronological. Primary drivers: HRV improvement (+10ms), sleep quality gains, and inflammatory reduction.", chips: ["HRV: 54ms↑", "Sleep: 71→", "hsCRP: 1.4"] },
  { id: "m2",  title: "HRV Baseline",           category: "Cardiovascular",  value: "54 ms",     trend: [44,47,46,50,52,54,54],              color: "#3B82F6", status: "good",    evidenceTier: "A", detail: "HRV has improved 22% over 8 weeks, indicating parasympathetic nervous system recovery. Target: 60+ ms.", chips: ["Recovery: 72/100", "Zone 2 cardio", "Ashwagandha"] },
  { id: "m3",  title: "Sleep Quality",          category: "Recovery",        value: "71/100",    trend: [62,65,67,68,70,71,71],              color: "#6366F1", status: "good",    evidenceTier: "A", detail: "Sleep score trending up +9 points over 8 weeks. Still 9 points below the 80+ optimal range. Magnesium glycinate protocol initiated.", chips: ["Magnesium 400mg", "22:30 cutoff", "HRV linked"] },
  { id: "m4",  title: "Fasting Glucose",        category: "Metabolic",       value: "92 mg/dL",  trend: [95,94,93,93,92,92,92],              color: "#F59E0B", status: "warning", evidenceTier: "A", detail: "Above the 70–85 optimal range. Berberine HCl 500mg initiated. Target: reduce to <85 mg/dL within 90 days.", chips: ["Berberine 500mg", "Zone 2 cardio", "HbA1c: 5.3"] },
  { id: "m5",  title: "hsCRP (Inflammation)",   category: "Inflammation",    value: "1.4 mg/L",  trend: [1.8,1.7,1.6,1.5,1.5,1.4,1.4],      color: "#EF4444", status: "warning", evidenceTier: "A", detail: "Above the <1.0 mg/L optimal. Omega-3 supplementation reducing trend. EPA+DHA 3g/day reduces hsCRP ~0.4 mg/L per meta-analysis.", chips: ["Omega-3 3g/day", "Vitamin D: 52ng", "Anti-inflam diet"] },
  { id: "m6",  title: "Omega-3 Index",          category: "Inflammation",    value: "6.2%",      trend: [5.5,5.7,5.9,6.0,6.1,6.1,6.2],      color: "#F59E0B", status: "warning", evidenceTier: "A", detail: "Below the 8–12% optimal range. Nordic Naturals Omega-3 initiated. EPA+DHA 3g/day expected to reach 8%+ in 12 weeks.", chips: ["Nordic Naturals", "3g EPA+DHA", "Target: 8–12%"] },
  { id: "m7",  title: "CoQ10 Plasma",           category: "Metabolic",       value: "0.8 mg/L",  trend: [0.6,0.65,0.7,0.72,0.75,0.78,0.8],  color: "#A855F7", status: "warning", evidenceTier: "B", detail: "Below the 1.0 mg/L target. Jarrow Ubiquinol 200mg initiated. Supports mitochondrial Complex I/II for ATP synthesis.", chips: ["Ubiquinol 200mg", "Mitochondrial", "Recovery: 72/100"] },
  { id: "m8",  title: "Testosterone (Total)",   category: "Hormonal",        value: "620 ng/dL", trend: [600,605,608,612,615,618,620],        color: "#10B981", status: "optimal", evidenceTier: "A", detail: "Upper-optimal range (400–700 ng/dL). Primary longevity driver. Maintaining with sleep optimization and resistance training.", chips: ["Sleep quality", "Resistance training", "Zinc status OK"] },
  { id: "m9",  title: "Vitamin D (25-OH)",      category: "Hormonal",        value: "52 ng/mL",  trend: [48,49,50,51,51,52,52],              color: "#10B981", status: "optimal", evidenceTier: "A", detail: "Adequate (40–80 ng/mL). D3+K2 5000IU initiated to optimize toward 60–80 ng/mL range for VDR pathway benefits.", chips: ["D3+K2 5000IU", "VDR pathway", "Target: 60–80"] },
  { id: "m10", title: "Recovery Score",         category: "Fitness",         value: "72/100",    trend: [64,66,68,70,71,72,72],              color: "#3B82F6", status: "good",    evidenceTier: "A", detail: "Plateaued at 72. Ashwagandha KSM-66 600mg initiated. Reduces cortisol ~28%, improves VO₂ max per double-blind RCT.", chips: ["Ashwagandha KSM-66", "Cortisol: high", "Zone 2 cardio"] },
  { id: "m11", title: "Resting Heart Rate",     category: "Cardiovascular",  value: "58 bpm",    trend: [63,62,61,60,59,58,58],              color: "#10B981", status: "optimal", evidenceTier: "A", detail: "Optimal range (<60 bpm for longevity). Consistent Zone 2 cardio (130–145 BPM, 45 min) driving improvement.", chips: ["Zone 2: 45min", "HRV: 54ms", "Parasympathetic↑"] },
  { id: "m12", title: "HbA1c",                 category: "Metabolic",       value: "5.3%",      trend: [5.5,5.5,5.4,5.4,5.3,5.3,5.3],      color: "#10B981", status: "optimal", evidenceTier: "A", detail: "Near-optimal (<5.4%). 90-day average glucose control is excellent. Berberine protocol supporting trend.", chips: ["Fasting glucose: 92", "Berberine initiated", "Target: <5.0"] },
];

const PILLARS = [
  { id: "p1", name: "Cardiovascular", score: 81, color: "#3B82F6", icon: "♥", detail: "HRV improving (+22%), resting HR optimal at 58 bpm, Zone 2 cardio 3×/week consistent." },
  { id: "p2", name: "Metabolic",      score: 68, color: "#F59E0B", icon: "⚡", detail: "Fasting glucose elevated (92 mg/dL), CoQ10 low (0.8 mg/L). Berberine + Ubiquinol protocol active." },
  { id: "p3", name: "Hormonal",       score: 88, color: "#10B981", icon: "◉", detail: "Testosterone upper-optimal (620 ng/dL), Vitamin D adequate (52 ng/mL), TSH normal (1.9 mIU/L)." },
  { id: "p4", name: "Inflammation",   score: 62, color: "#EF4444", icon: "🔥", detail: "hsCRP 1.4 mg/L above optimal, Omega-3 Index 6.2% below target. Omega-3 + D3 protocol active." },
  { id: "p5", name: "Sleep/Recovery", score: 72, color: "#6366F1", icon: "🌙", detail: "Sleep quality 71/100 trending up. Recovery 72/100 plateaued. Magnesium glycinate initiated." },
  { id: "p6", name: "Fitness",        score: 74, color: "#A855F7", icon: "◫", detail: "Recovery score trending but plateaued at 72. Ashwagandha KSM-66 600mg initiated." },
];

const COMPOSITE_SCORE = 83;

const PROTOCOLS = [
  { id: "pr1", title: "Inflammation Reduction",  borderColor: "#EF4444", adherence: 78, updated: "2d ago", items: ["Nordic Naturals Omega-3 3g/day", "Vitamin D3+K2 5000IU", "Anti-inflammatory diet protocol"] },
  { id: "pr2", title: "Metabolic Optimization",  borderColor: "#F59E0B", adherence: 82, updated: "2d ago", items: ["Berberine HCl 500mg (with meals)", "CoQ10 Ubiquinol 200mg", "Zone 2 cardio 3×/week"] },
  { id: "pr3", title: "Sleep & Recovery",        borderColor: "#6366F1", adherence: 91, updated: "2d ago", items: ["Magnesium Glycinate 400mg at 22:00", "Sleep target: 22:30 lights-out", "HRV morning tracking"] },
  { id: "pr4", title: "Hormonal Support",        borderColor: "#10B981", adherence: 95, updated: "2d ago", items: ["Resistance training 3×/week", "Zinc + Selenium support", "Morning sunlight 10 min"] },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab]         = useState<"overview" | "pillars" | "protocols">("overview");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <style>{`
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 400px; } }
        .module-card {
          background: #111827;
          border: 1px solid rgba(99,102,241,0.12);
          border-radius: 12px;
          padding: 18px;
          cursor: pointer;
          transition: border-color .2s, background .2s;
        }
        .module-card:hover  { border-color: rgba(99,102,241,0.3); background: #161F30; }
        .module-card.card-active { border-color: rgba(99,102,241,0.4); background: #161F30; }
        .slide-down { animation: slideDown .22s ease-out forwards; overflow: hidden; }
      `}</style>

      <div className="px-4 md:px-6 lg:px-8 py-6 lg:py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="fu" style={{ marginBottom: 28 }}>
          <SectionLabel>◫ Analytics</SectionLabel>
          <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3vw,32px)", color: T.text, marginTop: 6, marginBottom: 6, letterSpacing: "-.02em" }}>
            Health Analytics
          </h1>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Comprehensive view of your biomarkers, trends, and active protocols.
          </p>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="fu1" style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {([
            ["overview",  "Overview"],
            ["pillars",   "Pillar Analysis"],
            ["protocols", "Active Protocols"],
          ] as const).map(([key, lbl]) => (
            <button key={key} onClick={() => setTab(key)} className={`tab ${tab === key ? "on" : "off"}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <>
            {/* Hero metric cards */}
            <div className="fu2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 24 }}>
              {HERO_METRICS.map((m) => {
                const s = STATUS[m.status];
                return (
                  <div key={m.label} className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <SectionLabel>{m.label}</SectionLabel>
                      <Badge label={s.label} color={s.color} bg={s.bg} />
                    </div>
                    <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 36, lineHeight: 1.1, ...GT }}>
                      {m.value}
                      <span style={{ fontSize: 14, color: T.muted, WebkitTextFillColor: T.muted }}>{m.unit}</span>
                    </div>
                    <div style={{ fontSize: 11, color: m.color, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 3, marginBottom: 12 }}>
                      {m.sub}
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: GRAD, width: mounted ? `${m.progress}%` : "0%", transition: "width 1.2s cubic-bezier(.16,1,.3,1)" }} />
                    </div>
                    <SparkLine data={m.trend} color={m.color} h={36} />
                  </div>
                );
              })}
            </div>

            {/* 7-day bar chart */}
            <div className="fu3 card" style={{ padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <SectionLabel>7-day trend</SectionLabel>
                  <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 16, color: T.text, marginTop: 2 }}>
                    Daily Vitality Score
                  </div>
                </div>
                <Badge label="This Week" color="#6366F1" bg="rgba(99,102,241,.15)" />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 88 }}>
                {BAR_CHART.scores.map((score, i) => {
                  const barH = (score / 100) * 72;
                  const isToday = i === BAR_CHART.scores.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", height: 72, display: "flex", alignItems: "flex-end" }}>
                        <div style={{
                          width: "100%", borderRadius: "4px 4px 0 0",
                          background: isToday ? GRAD : "rgba(99,102,241,.22)",
                          height: mounted ? barH : 0,
                          transition: `height 1.2s cubic-bezier(.16,1,.3,1) ${i * 0.06}s`,
                        }} />
                      </div>
                      <div style={{ fontSize: 9, color: isToday ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        {BAR_CHART.days[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Module cards header */}
            <div className="fu4" style={{ marginBottom: 12 }}>
              <SectionLabel>All modules</SectionLabel>
              <p style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 3 }}>
                {MODULES.length} biomarker modules — click any card to expand
              </p>
            </div>

            {/* 12 Module cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
              {MODULES.map((mod, i) => {
                const isOpen = expanded === mod.id;
                const s = STATUS[mod.status];
                return (
                  <div
                    key={mod.id}
                    className={`module-card fu${Math.min((i % 4) + 1, 5) as 1|2|3|4|5}${isOpen ? " card-active" : ""}`}
                    onClick={() => setExpanded(isOpen ? null : mod.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 3 }}>
                          {mod.category}
                        </div>
                        <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 14, color: T.text }}>
                          {mod.title}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                        <Badge label={s.label} color={s.color} bg={s.bg} />
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,.05)", color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
                          Tier {mod.evidenceTier}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 16, color: mod.color }}>
                        {mod.value}
                      </div>
                      <div style={{ width: 80 }}>
                        <SparkLine data={mod.trend} color={mod.color} w={80} h={28} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: isOpen ? 10 : 0 }}>
                      {mod.chips.map((c) => (
                        <span key={c} className="chip" style={{ fontSize: 9 }}>{c}</span>
                      ))}
                    </div>

                    {isOpen && (
                      <div className="slide-down" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 6 }}>
                        <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.65, margin: 0 }}>
                          {mod.detail}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — PILLAR ANALYSIS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "pillars" && (
          <>
            {/* Composite score hero + ring row */}
            <div className="fu2 card" style={{ padding: 28, marginBottom: 24, textAlign: "center" }}>
              <SectionLabel>Composite Health Score</SectionLabel>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 64, ...GT, margin: "8px 0 2px", lineHeight: 1 }}>
                {COMPOSITE_SCORE}
              </div>
              <div style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 28 }}>
                out of 100 — Top 18% for your age group
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {PILLARS.map((p) => (
                  <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <RingScore value={p.score} size={64} color={p.color} />
                    <div style={{ fontSize: 9, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", textAlign: "center", maxWidth: 60 }}>
                      {p.name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, color: p.color }}>
                      {p.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6 pillar cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
              {PILLARS.map((p, i) => (
                <div key={p.id} className={`card fu${Math.min(i + 1, 5) as 1|2|3|4|5}`} style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{p.icon}</span>
                      <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: T.text }}>
                        {p.name}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 22, color: p.color }}>
                      {p.score}
                    </div>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginBottom: 12, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      background: `linear-gradient(90deg,${p.color}66,${p.color})`,
                      width: mounted ? `${p.score}%` : "0%",
                      transition: `width 1.2s cubic-bezier(.16,1,.3,1) ${i * 0.1}s`,
                    }} />
                  </div>
                  <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.65, margin: 0 }}>
                    {p.detail}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — ACTIVE PROTOCOLS
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "protocols" && (
          <>
            <div className="fu2" style={{ marginBottom: 16 }}>
              <SectionLabel>Active protocols</SectionLabel>
              <p style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 3 }}>
                {PROTOCOLS.length} protocols running in parallel
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PROTOCOLS.map((pr, i) => (
                <div key={pr.id} className={`card fu${Math.min(i + 1, 5) as 1|2|3|4|5}`} style={{ padding: 22, borderLeft: `3px solid ${pr.borderColor}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 16, color: T.text, marginBottom: 2 }}>
                        {pr.title}
                      </div>
                      <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        Updated {pr.updated}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 24, color: pr.borderColor, lineHeight: 1 }}>
                        {pr.adherence}%
                      </div>
                      <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>adherence</div>
                    </div>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginBottom: 14, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      background: `linear-gradient(90deg,${pr.borderColor}55,${pr.borderColor})`,
                      width: mounted ? `${pr.adherence}%` : "0%",
                      transition: `width 1.2s cubic-bezier(.16,1,.3,1) ${i * 0.12}s`,
                    }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {pr.items.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        <span style={{ color: pr.borderColor, flexShrink: 0 }}>✓</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </>
  );
}
