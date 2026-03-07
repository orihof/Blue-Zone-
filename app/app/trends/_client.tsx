/// app/app/trends/_client.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const T = { muted: "#64748B", text: "#F1F5F9" };

// ── Per-metric config ─────────────────────────────────────────────────────────
const METRIC_CFG: Record<string, {
  domain:       [number, number];
  zones:        { min: number; max: number; fill: string }[];
  optimalMin:   number;
  goodMin:      number;
  protocolHref: string;
}> = {
  hrv: {
    domain:      [20, 90],
    zones: [
      { min: 20, max: 30, fill: "rgba(239,68,68,0.08)"   },
      { min: 30, max: 50, fill: "rgba(245,158,11,0.08)"  },
      { min: 50, max: 90, fill: "rgba(16,185,129,0.08)"  },
    ],
    optimalMin:  50,
    goodMin:     30,
    protocolHref: "/app/results",
  },
  sleep: {
    domain:      [40, 100],
    zones: [
      { min: 40, max: 55, fill: "rgba(239,68,68,0.08)"   },
      { min: 55, max: 70, fill: "rgba(245,158,11,0.08)"  },
      { min: 70, max: 100, fill: "rgba(16,185,129,0.08)" },
    ],
    optimalMin:  70,
    goodMin:     55,
    protocolHref: "/app/results",
  },
  recovery: {
    domain:      [40, 100],
    zones: [
      { min: 40, max: 50, fill: "rgba(239,68,68,0.08)"   },
      { min: 50, max: 67, fill: "rgba(245,158,11,0.08)"  },
      { min: 67, max: 100, fill: "rgba(16,185,129,0.08)" },
    ],
    optimalMin:  67,
    goodMin:     50,
    protocolHref: "/app/results",
  },
};

// ── Status helpers ────────────────────────────────────────────────────────────
type StatusKey = "optimal" | "good" | "warn" | "critical";

function scoreToStatus(v: number, key: string): StatusKey {
  if (key === "hrv") {
    if (v >= 50) return "optimal";
    if (v >= 35) return "good";
    if (v >= 25) return "warn";
    return "critical";
  }
  if (v >= 70) return "optimal";
  if (v >= 55) return "good";
  if (v >= 40) return "warn";
  return "critical";
}

const STATUS_COLOR: Record<StatusKey, string> = {
  optimal: "#10B981", good: "#3B82F6", warn: "#F59E0B", critical: "#EF4444",
};
const STATUS_BG: Record<StatusKey, string> = {
  optimal: "rgba(16,185,129,.12)", good: "rgba(59,130,246,.12)",
  warn: "rgba(245,158,11,.12)", critical: "rgba(239,68,68,.12)",
};
const STATUS_LABEL: Record<StatusKey, string> = {
  optimal: "Optimal", good: "Good", warn: "Attention", critical: "Critical",
};
const STATUS_ICON: Record<StatusKey, string> = {
  optimal: "✓", good: "↑", warn: "⚠", critical: "↓",
};
const WEIGHTS: Record<string, number> = { hrv: 0.4, sleep: 0.35, recovery: 0.25 };

// ── Trend helpers ─────────────────────────────────────────────────────────────
function consecutivePositiveWeeks(data: number[]): number {
  let count = 0;
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i] > data[i - 1]) count++;
    else break;
  }
  return count;
}

function coachingInsight(key: string, _latest: number, weeklyDelta: number, status: StatusKey): string {
  const abs = Math.abs(Math.round(weeklyDelta));
  if (key === "hrv") {
    if (status === "warn" || status === "critical")
      return "HRV declining — Magnesium Glycinate + Tart Cherry is the primary lever. Consistent sleep timing (±30 min) has the highest single impact on HRV baseline.";
    if (weeklyDelta > 0)
      return `HRV up ${abs}ms this week — your evening supplement stack is working. Keep Magnesium Glycinate 60 min before bed for best results.`;
    return "HRV in a stable range. Prioritise consistent bedtimes and stress management to push above 50ms.";
  }
  if (key === "sleep") {
    if (status === "warn" || status === "critical")
      return "Sleep quality below 70 correlates with higher injury risk and poor recovery. Magnesium Glycinate (60 min before bed) is your most impactful lever here.";
    if (weeklyDelta > 0)
      return `Sleep quality up ${abs} points this week — maintain your wind-down routine to sustain this improvement.`;
    return "Sleep is solid. Adding Tart Cherry extract 30 min before bed may help deepen slow-wave sleep further.";
  }
  if (key === "recovery") {
    if (weeklyDelta > 0)
      return `Recovery up ${abs} points this week — your protocol is working. Consistency in your evening supplement stack will sustain this trend.`;
    if (status === "warn" || status === "critical")
      return "Recovery below 50 may signal accumulated fatigue. Consider a deload week and confirm Omega-3 + Vitamin D3 are taken consistently.";
    return "Recovery is stable. Improving HRV and sleep quality will naturally lift this score further.";
  }
  return "Track consistently to see personalised insights here.";
}

function weeklySummary(deltas: { label: string; weeklyDelta: number; key: string }[]): string {
  const improving = deltas.filter(d => d.weeklyDelta > 0);
  const declining  = deltas.filter(d => d.weeklyDelta < 0);
  if (improving.length === deltas.length)
    return "All metrics improving this week — your protocol is working. Keep your evening supplement stack consistent.";
  if (declining.length === deltas.length)
    return "All metrics declined this week. Check your sleep consistency and confirm you're taking Magnesium 60 min before bed.";
  const best     = improving[0]?.label ?? "";
  const worst    = declining[0]?.label ?? "";
  const worstKey = declining[0]?.key ?? "";
  const supp = worstKey === "recovery" ? "Omega-3 + Vitamin D3" : "Magnesium Glycinate";
  return `${best} is improving — good signal. ${worst} needs attention. Review your ${supp} timing.`;
}

// ── Protocol Impact Score ─────────────────────────────────────────────────────
function calculateImpactScore(filtered: MetricRow[], raw: MetricInput[]): number {
  let sum = 0, totalW = 0;
  for (const m of filtered) {
    const full    = raw.find(r => r.key === m.key)?.data ?? m.data;
    const base    = full[0];
    const current = m.data[m.data.length - 1];
    if (!base || base === 0) continue;
    const pct = (current - base) / base * 100;
    const w   = WEIGHTS[m.key] ?? (1 / filtered.length);
    sum += pct * w;
    totalW += w;
  }
  return totalW > 0 ? Math.round(sum) : 0;
}

function impactNarrative(score: number): string {
  if (score > 15)  return "Your protocol is delivering exceptional results. Continue your current stack.";
  if (score > 5)   return "Positive progress — keep your supplement stack consistent.";
  if (score > -5)  return "Early days — most improvements show after 4–6 weeks of consistency.";
  if (score > -15) return "Check your supplement timing and sleep schedule to reverse this trend.";
  return "Significant decline detected. Review your protocol adherence with your practitioner.";
}

// ── Share card (Canvas API) ───────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function generateShareCard(metrics: MetricRow[], impactScore: number, weekLabel: string) {
  const W = 600, H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#0D1117";
  ctx.fillRect(0, 0, W, H);

  // Subtle border
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // Top gradient bar (4px)
  const hg = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, "#3B82F6");
  hg.addColorStop(0.55, "#7C3AED");
  hg.addColorStop(1, "#A855F7");
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, W, 4);

  // BZ mark
  const bzGrad = ctx.createLinearGradient(32, 24, 64, 56);
  bzGrad.addColorStop(0, "#3B82F6"); bzGrad.addColorStop(1, "#7C3AED");
  ctx.fillStyle = bzGrad;
  roundRect(ctx, 32, 24, 32, 32, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("BZ", 41, 45);

  // Wordmark
  ctx.font = "400 16px sans-serif";
  ctx.fillStyle = "#F1F5F9";
  ctx.fillText("Blue Zone", 74, 44);
  ctx.font = "400 11px sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText(weekLabel, 74, 60);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(32, 72); ctx.lineTo(W - 32, 72); ctx.stroke();

  // Impact score
  const scoreColor = impactScore >= 5 ? "#10B981" : impactScore >= -5 ? "#F59E0B" : "#EF4444";
  ctx.font = "300 52px sans-serif";
  ctx.fillStyle = scoreColor;
  ctx.fillText(`${impactScore > 0 ? "+" : ""}${impactScore}%`, 32, 148);
  ctx.font = "400 11px sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText("Protocol Impact vs. baseline", 32, 168);

  // Metric deltas
  let x = 32;
  for (const m of metrics) {
    const delta = m.weeklyDelta;
    ctx.font = "400 9px sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText(m.label.toUpperCase(), x, 200);
    ctx.font = "300 18px monospace";
    ctx.fillStyle = delta >= 0 ? "#34D399" : "#F59E0B";
    const arrow = delta >= 0 ? "\u2191" : "\u2193";
    ctx.fillText(`${arrow} ${Math.abs(Math.round(delta))}${m.unit}`, x, 222);
    x += 180;
  }

  // Bottom divider + tagline
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath(); ctx.moveTo(32, 244); ctx.lineTo(W - 32, 244); ctx.stroke();
  ctx.font = "400 11px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("Tracked with Blue Zone", 32, 268);

  // Export
  const dataUrl = canvas.toDataURL("image/png");
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "blue-zone-week.png", { type: "image/png" });
    if (navigator.share && (navigator as { canShare?: (d: unknown) => boolean }).canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "My Blue Zone Week" });
      return;
    }
  } catch { /* fall through to download */ }
  const a = document.createElement("a");
  a.href = dataUrl; a.download = "blue-zone-week.png"; a.click();
}

// ── Chart geometry ────────────────────────────────────────────────────────────
const VW = 360; const VH = 92;
const PAD = { t: 8, r: 24, b: 4, l: 4 } as const;

function yFromVal(v: number, domMin: number, domMax: number): number {
  const h    = VH - PAD.t - PAD.b;
  const norm = (v - domMin) / (domMax - domMin);
  return PAD.t + h - norm * h;
}
function xFromIdx(i: number, n: number): number {
  return PAD.l + i * ((VW - PAD.l - PAD.r) / Math.max(n - 1, 1));
}

// ── Chart component ───────────────────────────────────────────────────────────
interface TooltipState { idx: number; xPct: number }
interface ChartMarker  { idx: number; name: string }

function TrendChart({ metricKey, data, weeks, color, markers }: {
  metricKey: string;
  data:      number[];
  weeks:     string[];
  color:     string;
  markers:   ChartMarker[];
}) {
  const cfg = METRIC_CFG[metricKey] ?? {
    domain: [0, 100] as [number, number], zones: [], optimalMin: 70, goodMin: 50, protocolHref: "/app/results",
  };
  const [domMin, domMax] = cfg.domain;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const mobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = data.length;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const rawI = Math.round(relX * (n - 1));
    const idx  = Math.max(0, Math.min(n - 1, rawI));
    const xPct = (PAD.l + idx * (VW - PAD.l - PAD.r) / Math.max(n - 1, 1)) / VW;
    setTooltip({ idx, xPct });
  }, [n]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const rawI = Math.round(relX * (n - 1));
    const idx  = Math.max(0, Math.min(n - 1, rawI));
    const xPct = (PAD.l + idx * (VW - PAD.l - PAD.r) / Math.max(n - 1, 1)) / VW;
    setTooltip({ idx, xPct });
    if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    mobileTimerRef.current = setTimeout(() => setTooltip(null), 3000);
  }, [n]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
  }, []);

  if (data.length < 2) {
    return (
      <div style={{ height: VH, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Not enough data yet</span>
      </div>
    );
  }

  const xs   = data.map((_, i) => xFromIdx(i, n));
  const ys   = data.map(v  => yFromVal(v, domMin, domMax));
  const pts  = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const botY = VH - PAD.b;
  const areaPts = `${xs[0]},${botY} ${pts} ${xs[n - 1]},${botY}`;
  const gradId  = `grad-${metricKey}`;
  const optY    = yFromVal(cfg.optimalMin, domMin, domMax);

  const tip       = tooltip;
  const tipVal    = tip !== null ? data[tip.idx]  : null;
  const tipWk     = tip !== null ? weeks[tip.idx] : null;
  const tipDelta  = tip !== null && tip.idx >= 1 ? data[tip.idx] - data[tip.idx - 1] : null;
  const tipStatus: StatusKey = tipVal !== null ? scoreToStatus(tipVal, metricKey) : "good";
  const tipMarker = tip !== null ? markers.find(m => m.idx === tip.idx) : null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none"
        style={{ display: "block", overflow: "hidden" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.28} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>

        {/* Reference zones */}
        {cfg.zones.map((z, zi) => {
          const y1 = yFromVal(Math.min(z.max, domMax), domMin, domMax);
          const y2 = yFromVal(Math.max(z.min, domMin), domMin, domMax);
          return <rect key={zi} x={PAD.l} y={y1} width={VW - PAD.l - PAD.r} height={y2 - y1} fill={z.fill} />;
        })}

        {/* Optimal dashed threshold */}
        <line x1={PAD.l} x2={VW - PAD.r} y1={optY} y2={optY}
          stroke="rgba(16,185,129,0.22)" strokeDasharray="4 3" strokeWidth={1} />

        {/* Area fill */}
        <polygon points={areaPts} fill={`url(#${gradId})`} />

        {/* Protocol event markers */}
        {markers.map((marker, mi) => (
          <g key={mi}>
            <line
              x1={xs[marker.idx]} x2={xs[marker.idx]} y1={PAD.t} y2={botY}
              stroke="rgba(124,58,237,0.5)" strokeDasharray="4 3" strokeWidth={1.5}
            />
            <circle
              cx={xs[marker.idx]} cy={PAD.t + 5} r={4.5}
              fill="#7C3AED" stroke="#0D1117" strokeWidth={1.5}
            />
          </g>
        ))}

        {/* Line */}
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Data point dots */}
        {xs.map((x, i) => {
          const active = tip?.idx === i;
          return (
            <circle key={i} cx={x} cy={ys[i]}
              r={active ? 4 : 2.5}
              fill={active ? color : "#0D1117"}
              stroke={color}
              strokeWidth={active ? 2.5 : 1.5}
            />
          );
        })}

        {/* Crosshair */}
        {tip && (
          <line x1={xs[tip.idx]} x2={xs[tip.idx]} y1={PAD.t} y2={botY}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        )}
      </svg>

      {/* Floating tooltip */}
      {tip && tipVal !== null && (
        <div style={{
          position: "absolute", top: 4, pointerEvents: "none", zIndex: 10,
          left: tip.xPct > 0.55
            ? `calc(${tip.xPct * 100}% - 122px)`
            : `calc(${tip.xPct * 100}% + 10px)`,
          background: "#1E293B",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "8px 12px", minWidth: 108,
        }}>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 2 }}>{tipWk}</div>
          <div style={{ fontSize: 17, color, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>{tipVal}</div>
          {tipDelta !== null && (
            <div style={{ fontSize: 10, color: tipDelta >= 0 ? "#34D399" : "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>
              {tipDelta >= 0 ? "↑" : "↓"} {Math.abs(Math.round(tipDelta))} vs prev
            </div>
          )}
          <div style={{ fontSize: 10, marginTop: 4, color: STATUS_COLOR[tipStatus], fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            {STATUS_ICON[tipStatus]} {STATUS_LABEL[tipStatus]}
          </div>
          {tipMarker && (
            <div style={{ marginTop: 5, padding: "2px 6px", background: "rgba(124,58,237,0.2)", borderRadius: 4, fontSize: 10, color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              📍 Started {tipMarker.name}
            </div>
          )}
        </div>
      )}

      {/* Protocol marker legend */}
      {markers.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <div style={{ width: 16, borderTop: "1.5px dashed rgba(124,58,237,0.55)" }} />
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Protocol started</span>
        </div>
      )}
    </div>
  );
}

// ── Time range selector ───────────────────────────────────────────────────────
const TIME_RANGES: { label: string; weeks: number | null }[] = [
  { label: "2W", weeks: 2  },
  { label: "4W", weeks: 4  },
  { label: "8W", weeks: 8  },
  { label: "All", weeks: null },
];

function TimeRangeSelector({ range, onChange }: { range: number | null; onChange: (r: number | null) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
      {TIME_RANGES.map(({ label, weeks }) => {
        const active = range === weeks;
        return (
          <button key={label} onClick={() => onChange(weeks)} style={{
            padding: "5px 14px", borderRadius: 100, fontSize: 11, cursor: "pointer",
            fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400,
            border: active ? "none" : "1px solid rgba(255,255,255,0.12)",
            background: active ? "linear-gradient(135deg,#7C3AED,#3B82F6)" : "transparent",
            color: active ? "#fff" : T.muted, transition: "all .15s",
          }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Weekly summary + Impact Score ─────────────────────────────────────────────
function WeeklySummaryCard({ metrics, raw }: { metrics: MetricRow[]; raw: MetricInput[] }) {
  if (metrics.every(m => m.data.length < 2)) return null;

  const text         = weeklySummary(metrics.map(m => ({ label: m.label, weeklyDelta: m.weeklyDelta, key: m.key })));
  const impactScore  = calculateImpactScore(metrics, raw);
  const scoreColor   = impactScore >= 5 ? "#10B981" : impactScore >= -5 ? "#F59E0B" : "#EF4444";
  const narrative    = impactNarrative(impactScore);

  const now  = new Date();
  const wStart = new Date(now); wStart.setDate(now.getDate() - now.getDay());
  const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekLabel = `${fmt(wStart)} – ${fmt(wEnd)}`;

  return (
    <div className="card" style={{ padding: "20px 20px", marginBottom: 18 }}>
      {/* Protocol Impact Score */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".1em", color: T.muted, textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>
            Protocol Impact
          </div>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 38, color: scoreColor, lineHeight: 1 }}>
            {impactScore > 0 ? "+" : ""}{impactScore}%
          </div>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 4 }}>vs. your baseline</div>
        </div>
        <p style={{ fontSize: 12, color: "#CBD5E1", fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.6, margin: 0, flex: 1, borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16 }}>
          {narrative}
        </p>
      </div>

      {/* This week vs last week */}
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".1em", color: T.muted, textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
        This week vs. last week
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
        {metrics.map(m => {
          const pos = m.weeklyDelta >= 0;
          return (
            <div key={m.key}>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 17, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300, color: pos ? "#34D399" : "#F59E0B" }}>
                {m.weeklyDelta === 0 ? "—" : `${pos ? "↑" : "↓"} ${Math.abs(Math.round(m.weeklyDelta))}${m.unit}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary + share */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
        <p style={{ fontSize: 12, color: "#CBD5E1", fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.65, margin: "0 0 12px" }}>
          {text}
        </p>
        <button
          onClick={() => generateShareCard(metrics, impactScore, weekLabel)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11,
            border: "1px solid rgba(255,255,255,0.15)", color: T.muted,
            padding: "6px 14px", borderRadius: 8, background: "transparent",
            cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)",
            transition: "border-color .15s, color .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.color = T.text; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = T.muted; }}
        >
          ↗ Share this week
        </button>
      </div>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ metric, idx, markers }: { metric: MetricRow; idx: number; markers: ChartMarker[] }) {
  const { key, label, unit, color, data, weeks, weeklyDelta } = metric;
  const latest     = data[data.length - 1] ?? 0;
  const status     = scoreToStatus(latest, key);
  const insight    = coachingInsight(key, latest, weeklyDelta, status);
  const streak     = consecutivePositiveWeeks(data);
  const trendUp    = weeklyDelta >= 0;
  const cfg        = METRIC_CFG[key];
  const isDeclining = weeklyDelta < 0 && data.length >= 2;

  return (
    <div className="card" style={{ padding: 24, marginBottom: 14, animation: `fadeUp .45s cubic-bezier(.16,1,.3,1) ${idx * 0.08}s both` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".08em", color: T.muted, textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          {label}
        </div>
        <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 100, background: STATUS_BG[status], color: STATUS_COLOR[status], border: `1px solid ${STATUS_COLOR[status]}40`, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          {STATUS_ICON[status]} {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Value + delta */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 30, color }}>
          {latest}
        </span>
        <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>
          {unit}
        </span>
        {data.length >= 2 && (
          <span style={{ fontSize: 12, marginLeft: 4, color: trendUp ? "#34D399" : "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            {trendUp ? "↑" : "↓"} {Math.abs(Math.round(weeklyDelta))}{unit} vs last week
          </span>
        )}
      </div>

      {/* Streak badge */}
      {streak >= 2 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 8 }}>
          <span>🔥</span>
          <p style={{ fontSize: 11, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", margin: 0 }}>
            {streak}-week improvement streak — keep going
          </p>
        </div>
      )}

      {/* Coaching insight */}
      <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.6, margin: "0 0 14px" }}>
        {insight}
      </p>

      {/* Chart */}
      <TrendChart metricKey={key} data={data} weeks={weeks} color={color} markers={markers} />

      {/* X-axis week labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {weeks.map(w => (
          <span key={w} style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>
            {w}
          </span>
        ))}
      </div>

      {/* "What would improve this?" CTA */}
      {(status === "warn" || status === "critical" || isDeclining) && cfg && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href={cfg.protocolHref} style={{ fontSize: 12, color: "#818CF8", fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            What would improve my {label}? →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MetricInput {
  key:   string;
  label: string;
  unit:  string;
  color: string;
  data:  number[];
  weeks: string[];
}

export interface AdoptionEvent {
  supplement_name: string;
  adopted_at:      string;
}

interface MetricRow extends MetricInput {
  weeklyDelta: number;
}

// ── Marker computation ────────────────────────────────────────────────────────
function computeMarkers(adoptionEvents: AdoptionEvent[], slicedDates: string[]): ChartMarker[] {
  if (slicedDates.length === 0) return [];
  const seen = new Set<number>();
  const out: ChartMarker[] = [];
  for (const ev of adoptionEvents) {
    const evMs = new Date(ev.adopted_at).getTime();
    let closestIdx = -1, closestDiff = Infinity;
    for (let i = 0; i < slicedDates.length; i++) {
      const diff = Math.abs(new Date(slicedDates[i]).getTime() - evMs);
      if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
    }
    if (closestIdx >= 0 && !seen.has(closestIdx)) {
      seen.add(closestIdx);
      out.push({ idx: closestIdx, name: ev.supplement_name });
    }
  }
  return out;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function TrendsClient({
  metrics: raw,
  dates = [],
  adoptionEvents = [],
}: {
  metrics:        MetricInput[];
  dates?:         string[];
  adoptionEvents?: AdoptionEvent[];
}) {
  const [range, setRange] = useState<number | null>(8);

  const slicedDates = range ? dates.slice(-range) : dates;

  const metrics: MetricRow[] = raw.map(m => {
    const data  = range ? m.data.slice(-range)  : m.data;
    const weeks = range ? m.weeks.slice(-range) : m.weeks;
    const n     = data.length;
    return { ...m, data, weeks, weeklyDelta: n >= 2 ? data[n - 1] - data[n - 2] : 0 };
  });

  const markers = computeMarkers(adoptionEvents, slicedDates);

  return (
    <div>
      <TimeRangeSelector range={range} onChange={setRange} />
      <WeeklySummaryCard metrics={metrics} raw={raw} />
      {metrics.map((m, i) => (
        <MetricCard key={m.key} metric={m} idx={i} markers={markers} />
      ))}
    </div>
  );
}
