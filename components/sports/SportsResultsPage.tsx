/// components/sports/SportsResultsPage.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays } from "date-fns";
import type {
  SportsProtocolPayload,
  SportsTimelinePhase,
  SportsSupplementItem,
  SportsWearableMetric,
} from "@/lib/db/sports-payload";

const PERF_GRAD = "linear-gradient(135deg,#7C3AED,#06B6D4)";
const T         = { text: "#F1F5F9", muted: "#64748B" };

// ── Phase color map ───────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, { bg: string; border: string; label: string; barBg: string }> = {
  "Base":                { bg: "rgba(59,130,246,.12)",  border: "rgba(59,130,246,.4)",  label: "#60A5FA", barBg: "rgba(59,130,246,.4)"  },
  "Build":               { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.4)",  label: "#818CF8", barBg: "rgba(99,102,241,.4)"  },
  "Peak":                { bg: "rgba(124,58,237,.14)",  border: "rgba(124,58,237,.5)",  label: "#A78BFA", barBg: "rgba(124,58,237,.45)" },
  "Taper":               { bg: "rgba(168,85,247,.12)",  border: "rgba(168,85,247,.4)",  label: "#C084FC", barBg: "rgba(168,85,247,.4)"  },
  "Race Week":           { bg: "rgba(239,68,68,.12)",   border: "rgba(239,68,68,.5)",   label: "#F87171", barBg: "rgba(239,68,68,.5)"   },
  "Post-Event Recovery": { bg: "rgba(16,185,129,.1)",   border: "rgba(16,185,129,.35)", label: "#34D399", barBg: "rgba(16,185,129,.35)" },
};

function phaseStyle(phase: string) {
  return PHASE_COLORS[phase] ?? { bg: "rgba(99,102,241,.1)", border: "rgba(99,102,241,.3)", label: "#A5B4FC", barBg: "rgba(99,102,241,.3)" };
}

// ── Label maps ────────────────────────────────────────────────────────────────
const OUTCOME_LABELS: Record<string, string> = {
  injury_free:   "Injury-Free Comeback",
  pr_podium:     "PR / Podium Push",
  finish_strong: "Finish Strong",
};

const COMPETITION_LABELS: Record<string, string> = {
  triathlon:    "Triathlon",
  running_race: "Running Race",
  cycling:      "Cycling Event",
  mma:          "MMA Competition",
  ski_racing:   "Alpine Ski Racing",
  swimming:     "Swimming Competition",
  golf:         "Golf Tournament",
};

function toLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Timing bucket order ───────────────────────────────────────────────────────
const TIMING_ORDER = ["Morning", "Pre-workout", "During", "Post-workout", "With meals", "Evening"];

function groupByTiming(items: SportsSupplementItem[]): Record<string, SportsSupplementItem[]> {
  const groups: Record<string, SportsSupplementItem[]> = {};
  for (const item of items) {
    const key = item.timing ?? "Other";
    (groups[key] = groups[key] ?? []).push(item);
  }
  return groups;
}

// ── Phase schedule helpers ────────────────────────────────────────────────────
interface PhaseWithDates { phase: SportsTimelinePhase; startMs: number; endMs: number; }

function buildPhaseSchedule(phases: SportsTimelinePhase[], eventDateStr: string): PhaseWithDates[] {
  const eventMs  = new Date(eventDateStr).getTime();
  const totalMs  = phases.reduce((s, p) => s + p.durationWeeks * 7 * 86400000, 0);
  let cursor     = eventMs - totalMs;
  return phases.map(p => {
    const startMs = cursor;
    const endMs   = cursor + p.durationWeeks * 7 * 86400000;
    cursor = endMs;
    return { phase: p, startMs, endMs };
  });
}

function getCurrentPhaseIndex(schedule: PhaseWithDates[]): number {
  const now = Date.now();
  for (let i = 0; i < schedule.length; i++) {
    if (now >= schedule[i].startMs && now < schedule[i].endMs) return i;
  }
  return now < schedule[0].startMs ? 0 : schedule.length - 1;
}

// ── Sticky Nav ────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "timeline",  label: "Timeline"  },
  { id: "red-flags", label: "Red Flags" },
  { id: "pack",      label: "Pack"      },
  { id: "schedule",  label: "Schedule"  },
  { id: "metrics",   label: "Metrics"   },
];

function StickyNav() {
  const [active, setActive] = useState("timeline");

  useEffect(() => {
    const observers = NAV_SECTIONS.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: "-40% 0px -50% 0px" },
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(6,8,15,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.06)", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "8px 16px", scrollbarWidth: "none" }}>
        {NAV_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            style={{
              flex: "0 0 auto", padding: "6px 16px", borderRadius: 100, fontSize: 12,
              whiteSpace: "nowrap", cursor: "pointer", transition: "all .15s",
              fontFamily: "var(--font-ui,'Inter',sans-serif)", outline: "none",
              background: active === s.id ? PERF_GRAD : "transparent",
              border: active === s.id ? "none" : "1px solid transparent",
              color: active === s.id ? "#fff" : T.muted,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ── Today's Focus card ────────────────────────────────────────────────────────
function TodaysFocusCard({ schedule, currentPhaseIndex, hasWearable }: {
  schedule: PhaseWithDates[];
  currentPhaseIndex: number;
  hasWearable: boolean;
}) {
  const router  = useRouter();
  const current = schedule[currentPhaseIndex];
  if (!current) return null;

  const now                = Date.now();
  const daysInto           = Math.max(0, Math.floor((now - current.startMs) / 86400000));
  const totalPhaseDays     = current.phase.durationWeeks * 7;
  const daysRemaining      = Math.max(0, totalPhaseDays - daysInto);
  const todayAction        = current.phase.keyActions[0] ?? "";

  return (
    <div style={{ padding: "20px 20px", borderRadius: 16, marginBottom: 16, background: "linear-gradient(135deg,rgba(124,58,237,.18) 0%,rgba(6,182,212,.08) 100%)", border: "1px solid rgba(124,58,237,.3)" }}>
      <div style={{ fontSize: 10, letterSpacing: ".12em", color: "#2DD4BF", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>
        ⚡ Today&apos;s Focus — {current.phase.phase} Phase
      </div>
      <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
        Day {daysInto + 1} of {totalPhaseDays} · {daysRemaining} days remaining in this phase
      </div>
      <div style={{ borderRadius: 10, background: "rgba(0,0,0,.3)", padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: ".08em", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 4 }}>Key Action Today</div>
        <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.55 }}>{todayAction}</div>
      </div>
      {hasWearable ? (
        <div style={{ borderRadius: 10, background: "rgba(0,0,0,.3)", padding: "12px 14px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".08em", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 4 }}>Readiness</div>
          <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Check your wearable app for today&apos;s readiness score before training.</div>
        </div>
      ) : (
        <button
          onClick={() => router.push("/app/wearables")}
          style={{ fontSize: 12, color: "#2DD4BF", fontFamily: "var(--font-ui,'Inter',sans-serif)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Connect wearable to unlock daily readiness →
        </button>
      )}
    </div>
  );
}

// ── Section 1: Visual Horizontal Timeline ─────────────────────────────────────
function TimelineSection({ phases, eventDate }: { phases: SportsTimelinePhase[]; eventDate: string }) {
  const schedule           = buildPhaseSchedule(phases, eventDate);
  const currentPhaseIndex  = getCurrentPhaseIndex(schedule);
  const totalWeeks         = phases.reduce((s, p) => s + p.durationWeeks, 0);
  const [expanded, setExpanded] = useState<number>(currentPhaseIndex);

  const youAreHerePct = phases
    .slice(0, currentPhaseIndex)
    .reduce((s, p) => s + (p.durationWeeks / totalWeeks) * 100, 0);

  return (
    <section id="timeline" className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 16, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        ⏱ Periodized Timeline
      </div>

      {/* YOU ARE HERE label */}
      <div style={{ position: "relative", height: 18, marginBottom: 4 }}>
        <div style={{ position: "absolute", left: `${youAreHerePct}%`, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 9, color: "#2DD4BF", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>▼ You are here</span>
        </div>
      </div>

      {/* Proportional phase bar */}
      <div style={{ display: "flex", height: 52, borderRadius: 10, overflow: "hidden", gap: 2, marginBottom: 16 }}>
        {phases.map((ph, i) => {
          const widthPct  = (ph.durationWeeks / totalWeeks) * 100;
          const isCurrent = i === currentPhaseIndex;
          const c         = phaseStyle(ph.phase);
          return (
            <button
              key={i}
              onClick={() => setExpanded(expanded === i ? -1 : i)}
              style={{
                width: `${widthPct}%`, minWidth: 0, border: "none", outline: "none",
                cursor: "pointer", transition: "all .15s",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                overflow: "hidden", padding: "0 4px",
                background: isCurrent ? PERF_GRAD : c.barBg,
                filter: expanded === i && !isCurrent ? "brightness(1.2)" : "none",
              }}
            >
              <div style={{ fontSize: 9, color: "#fff", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 500, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                {ph.phase}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.7)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                {ph.durationWeeks}w
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded detail */}
      {expanded >= 0 && phases[expanded] && (() => {
        const ph = phases[expanded]!;
        const c  = phaseStyle(ph.phase);
        return (
          <div style={{ borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, padding: 18, animation: "fadeUp .2s ease both" }}>
            <div style={{ fontSize: 12, color: c.label, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 6 }}>
              {ph.trainingFocus}
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
              {ph.keyActions.map((a, j) => (
                <li key={j} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.6, marginBottom: 4 }}>{a}</li>
              ))}
            </ul>
          </div>
        );
      })()}
    </section>
  );
}

// ── Section 2: Red Flags ──────────────────────────────────────────────────────
function RedFlagsSection({ redFlags }: { redFlags: SportsProtocolPayload["redFlags"] }) {
  const [open, setOpen] = useState(false);
  const hasContent =
    redFlags.contraindications.length > 0 ||
    redFlags.doctorDiscussion.length > 0 ||
    redFlags.weeklyMonitoring.length > 0;

  if (!hasContent) return null;

  return (
    <section id="red-flags" style={{ marginBottom: 16 }}>
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
              <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>Avoid</div>
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
              <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>Discuss With Doctor</div>
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
              <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#F59E0B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>Monitor Weekly</div>
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

// ── Section 3: Competition Pack (tabbed) ──────────────────────────────────────
type PackTab = "supplements" | "testing" | "gear" | "services" | "roi";

function CompetitionPackSection({ tierPack, budgetTier }: { tierPack: SportsProtocolPayload["tierPack"]; budgetTier: number }) {
  const [tab, setTab] = useState<PackTab>("supplements");

  const allTabs: { id: PackTab; label: string; count: number }[] = [
    { id: "supplements", label: "Supplements", count: tierPack.supplements.length },
    { id: "testing",     label: "Testing",     count: tierPack.testing.length },
    { id: "gear",        label: "Gear",        count: tierPack.gear.length },
    { id: "services",    label: "Services",    count: tierPack.services.length },
    { id: "roi",         label: "ROI Ranking", count: tierPack.biggestROI.length },
  ];
  const tabs = allTabs.filter((t) => t.count > 0);

  return (
    <section id="pack" className="card" style={{ padding: 24, marginBottom: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          🎯 Tier {tierPack.tier} Competition Pack
        </div>
        {tierPack.whatYouAreMissing.length > 0 && budgetTier < 4 && (
          <button
            onClick={() => document.getElementById("upsell")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            style={{
              fontSize: 11, padding: "4px 12px", borderRadius: 100, cursor: "pointer",
              background: "rgba(20,184,166,.12)", border: "1px solid rgba(20,184,166,.3)",
              color: "#2DD4BF", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400,
              transition: "all .15s", outline: "none",
            }}
          >
            ⬆ {tierPack.whatYouAreMissing.length} upgrades at Tier {budgetTier + 1}
          </button>
        )}
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: "0 0 auto", padding: "8px 16px", borderRadius: 8, border: `1px solid ${tab === t.id ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.07)"}`,
              background: tab === t.id ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.025)",
              cursor: "pointer", transition: "all .15s", outline: "none",
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
                <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 3 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>{s.dose} · {s.timing}</div>
                {s.notes && <div style={{ marginTop: 8, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.5 }}>{s.notes}</div>}
              </div>
            ))}
          </div>
        )}
        {tab === "testing" && (
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {tierPack.testing.map((t, i) => <li key={i} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7 }}>{t}</li>)}
          </ul>
        )}
        {tab === "gear" && (
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {tierPack.gear.map((g, i) => <li key={i} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7 }}>{g}</li>)}
          </ul>
        )}
        {tab === "services" && (
          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
            {tierPack.services.map((s, i) => <li key={i} style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7 }}>{s}</li>)}
          </ul>
        )}
        {tab === "roi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tierPack.biggestROI.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? PERF_GRAD : "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, color: i === 0 ? "#fff" : "#A5B4FC", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 600 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{item}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upsell card */}
      {tierPack.whatYouAreMissing.length > 0 && budgetTier < 4 && (
        <div id="upsell" style={{ marginTop: 20, padding: "18px 20px", borderRadius: 14, border: "1px solid rgba(245,158,11,.3)", background: "linear-gradient(135deg,rgba(120,53,15,.18) 0%,rgba(17,24,39,1) 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>⬆</span>
            <div style={{ fontSize: 12, color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>
              What Tier {budgetTier + 1} adds for your situation
            </div>
          </div>
          {tierPack.whatYouAreMissing.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, color: "#D1D5DB", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.6, marginBottom: 4 }}>
              <span style={{ color: "#F59E0B", flexShrink: 0 }}>→</span>
              <span>{m}</span>
            </div>
          ))}
          <a
            href="/app/onboarding/sports-prep"
            style={{ display: "block", marginTop: 14, padding: "11px 0", borderRadius: 10, background: "linear-gradient(135deg,#D97706,#F59E0B)", color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, textDecoration: "none", textAlign: "center" }}
          >
            Upgrade to Tier {budgetTier + 1} — Regenerate Protocol →
          </a>
        </div>
      )}
    </section>
  );
}

// ── Section 4: Supplement Schedule with adopt toggles ─────────────────────────
function SupplementScheduleSection({
  schedule, adopted, setAdopted,
}: {
  schedule: SportsSupplementItem[];
  adopted: Set<string>;
  setAdopted: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const groups = groupByTiming(schedule);
  const orderedKeys = [
    ...TIMING_ORDER.filter(k => k in groups),
    ...Object.keys(groups).filter(k => !TIMING_ORDER.includes(k)),
  ];

  if (schedule.length === 0) return null;

  function toggle(name: string) {
    setAdopted(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <section id="schedule" className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        💊 Daily Supplement Schedule
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {orderedKeys.map(timing => (
          <div key={timing}>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 400, letterSpacing: ".06em", marginBottom: 10, textTransform: "uppercase" }}>
              {timing}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {groups[timing]!.map((item, i) => {
                const isAdopted = adopted.has(item.name);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    {/* Adopt toggle */}
                    <button
                      onClick={() => toggle(item.name)}
                      style={{
                        marginTop: 2, width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", outline: "none", transition: "all .2s",
                        background: isAdopted ? PERF_GRAD : "transparent",
                        border: isAdopted ? "none" : "1.5px solid rgba(255,255,255,.2)",
                      }}
                    >
                      {isAdopted && <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>✓</span>}
                    </button>

                    {/* Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: isAdopted ? "#A5B4FC" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>{item.name}</span>
                        <span style={{ fontSize: 11, color: "#2DD4BF", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 300 }}>{item.dose}</span>
                        {item.withFood && (
                          <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", padding: "1px 7px", borderRadius: 100, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>with food</span>
                        )}
                      </div>
                      {item.notes && <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 3, lineHeight: 1.5 }}>{item.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section 5: Wearable Metrics (full expand/collapse) ────────────────────────
function WearableMetricsSection({ metrics }: { metrics: SportsWearableMetric[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section id="metrics" className="card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 18, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
        📡 Wearable Metrics to Track
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        {metrics.map((m, i) => {
          const isOpen = expanded === i;
          return (
            <button key={i} onClick={() => setExpanded(isOpen ? null : i)}
              style={{ padding: 18, borderRadius: 12, border: `1px solid ${isOpen ? "rgba(6,182,212,.4)" : "rgba(255,255,255,.07)"}`,
                background: isOpen ? "rgba(6,182,212,.07)" : "rgba(255,255,255,.025)",
                cursor: "pointer", transition: "all .15s", textAlign: "left", outline: "none" }}>
              <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 8 }}>{m.metric}</div>
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
                    <div style={{ fontSize: 10, color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Training guidance</div>
                    <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.5 }}>{m.trainingGuidance}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#06B6D4", marginTop: 10, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Show less ↑</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {m.trainingGuidance}
                  </div>
                  <div style={{ fontSize: 11, color: "#06B6D4", marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Read more ↓</div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Event meta banner ─────────────────────────────────────────────────────────
interface EventMeta {
  competitionType: string;
  eventDate:       string;
  weeksToEvent:    number;
  priorityOutcome: string;
  experienceLevel: string;
  budgetTier:      number;
  budgetValue:     number;
}

function EventBanner({ meta, daysToRace }: { meta: EventMeta; daysToRace: number }) {
  const date  = (() => {
    try { return new Date(meta.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
    catch { return meta.eventDate; }
  })();
  const label        = COMPETITION_LABELS[meta.competitionType] ?? toLabel(meta.competitionType);
  const outcomeLabel = OUTCOME_LABELS[meta.priorityOutcome]     ?? toLabel(meta.priorityOutcome);

  return (
    <div style={{ padding: "20px 24px", borderRadius: 16, border: "1px solid rgba(124,58,237,.3)", background: "rgba(124,58,237,.07)", marginBottom: 16, backgroundImage: "radial-gradient(ellipse 70% 80% at 0% 50%,rgba(124,58,237,.08) 0%,transparent 70%)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#A78BFA", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 }}>
            ⚡ Competition Protocol
          </div>
          <h1 style={{ margin: "0 0 8px", fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,28px)", color: T.text }}>
            {label}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{date}</span>
            <span style={{ color: T.muted }}>·</span>
            <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>{meta.weeksToEvent} weeks away</span>
            <span style={{ color: T.muted }}>·</span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 100, background: "rgba(124,58,237,.18)", border: "1px solid rgba(124,58,237,.4)", color: "#C4B5FD", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              {outcomeLabel}
            </span>
          </div>
        </div>

        {/* Right: tier badge + countdown */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ padding: "6px 14px", borderRadius: 100, fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, background: "rgba(6,182,212,.1)", border: "1px solid rgba(6,182,212,.3)", color: "#06B6D4" }}>
              Tier {meta.budgetTier} · ${meta.budgetValue.toLocaleString()}
            </span>
            <span style={{ padding: "6px 14px", borderRadius: 100, fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.3)", color: "#A5B4FC" }}>
              {meta.experienceLevel}
            </span>
          </div>
          {/* Race countdown */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", borderRadius: 100, padding: "8px 18px" }}>
            <span style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", color: "#A78BFA", lineHeight: 1 }}>
              {daysToRace >= 0 ? daysToRace : 0}
            </span>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.3 }}>
              {daysToRace >= 0 ? "days to\nrace day" : "race\ncomplete"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function SportsResultsPage({
  payload,
  eventMeta,
  hasWearable = false,
}: {
  payload:     SportsProtocolPayload;
  eventMeta:   EventMeta;
  hasWearable?: boolean;
}) {
  const router   = useRouter();
  const [adopted, setAdopted] = useState<Set<string>>(new Set());

  const schedule          = buildPhaseSchedule(payload.periodizedTimeline, eventMeta.eventDate);
  const currentPhaseIndex = getCurrentPhaseIndex(schedule);
  const daysToRace        = differenceInDays(new Date(eventMeta.eventDate), new Date());

  return (
    <div style={{ paddingBottom: "max(112px, calc(64px + env(safe-area-inset-bottom)))" }}>
      <div className="px-4 lg:px-6 py-6 lg:py-8">
        <EventBanner meta={eventMeta} daysToRace={daysToRace} />

        <TodaysFocusCard
          schedule={schedule}
          currentPhaseIndex={currentPhaseIndex}
          hasWearable={hasWearable}
        />
      </div>

      <StickyNav />

      <div className="px-4 lg:px-6">
        <TimelineSection phases={payload.periodizedTimeline} eventDate={eventMeta.eventDate} />
        <RedFlagsSection redFlags={payload.redFlags} />
        <CompetitionPackSection tierPack={payload.tierPack} budgetTier={eventMeta.budgetTier} />
        <SupplementScheduleSection schedule={payload.supplementSchedule} adopted={adopted} setAdopted={setAdopted} />
        <WearableMetricsSection metrics={payload.wearableMetrics} />

        {/* Bottom CTAs */}
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10, paddingBottom: "max(5rem,env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => router.push("/app/dashboard")}
            style={{ width: "100%", padding: "16px 0", borderRadius: 14, background: PERF_GRAD, color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", outline: "none" }}>
            Go to Dashboard →
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push("/app/goals")}
              style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 300, cursor: "pointer", outline: "none" }}>
              ← Build Another Protocol
            </button>
            <a
              href="/app/onboarding/sports-prep"
              style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 300, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
              New Race →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
