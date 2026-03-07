/// app/demo/page.tsx
// Public demo dashboard — no auth required.
// All data comes from lib/mock-data.ts.
import Link from "next/link";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  MOCK_USER,
  MOCK_SCORES,
  MOCK_BIOMARKERS,
  MOCK_DETECTED_SIGNALS,
  MOCK_TRENDS,
  MOCK_SUPPLEMENTS,
  MOCK_CHECKLIST,
  MOCK_NARRATIVE,
  type MockBiomarker,
  type MockSupplement,
} from "@/lib/mock-data";

// ── Shared constants ──────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };

const STATUS_C: Record<string, string> = {
  normal: "#10B981", optimal: "#10B981",
  good: "#3B82F6",
  low: "#F59E0B", high: "#F59E0B", warn: "#F59E0B",
  critical: "#EF4444",
};
const STATUS_BG: Record<string, string> = {
  normal: "rgba(16,185,129,.1)", optimal: "rgba(16,185,129,.1)",
  good: "rgba(59,130,246,.1)",
  low: "rgba(245,158,11,.1)", high: "rgba(245,158,11,.1)", warn: "rgba(245,158,11,.1)",
  critical: "rgba(239,68,68,.1)",
};
const STATUS_LABEL: Record<string, string> = {
  normal: "Normal", optimal: "Optimal", good: "Good",
  low: "Low", high: "High", warn: "Attention", critical: "Critical",
};

// ── Shared sub-components ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_C[status] ?? "#3B82F6";
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 400,
      background: STATUS_BG[status] ?? "rgba(59,130,246,.1)",
      color: c, border: `1px solid ${c}40`,
      fontFamily: "var(--font-ui,'Inter',sans-serif)",
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "#6366F1",
      fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase",
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function TrendChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const maxW = 360, maxH = 80;
  const mn = Math.min(...data), mx = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = i * (maxW / (data.length - 1));
    const y = maxH - ((v - mn) / (mx - mn || 1)) * (maxH - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={maxH} viewBox={`0 0 ${maxW} ${maxH}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DemoPage() {
  const firstName = MOCK_USER.name.split(" ")[0];

  const metrics = [
    {
      label: "BIOLOGICAL AGE", value: String(MOCK_SCORES.biologicalAge), unit: "yrs",
      delta: `−${MOCK_SCORES.chronologicalAge - MOCK_SCORES.biologicalAge}y younger`,
      status: "optimal", icon: "🧬",
      spark: MOCK_TRENDS.hrv.map((_, i) => MOCK_SCORES.biologicalAge + (MOCK_TRENDS.hrv.length - i) * 0.15),
      color: "#10B981",
    },
    {
      label: "RECOVERY SCORE", value: String(MOCK_SCORES.recovery), unit: "/100",
      delta: "+8 pts (8w)", status: "good", icon: "⚡",
      spark: MOCK_TRENDS.recovery,
      color: "#3B82F6",
    },
    {
      label: "HRV BASELINE", value: String(MOCK_TRENDS.hrv[MOCK_TRENDS.hrv.length - 1]), unit: "ms",
      delta: "+10 ms (8w)", status: "good", icon: "💓",
      spark: MOCK_TRENDS.hrv,
      color: "#3B82F6",
    },
    {
      label: "SLEEP QUALITY", value: String(MOCK_TRENDS.sleep[MOCK_TRENDS.sleep.length - 1]), unit: "/100",
      delta: "+9 pts (8w)", status: "good", icon: "🌙",
      spark: MOCK_TRENDS.sleep,
      color: "#7C3AED",
    },
  ];

  return (
    <div style={{ paddingBottom: 60 }}>

      {/* ── DASHBOARD ──────────────────────────────────────────────────────── */}
      <section id="dashboard">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Living Dashboard — Demo</SectionLabel>
          <h1 className="fu" style={{
            fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400,
            fontSize: "clamp(24px,3.5vw,36px)", color: T.text,
            marginBottom: 5, letterSpacing: "-.02em",
          }}>
            Good morning, {firstName}.
          </h1>
          <p className="fu1" style={{ color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 300 }}>
            Your protocol is active. 3 of 5 daily targets completed.
          </p>
        </div>

        {/* Bio age narrative */}
        <div className="card fu2" style={{ padding: 24, marginBottom: 20, borderLeft: "3px solid #10B981" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <SectionLabel>Biological Age Analysis</SectionLabel>
              <h2 style={{
                fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400,
                fontSize: "clamp(18px,2.5vw,24px)", color: T.text, marginBottom: 6, letterSpacing: "-.02em",
              }}>
                {MOCK_NARRATIVE.headline}
              </h2>
              <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7, maxWidth: 520 }}>
                {MOCK_NARRATIVE.sixMonthProjection}
              </p>
            </div>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 56, lineHeight: 1, background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {MOCK_SCORES.biologicalAge}
              </div>
              <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>bio age</div>
              <div style={{ fontSize: 11, color: "#10B981", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 400, marginTop: 2 }}>
                −{MOCK_SCORES.chronologicalAge - MOCK_SCORES.biologicalAge} years younger
              </div>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 24 }}>
          {metrics.map((m, i) => (
            <div key={m.label} className="card" style={{ padding: 22, position: "relative", overflow: "hidden", animation: `fadeUp .5s cubic-bezier(.16,1,.3,1) ${i * 0.07}s both` }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${m.color},transparent)` }} />
              <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".11em", color: T.muted, marginBottom: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                {m.icon} {m.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 400, lineHeight: 1, background: `linear-gradient(135deg,${m.color},#fff)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {m.value}
                </span>
                <span style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>
                  {m.unit}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <StatusBadge status={m.status} />
                <Sparkline data={m.spark} color={m.color} />
              </div>
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, fontWeight: 300, color: "#34D399" }}>
                {m.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Two-column: signals + checklist */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 40 }}>

          {/* Detected signals */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <SectionLabel>Detected Signals</SectionLabel>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "glowPulse 2s ease-in-out infinite", boxShadow: "0 0 8px rgba(239,68,68,.6)" }} />
            </div>
            {MOCK_DETECTED_SIGNALS.map((b: MockBiomarker) => {
              const isHigh = b.status === "critical" || b.status === "high";
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: isHigh ? "#EF4444" : "#F59E0B", boxShadow: `0 0 6px ${isHigh ? "rgba(239,68,68,.6)" : "rgba(245,158,11,.5)"}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, fontWeight: 400, color: T.text }}>
                      {b.name}: {b.value} {b.unit}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                      {b.category} · {b.status === "high" ? "Above optimal" : "Below optimal"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekly targets */}
          <div className="card" style={{ padding: 22 }}>
            <SectionLabel>This Week&apos;s Targets</SectionLabel>
            {MOCK_CHECKLIST.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: item.done ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)", border: `1px solid ${item.done ? "rgba(16,185,129,.35)" : "rgba(255,255,255,.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#34D399" }}>
                  {item.done ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: item.done ? T.muted : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textDecoration: item.done ? "line-through" : "none" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BIOMARKERS ─────────────────────────────────────────────────────── */}
      <section id="biomarkers" style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Biomarker Panel</SectionLabel>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,2.8vw,28px)", color: T.text, letterSpacing: "-.02em" }}>
            Your Lab Results
          </h2>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {MOCK_BIOMARKERS.map((b: MockBiomarker, i: number) => {
            const c = STATUS_C[b.status] ?? "#3B82F6";
            const rangeStr = b.reference_min != null && b.reference_max != null
              ? `${b.reference_min}–${b.reference_max}`
              : b.reference_max != null ? `<${b.reference_max}`
              : b.reference_min != null ? `>${b.reference_min}` : "—";
            return (
              <div key={b.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * 0.04}s both` }}>
                <div style={{ width: 3, height: 32, borderRadius: 3, background: c, flexShrink: 0, boxShadow: `0 0 8px ${c}55` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
                    {b.category} · Range: {rangeStr} {b.unit}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 17, fontWeight: 400, color: c, marginBottom: 2 }}>
                    {b.value}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>
                    {b.unit}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TRENDS ─────────────────────────────────────────────────────────── */}
      <section id="trends" style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Wearable Trends</SectionLabel>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,2.8vw,28px)", color: T.text, letterSpacing: "-.02em" }}>
            8-Week Overview
          </h2>
        </div>
        {[
          { key: "hrv",      label: "HRV Baseline",  unit: "ms",   color: "#3B82F6", data: MOCK_TRENDS.hrv,      status: "good" },
          { key: "sleep",    label: "Sleep Quality",  unit: "/100", color: "#7C3AED", data: MOCK_TRENDS.sleep,    status: "good" },
          { key: "recovery", label: "Recovery Score", unit: "/100", color: "#10B981", data: MOCK_TRENDS.recovery, status: "good" },
        ].map(({ key, label, unit, color, data, status }, mi) => (
          <div key={key} className="card" style={{ padding: 24, marginBottom: 14, animation: `fadeUp .45s cubic-bezier(.16,1,.3,1) ${mi * 0.1}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".08em", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 28, color }}>
                  {data[data.length - 1]}
                  <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300, marginLeft: 4 }}>
                    {unit}
                  </span>
                </div>
              </div>
              <StatusBadge status={status} />
            </div>
            <TrendChart data={data} color={color} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {MOCK_TRENDS.weeks.map((w) => (
                <span key={w} style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>{w}</span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── PRODUCTS ───────────────────────────────────────────────────────── */}
      <section id="products" style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Product Stack</SectionLabel>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,2.8vw,28px)", color: T.text, letterSpacing: "-.02em", marginBottom: 4 }}>
            Recommended Supplements
          </h2>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
            Every product below is tied to a detected gap in the sample biomarker data.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {MOCK_SUPPLEMENTS.map((p: MockSupplement, i: number) => (
            <div key={p.id} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, animation: `fadeUp .45s cubic-bezier(.16,1,.3,1) ${i * 0.06}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 32 }}>{p.icon}</div>
                <span style={{ fontSize: 10, fontWeight: 400, padding: "2px 8px", borderRadius: "100px", background: p.source === "iHerb" ? "rgba(16,185,129,.1)" : "rgba(255,165,0,.1)", color: p.source === "iHerb" ? "#34D399" : "#FCD34D", border: `1px solid ${p.source === "iHerb" ? "rgba(16,185,129,.25)" : "rgba(255,165,0,.25)"}`, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  {p.source}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".08em", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 3 }}>
                  {p.brand.toUpperCase()}
                </div>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: T.text, marginBottom: 4 }}>
                  {p.title}
                </div>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, background: "linear-gradient(135deg,#C9943A,#E8C97A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {p.price}
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(99,102,241,.12)", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".08em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 5 }}>
                  Why for you
                </div>
                <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65, marginBottom: 8 }}>
                  {p.why}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.tags.map((tag, ti) => (
                    <span key={ti} className={`chip ${tag.includes("↑") ? "chip-r" : tag.includes("↓") ? "chip-a" : "chip-b"}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button className="cta cta-sm" style={{ width: "100%", justifyContent: "center", animation: "none", boxShadow: "none" }}>
                  View on {p.source} →
                </button>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom conversion CTA ───────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.07),rgba(168,85,247,0.07))", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>
          Ready to see your real data?
        </div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,30px)", color: T.text, marginBottom: 10, letterSpacing: "-.02em" }}>
          Your protocol is waiting.
        </h2>
        <p style={{ fontSize: 14, color: T.muted, marginBottom: 28, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, maxWidth: 400, margin: "0 auto 28px" }}>
          Upload a single blood test to get a personalized protocol built entirely from your own biomarkers.
        </p>
        <Link href="/auth/signin">
          <button className="cta">Get My Personal Protocol →</button>
        </Link>
      </div>

    </div>
  );
}
