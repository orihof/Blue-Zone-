/// components/sports/SportsResultsPage.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { differenceInDays, format } from "date-fns";
import {
  Sun, Brain, Calendar, FlaskConical, ShieldAlert, Watch,
  Share2, Check, ChevronDown, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type {
  SportsProtocolPayload,
  SportsTimelinePhase,
  SportsWearableMetric,
} from "@/lib/db/sports-payload";

// ── Constants ──────────────────────────────────────────────────────────────────
const COMPETITION_LABELS: Record<string, string> = {
  triathlon:       "Triathlon",
  running_race:    "Running Race",
  cycling_event:   "Cycling Event",
  obstacle_course: "Obstacle Course Race",
  swimming:        "Swimming Event",
  team_sports:     "Team Sports",
};

const PHASE_COLORS: Record<string, string> = {
  "Base":                "#3B82F6",
  "Build":               "#6366F1",
  "Peak":                "#8B5CF6",
  "Taper":               "#A78BFA",
  "Race Week":           "#EC4899",
  "Post-Event Recovery": "#10B981",
};

const PRIORITY_RANK: Record<string, number> = { essential: 0, high: 1, moderate: 2 };

const PRIORITY_COLORS = {
  essential: { bg: "rgba(16,185,129,.1)",  border: "rgba(16,185,129,.3)",  text: "#34D399" },
  high:      { bg: "rgba(99,102,241,.1)",  border: "rgba(99,102,241,.3)",  text: "#818CF8" },
  moderate:  { bg: "rgba(100,116,139,.1)", border: "rgba(100,116,139,.3)", text: "#94A3B8" },
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type SectionId = "today" | "why" | "timeline" | "supplements" | "safety" | "metrics";

interface EventMeta {
  competitionType: string;
  eventDate:       string;
  weeksToEvent:    number;
  priorityOutcome: string;
  experienceLevel: string;
  budgetTier:      number;
  budgetValue:     number;
}

interface SportsResultsPageProps {
  payload:            SportsProtocolPayload;
  eventMeta:          EventMeta;
  hasWearable?:       boolean;
  hasBloodTest?:      boolean;
  communityCount?:    number;
  protocolId:         string;
  initialAdoptedIds?: string[];
}

interface PhaseInfo {
  index:                number;
  phase:                SportsTimelinePhase;
  dayInPhase:           number;
  phaseDuration:        number;
  daysRemainingInPhase: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeCurrentPhase(
  phases: SportsTimelinePhase[],
  eventDate: string,
): PhaseInfo | null {
  const today      = new Date();
  const event      = new Date(eventDate);
  const totalWeeks = phases.reduce((s, p) => s + p.durationWeeks, 0);
  let elapsed      = 0;

  for (let i = 0; i < phases.length; i++) {
    const phaseStart = elapsed;
    elapsed += phases[i].durationWeeks;
    const endDate   = new Date(event.getTime() - (totalWeeks - elapsed)    * 7 * 86_400_000);
    const startDate = new Date(event.getTime() - (totalWeeks - phaseStart) * 7 * 86_400_000);
    if (today >= startDate && today < endDate) {
      return {
        index: i,
        phase: phases[i],
        dayInPhase:           differenceInDays(today, startDate) + 1,
        phaseDuration:        phases[i].durationWeeks * 7,
        daysRemainingInPhase: differenceInDays(endDate, today),
      };
    }
  }
  return null;
}

// ── Canvas share card ─────────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateProtocolShareCard(meta: EventMeta) {
  const W = 600, H = 340;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(2, 2);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07090F"); bg.addColorStop(1, "#0D0B18");
  ctx.fillStyle = bg; roundRect(ctx, 0, 0, W, H, 0); ctx.fill();

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
  glow.addColorStop(0, "rgba(99,102,241,0.18)"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, 24, 24, W - 48, H - 48, 12); ctx.fill();

  ctx.fillStyle = "#6366F1"; ctx.font = "500 11px Inter,sans-serif";
  ctx.fillText("BLUE ZONE × COMPETITION PROTOCOL", 44, 58);
  ctx.fillStyle = "#F1F5F9"; ctx.font = "300 28px Syne,serif";
  ctx.fillText(COMPETITION_LABELS[meta.competitionType] ?? meta.competitionType, 44, 100);
  ctx.fillStyle = "#64748B"; ctx.font = "300 13px Inter,sans-serif";
  ctx.fillText(`${meta.weeksToEvent}w out · ${meta.experienceLevel} · Tier ${meta.budgetTier}`, 44, 126);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = "bluezone-protocol.png"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── CompletionRing ─────────────────────────────────────────────────────────────
function CompletionRing({ pct, size = 60 }: { pct: number; size?: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { setTimeout(() => setAnimated(true), 120); }, []);
  const r     = (size - 8) / 2;
  const circ  = 2 * Math.PI * r;
  const offset = circ * (1 - (animated ? pct / 100 : 0));
  const color  = pct === 0 ? "#6366F1" : pct < 50 ? "#F59E0B" : pct < 100 ? "#3B82F6" : "#10B981";
  const gradId = `ring-g-${size}`;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
          stroke={pct > 0 ? `url(#${gradId})` : color}
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      {pct === 0 && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "rgba(99,102,241,.15)",
          animation: "bzRingPulse 2s ease-in-out infinite",
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 10, fontWeight: 500, color,
      }}>
        {pct}%
      </div>
    </div>
  );
}

// ── Section registry ──────────────────────────────────────────────────────────
const SECTIONS: { id: SectionId; label: string; shortLabel: string; Icon: LucideIcon }[] = [
  { id: "today",       label: "Today's Plan",     shortLabel: "Today",   Icon: Sun          },
  { id: "why",         label: "Why This Protocol", shortLabel: "Why",     Icon: Brain        },
  { id: "timeline",    label: "Training Plan",     shortLabel: "Plan",    Icon: Calendar     },
  { id: "supplements", label: "My Pack",           shortLabel: "Pack",    Icon: FlaskConical },
  { id: "safety",      label: "Safety & Flags",    shortLabel: "Safety",  Icon: ShieldAlert  },
  { id: "metrics",     label: "Wearable Metrics",  shortLabel: "Metrics", Icon: Watch        },
];

// ── Left Command Panel ────────────────────────────────────────────────────────
function LeftCommandPanel({
  activeSection, setSection,
  daysToRace, currentPhase, completionPct, adoptedCount, totalSupplements,
  eventMeta, onShare, flagCount,
}: {
  activeSection:    SectionId;
  setSection:       (id: SectionId) => void;
  daysToRace:       number;
  currentPhase:     PhaseInfo | null;
  completionPct:    number;
  adoptedCount:     number;
  totalSupplements: number;
  eventMeta:        EventMeta;
  onShare:          () => void;
  flagCount:        number;
}) {
  return (
    <aside
      className="bz-left-panel"
      style={{
        display: "none", // overridden by media query
        width: 300, flexShrink: 0,
        position: "sticky", top: 0, height: "100svh",
        overflowY: "auto", flexDirection: "column", gap: 12,
        padding: "24px 20px 20px",
        borderRight: "1px solid rgba(255,255,255,.06)",
        background: "rgba(5,5,15,.65)",
      }}
    >
      {/* 1 — Race countdown */}
      <div style={{
        padding: "16px 18px", borderRadius: 14,
        background: "linear-gradient(135deg,rgba(124,58,237,.15),rgba(6,182,212,.06))",
        border: "1px solid rgba(124,58,237,.2)",
      }}>
        <div style={{ fontSize: 9, color: "#7C3AED", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>
          {COMPETITION_LABELS[eventMeta.competitionType] ?? eventMeta.competitionType}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 46, fontWeight: 300, color: "#F1F5F9", lineHeight: 1 }}>
            {Math.max(0, daysToRace)}
          </span>
          <span style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            {daysToRace > 0 ? "days to race" : "race day!"}
          </span>
        </div>
        {currentPhase && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 5 }}>
              <span>{currentPhase.phase.phase}</span>
              <span>Day {currentPhase.dayInPhase}/{currentPhase.phaseDuration}</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: "linear-gradient(90deg,#7C3AED,#06B6D4)",
                width: `${Math.min(100, (currentPhase.dayInPhase / currentPhase.phaseDuration) * 100)}%`,
                transition: "width .8s ease",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* 2 — Completion ring */}
      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <CompletionRing pct={completionPct} size={58} />
        <div>
          <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: "#F1F5F9", marginBottom: 3 }}>
            {adoptedCount}/{totalSupplements} adopted
          </div>
          <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
            {completionPct === 0 ? "Tap a supplement to begin" :
             completionPct < 50  ? "Building momentum" :
             completionPct < 100 ? "Protocol active" : "Fully activated 🎉"}
          </div>
        </div>
      </div>

      {/* 3 — Section nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {SECTIONS.map(s => {
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10,
                background: active ? "rgba(124,58,237,.13)" : "transparent",
                border: active ? "1px solid rgba(124,58,237,.22)" : "1px solid transparent",
                cursor: "pointer", textAlign: "left", transition: "all .15s",
              }}
            >
              <s.Icon size={15} color={active ? "#A78BFA" : "#475569"} />
              <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: active ? "#C4B5FD" : "#64748B", flex: 1 }}>
                {s.label}
              </span>
              {s.id === "safety" && flagCount > 0 && (
                <span style={{ fontSize: 9, background: "rgba(239,68,68,.15)", color: "#F87171", padding: "1px 6px", borderRadius: 100, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  {flagCount}
                </span>
              )}
              {s.id === "supplements" && totalSupplements > 0 && (
                <span style={{ fontSize: 9, background: "rgba(255,255,255,.05)", color: "#64748B", padding: "1px 6px", borderRadius: 100, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  {adoptedCount}/{totalSupplements}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* 4 — Share */}
      <button
        onClick={onShare}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "10px 0", borderRadius: 10, cursor: "pointer",
          background: "none", border: "1px solid rgba(255,255,255,.08)",
          color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12,
        }}
      >
        <Share2 size={13} />
        Share my protocol
      </button>
    </aside>
  );
}

// ── Mobile Tab Bar ─────────────────────────────────────────────────────────────
const MOBILE_TABS = SECTIONS.filter(s => s.id !== "why");

function MobileTabBar({ activeSection, setSection }: {
  activeSection: SectionId;
  setSection:    (id: SectionId) => void;
}) {
  return (
    <div
      className="bz-mobile-tabs"
      style={{
        display: "none", // overridden by media query
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(5,5,15,.96)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,.06)",
        paddingBottom: "env(safe-area-inset-bottom,0px)",
      }}
    >
      {MOBILE_TABS.map(s => {
        const active = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "10px 4px 8px", gap: 4,
              background: "none", border: "none", cursor: "pointer",
              color: active ? "#A78BFA" : "#475569",
              position: "relative",
            }}
          >
            {active && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 24, height: 2, background: "#7C3AED", borderRadius: 1,
              }} />
            )}
            <s.Icon size={20} color={active ? "#A78BFA" : "#475569"} />
            <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 9 }}>{s.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Protocol Leaderboard (first-view only) ─────────────────────────────────────
function ProtocolLeaderboard({ protocolId, competitionType, weeksToEvent, experienceLevel, budgetTier }: {
  protocolId: string; competitionType: string; weeksToEvent: number;
  experienceLevel: string; budgetTier: number;
}) {
  const [show, setShow] = useState(false);
  const key = `bz_lb_${protocolId}`;
  useEffect(() => {
    if (typeof localStorage !== "undefined" && !localStorage.getItem(key)) {
      setShow(true);
      localStorage.setItem(key, "1");
    }
  }, [key]);
  if (!show) return null;
  return (
    <div style={{
      padding: "16px 18px 14px", borderRadius: 12, marginBottom: 16,
      background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.05))",
      border: "1px solid rgba(99,102,241,.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 14, color: "#F1F5F9" }}>Protocol Ready</div>
          <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B" }}>Your competition prep pack is live</div>
        </div>
        <button onClick={() => setShow(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { icon: "🏅", label: "Sport",      value: COMPETITION_LABELS[competitionType] ?? competitionType },
          { icon: "📅", label: "Timeline",   value: `${weeksToEvent} weeks out` },
          { icon: "🎯", label: "Experience", value: experienceLevel },
          { icon: "💰", label: "Tier",       value: `Tier ${budgetTier}` },
        ].map(r => (
          <div key={r.label} style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ fontSize: 13, marginBottom: 2 }}>{r.icon}</div>
            <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#F1F5F9" }}>{r.value}</div>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 9, color: "#475569", marginTop: 2 }}>{r.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Accuracy Banner ────────────────────────────────────────────────────────────
function AccuracyBanner({ hasWearable, hasBloodTest }: { hasWearable: boolean; hasBloodTest: boolean }) {
  if (hasWearable && hasBloodTest) return null;
  const pct  = hasBloodTest ? (hasWearable ? 100 : 85) : hasWearable ? 70 : 50;
  const href = !hasBloodTest ? "/app/onboarding/upload" : "/app/settings";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 10, marginBottom: 16,
      background: "rgba(245,158,11,.05)", border: "1px solid rgba(245,158,11,.14)",
    }}>
      <span style={{
        fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, fontWeight: 600, color: "#F59E0B",
        background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)",
        padding: "2px 8px", borderRadius: 6, flexShrink: 0,
      }}>
        {pct}%
      </span>
      <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#94A3B8", flex: 1 }}>
        Protocol accuracy — {!hasBloodTest ? "upload lab results" : "connect a wearable"} to improve
      </span>
      <a href={href} style={{ flexShrink: 0, fontSize: 11, color: "#FCD34D", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, textDecoration: "none" }}>
        Unlock →
      </a>
    </div>
  );
}

// ── Today Section ──────────────────────────────────────────────────────────────
function TodaySection({
  payload, adoptedIds, onToggle, eventMeta, currentPhase, hasWearable, hasBloodTest, protocolId,
}: {
  payload:      SportsProtocolPayload;
  adoptedIds:   string[];
  onToggle:     (name: string) => void;
  eventMeta:    EventMeta;
  currentPhase: PhaseInfo | null;
  hasWearable:  boolean;
  hasBloodTest: boolean;
  protocolId:   string;
}) {
  const morningStack = (payload.tierPack?.supplements ?? [])
    .filter(s => s.priority === "essential" || s.priority === "high")
    .slice(0, 4);

  return (
    <div className="bz-section-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Protocol Hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(124,58,237,0.08) 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 20,
        padding: "24px 24px 20px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        {/* Top row: date + days to race */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#7C3AED", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 6 }}>
              ⚡ {eventMeta.competitionType.replace(/_/g, " ")}
            </div>
            <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: "clamp(20px,3vw,28px)", fontWeight: 400, color: "#F1F5F9", margin: 0, marginBottom: 4, letterSpacing: "-.02em" }}>
              {format(new Date(), "EEEE, MMMM d")}
            </h1>
            <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", margin: 0 }}>
              {currentPhase
                ? `${currentPhase.phase.phase} phase · Day ${currentPhase.dayInPhase} of ${currentPhase.phaseDuration}`
                : "Protocol active"}
            </p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 14, padding: "10px 16px" }}>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 34, color: "#F1F5F9", lineHeight: 1, letterSpacing: "-.03em" }}>
              {differenceInDays(new Date(eventMeta.eventDate), new Date())}
            </div>
            <div style={{ fontSize: 9, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>
              days to race
            </div>
          </div>
        </div>
        {/* Adoption progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              Protocol adoption
            </span>
            <span style={{ fontSize: 11, color: adoptedIds.length > 0 ? "#34D399" : "#64748B", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
              {adoptedIds.length}/{(payload.tierPack?.supplements ?? []).length} adopted
            </span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(payload.tierPack?.supplements ?? []).length > 0 ? Math.round((adoptedIds.length / (payload.tierPack?.supplements ?? []).length) * 100) : 0}%`,
              background: adoptedIds.length === 0 ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg, #7C3AED, #06B6D4)",
              borderRadius: 99,
              transition: "width .6s cubic-bezier(.16,1,.3,1)",
            }} />
          </div>
          {adoptedIds.length === 0 && (
            <p style={{ fontSize: 11, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 5 }}>
              Tap any supplement below to begin
            </p>
          )}
        </div>
      </div>

      <AccuracyBanner hasWearable={hasWearable} hasBloodTest={hasBloodTest} />
      <ProtocolLeaderboard
        protocolId={protocolId}
        competitionType={eventMeta.competitionType}
        weeksToEvent={eventMeta.weeksToEvent}
        experienceLevel={eventMeta.experienceLevel}
        budgetTier={eventMeta.budgetTier}
      />

      {/* Wearable nudge */}
      {!hasWearable && (
        <a href="/app/settings" style={{
          textDecoration: "none", display: "flex", alignItems: "center", gap: 14,
          padding: "12px 16px", borderRadius: 10,
          background: "rgba(245,158,11,.05)", border: "1px solid rgba(245,158,11,.15)",
        }}>
          <Watch size={18} color="#F59E0B" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#F1F5F9", marginBottom: 1 }}>Connect a wearable</div>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B" }}>Unlock HRV readiness and sleep coaching →</div>
          </div>
        </a>
      )}

      {/* Training directive */}
      {payload.todayTrainingDirective && (
        <div style={{
          padding: "18px 20px", borderRadius: 12,
          background: "linear-gradient(135deg,rgba(124,58,237,.12),rgba(6,182,212,.06))",
          border: "1px solid rgba(124,58,237,.2)",
        }}>
          <div style={{ fontSize: 9, color: "#7C3AED", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>
            ⚡ Training today
          </div>
          <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, color: "#F1F5F9", lineHeight: 1.65, margin: 0 }}>
            {payload.todayTrainingDirective}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {currentPhase && (
              <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 100, background: "rgba(124,58,237,.14)", border: "1px solid rgba(124,58,237,.25)", color: "#C4B5FD", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                {currentPhase.phase.phase}
              </span>
            )}
            <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 100, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              {eventMeta.priorityOutcome}
            </span>
          </div>
        </div>
      )}

      {/* Morning stack */}
      {morningStack.length > 0 && (
        <div style={{ borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 18px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
            <div style={{ fontSize: 9, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Morning Stack
            </div>
            <div style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              {morningStack.filter(s => adoptedIds.includes(s.name)).length}/{morningStack.length} adopted
            </div>
          </div>
          {morningStack.map(s => {
            const adopted = adoptedIds.includes(s.name);
            return (
              <div
                key={s.name}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
                  borderBottom: "1px solid rgba(255,255,255,.03)",
                  background: adopted ? "rgba(16,185,129,.04)" : "transparent",
                  transition: "background .2s",
                }}
              >
                <button
                  onClick={() => onToggle(s.name)}
                  style={{
                    width: 28, height: 28, marginTop: 0, borderRadius: "50%", flexShrink: 0,
                    background: adopted
                      ? "linear-gradient(135deg, #10B981, #34D399)"
                      : "rgba(255,255,255,0.04)",
                    border: `2px solid ${adopted ? "#10B981" : "rgba(255,255,255,0.18)"}`,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .25s cubic-bezier(.16,1,.3,1)",
                    transform: adopted ? "scale(1.08)" : "scale(1)",
                    boxShadow: adopted ? "0 0 12px rgba(16,185,129,0.4)" : "none",
                  }}
                >
                  {adopted && <Check size={12} color="white" strokeWidth={3} />}
                </button>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: adopted ? "#64748B" : "#F1F5F9", textDecoration: adopted ? "line-through" : "none" }}>
                    {s.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#10B981", opacity: .7, marginLeft: 8 }}>
                    {s.dose}
                  </span>
                </div>
                {adopted && <span style={{ fontSize: 10, color: "#10B981", opacity: .55, fontFamily: "var(--font-ui,'Inter',sans-serif)", flexShrink: 0 }}>Adopted ✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Phase mini-timeline */}
      {payload.periodizedTimeline.length > 0 && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 9, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>
            Race preparation timeline
          </div>
          <div style={{ display: "flex", gap: 3, height: 26, alignItems: "stretch" }}>
            {payload.periodizedTimeline.map((phase, i) => {
              const total    = payload.periodizedTimeline.reduce((s, p) => s + p.durationWeeks, 0);
              const widthPct = (phase.durationWeeks / total) * 100;
              const isCurrent = currentPhase?.index === i;
              const isPast    = currentPhase ? i < currentPhase.index : false;
              const color     = PHASE_COLORS[phase.phase] ?? "#6366F1";
              return (
                <div
                  key={i}
                  title={`${phase.phase} (${phase.durationWeeks}w)`}
                  style={{
                    width: `${widthPct}%`, borderRadius: 5, position: "relative",
                    background: isCurrent ? color : isPast ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.03)",
                    border: `1px solid ${isCurrent ? color + "55" : "rgba(255,255,255,.04)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 7, color: isCurrent ? "#fff" : "#475569",
                    fontFamily: "var(--font-ui,'Inter',sans-serif)", overflow: "hidden",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 3px" }}>
                    {phase.phase.split(" ")[0]}
                  </span>
                  {isCurrent && (
                    <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            <span>Today</span>
            <span>{differenceInDays(new Date(eventMeta.eventDate), new Date())}d to race</span>
          </div>
        </div>
      )}

      {/* Phase transition alert */}
      {currentPhase && currentPhase.daysRemainingInPhase <= 7 && payload.phaseTransitionSummary && (
        <div style={{
          padding: "13px 16px", borderRadius: 10,
          background: "rgba(139,92,246,.07)", border: "1px solid rgba(139,92,246,.22)",
          display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚡</span>
          <div>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, fontWeight: 500, color: "#A78BFA", marginBottom: 4 }}>
              Phase transition in {currentPhase.daysRemainingInPhase} day{currentPhase.daysRemainingInPhase !== 1 ? "s" : ""}
            </div>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>
              {payload.phaseTransitionSummary}
            </div>
          </div>
        </div>
      )}

      {/* Tonight's recovery */}
      {payload.tonightRecoveryDirective && (
        <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 9, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
            🌙 Tonight&apos;s Recovery
          </div>
          <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: "#94A3B8", lineHeight: 1.65, margin: 0 }}>
            {payload.tonightRecoveryDirective}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Why Section ────────────────────────────────────────────────────────────────
function WhySection({ payload, hasBloodTest }: { payload: SportsProtocolPayload; hasBloodTest: boolean }) {
  const items     = payload.intelligenceItems ?? [];
  const decisions = payload.biomarkerDecisions ?? [];
  const STATUS_COLORS: Record<string, string> = { normal: "#10B981", flagged: "#EF4444", optimal: "#3B82F6" };

  return (
    <div className="bz-section-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 400, color: "#F1F5F9", margin: "0 0 4px" }}>
          Why we built it this way
        </h2>
        <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", margin: 0 }}>
          Every decision in this protocol was driven by your specific data.
        </p>
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#A5B4FC", marginBottom: 6 }}>{item.input}</div>
                  <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: "#E2E8F0", lineHeight: 1.55 }}>→ {item.decision}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasBloodTest && decisions.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span>🩸</span>
            <h3 style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: "#94A3B8", margin: 0 }}>
              How your blood test shaped this protocol
            </h3>
          </div>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
            {decisions.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "14px 18px", borderBottom: i < decisions.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none", alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 110 }}>
                  <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 14, color: "#F1F5F9", marginBottom: 2 }}>
                    {d.value}{d.unit ? ` ${d.unit}` : ""}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 10, color: "#64748B", marginBottom: 4 }}>{d.biomarker}</div>
                  {d.status && d.status !== "normal" && (
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 100, background: `${STATUS_COLORS[d.status] ?? "#64748B"}18`, color: STATUS_COLORS[d.status] ?? "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                      {d.status === "flagged" ? "Above range" : "Optimal"}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 10, color: "#475569", marginBottom: 4 }}>Protocol response</div>
                  <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#94A3B8", lineHeight: 1.55 }}>{d.protocolResponse}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: "#475569" }}>
          Intelligence items appear for newly generated protocols.
        </p>
      )}
    </div>
  );
}

// ── Timeline Section ───────────────────────────────────────────────────────────
function TimelineSection({ phases, eventDate, currentPhaseIndex }: {
  phases:             SportsTimelinePhase[];
  eventDate:          string;
  currentPhaseIndex:  number | null;
}) {
  const today    = new Date();
  const event    = new Date(eventDate);
  const totalWks = phases.reduce((s, p) => s + p.durationWeeks, 0);
  let elapsed    = 0;

  return (
    <div className="bz-section-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 400, color: "#F1F5F9", margin: "0 0 4px" }}>Training plan</h2>
        <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", margin: 0 }}>
          {phases.length} phases · {differenceInDays(event, today)} days total
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {phases.map((phase, i) => {
          const phaseStart = elapsed;
          elapsed += phase.durationWeeks;
          const endDate   = new Date(event.getTime() - (totalWks - elapsed)    * 7 * 86_400_000);
          const startDate = new Date(event.getTime() - (totalWks - phaseStart) * 7 * 86_400_000);
          const isActive  = today >= startDate && today < endDate;
          const isPast    = today >= endDate;
          const color     = PHASE_COLORS[phase.phase] ?? "#6366F1";
          const dayInPhase = isActive ? differenceInDays(today, startDate) + 1 : null;

          return (
            <div key={i} style={{
              borderRadius: 14, overflow: "hidden", opacity: isPast ? 0.55 : 1,
              border: `1px solid ${isActive ? color + "40" : "rgba(255,255,255,.06)"}`,
              background: isActive ? `${color}0D` : isPast ? "rgba(255,255,255,.01)" : "rgba(255,255,255,.02)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: isActive ? `0 0 8px ${color}55` : "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 15, color: "#F1F5F9", fontWeight: 400 }}>{phase.phase}</span>
                    <span style={{ fontSize: 10, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{phase.durationWeeks}w</span>
                    {isActive && (
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 100, background: `${color}20`, color, border: `1px solid ${color}40`, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>
                        You are here · Day {dayInPhase}
                      </span>
                    )}
                    {isPast && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,.05)", color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Complete</span>}
                  </div>
                  <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.4 }}>{phase.trainingFocus}</p>
                </div>
              </div>
              {(isActive || i === (currentPhaseIndex ?? -1) + 1) && phase.keyActions && (
                <div style={{ padding: "0 18px 14px 40px" }}>
                  {phase.keyActions.map((a, j) => (
                    <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <span style={{ color, flexShrink: 0, fontSize: 12 }}>›</span>
                      <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#94A3B8", lineHeight: 1.45 }}>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Supplements Section ────────────────────────────────────────────────────────
function SupplementsSection({
  tierPack, supplementSchedule, adoptedIds, onToggle, onBulkAdoptEssentials,
}: {
  tierPack:              SportsProtocolPayload["tierPack"];
  supplementSchedule:    SportsProtocolPayload["supplementSchedule"];
  adoptedIds:            string[];
  onToggle:              (name: string) => void;
  onBulkAdoptEssentials: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"supplements" | "roi" | "testing" | "gear" | "services">("supplements");
  if (!tierPack) return null;

  const URGENCY_COLORS: Record<string, string> = { high: "#EF4444", medium: "#F59E0B", low: "#64748B" };
  const supplements  = [...(tierPack.supplements ?? [])].sort((a, b) => (PRIORITY_RANK[a.priority ?? ""] ?? 3) - (PRIORITY_RANK[b.priority ?? ""] ?? 3));
  const essentialCount = supplements.filter(s => s.priority === "essential").length;
  const totalMonthly   = supplements.reduce((sum, s) => { const m = s.priceEstimate?.match(/\$(\d+)/); return sum + (m ? parseInt(m[1]) : 0); }, 0);

  const TABS = [
    { id: "supplements" as const, label: "All" },
    { id: "roi"         as const, label: "Best Value" },
    { id: "testing"     as const, label: "Testing" },
    { id: "gear"        as const, label: "Gear" },
    { id: "services"    as const, label: "Services" },
  ];

  return (
    <div className="bz-section-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 400, color: "#F1F5F9", margin: "0 0 4px" }}>My pack</h2>
          <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", margin: 0 }}>
            {adoptedIds.length}/{supplements.length} adopted · Tier {tierPack.tier}{totalMonthly > 0 ? ` · ~$${totalMonthly}/mo` : ""}
          </p>
        </div>
        {adoptedIds.length === 0 && essentialCount > 0 && (
          <button
            onClick={onBulkAdoptEssentials}
            style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer", background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)", color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}
          >
            Adopt essentials →
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer",
              background: activeTab === t.id ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)",
              border: `1px solid ${activeTab === t.id ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.08)"}`,
              color: activeTab === t.id ? "#A5B4FC" : "#64748B",
              fontFamily: "var(--font-ui,'Inter',sans-serif)",
            }}
          >{t.label}</button>
        ))}
      </div>

      {activeTab === "supplements" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(["essential", "high", "moderate"] as const).map(priority => {
            const group = supplements.filter(s => s.priority === priority);
            if (!group.length) return null;
            const pc = PRIORITY_COLORS[priority];
            return (
              <div key={priority}>
                <div style={{ fontSize: 9, color: pc.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 2 }}>
                  {priority}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.map(s => {
                    const adopted = adoptedIds.includes(s.name);
                    return (
                      <div key={s.name} style={{ borderRadius: 12, border: `1px solid ${adopted ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.07)"}`, background: adopted ? "rgba(16,185,129,.04)" : "rgba(255,255,255,.02)", overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>
                          <button
                            onClick={() => onToggle(s.name)}
                            style={{
                              width: 28, height: 28, marginTop: 0, borderRadius: "50%", flexShrink: 0,
                              background: adopted
                                ? "linear-gradient(135deg, #10B981, #34D399)"
                                : "rgba(255,255,255,0.04)",
                              border: `2px solid ${adopted ? "#10B981" : "rgba(255,255,255,0.18)"}`,
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all .25s cubic-bezier(.16,1,.3,1)",
                              transform: adopted ? "scale(1.08)" : "scale(1)",
                              boxShadow: adopted ? "0 0 12px rgba(16,185,129,0.4)" : "none",
                            }}
                          >
                            {adopted && <Check size={12} color="white" strokeWidth={3} />}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, fontWeight: 500, color: adopted ? "#475569" : "#F1F5F9", textDecoration: adopted ? "line-through" : "none" }}>{s.name}</span>
                                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 100, background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, textTransform: "uppercase" }}>{priority}</span>
                              </div>
                              {s.priceEstimate && <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 10, color: "#64748B", flexShrink: 0 }}>{s.priceEstimate}</span>}
                            </div>
                            <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#10B981", opacity: .7, marginBottom: s.notes ? 4 : 0 }}>{s.dose} · {s.timing}</div>
                            {s.notes && <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B", lineHeight: 1.45 }}>{s.notes}</div>}
                          </div>
                        </div>
                        {s.purchaseUrl && !adopted && (
                          <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px 12px", borderTop: "1px solid rgba(255,255,255,.04)", background: "rgba(255,255,255,.01)" }}>
                            <a href={s.purchaseUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: "5px 14px", borderRadius: 7, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", color: "#A5B4FC", textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>
                              Buy →
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* unprioritised items */}
          {supplements.filter(s => !s.priority).map(s => {
            const adopted = adoptedIds.includes(s.name);
            return (
              <div key={s.name} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={() => onToggle(s.name)} style={{ width: 18, height: 18, borderRadius: "50%", background: adopted ? "#10B981" : "transparent", border: `2px solid ${adopted ? "#10B981" : "#374151"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {adopted && <Check size={9} color="white" strokeWidth={3} />}
                </button>
                <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: adopted ? "#475569" : "#F1F5F9", textDecoration: adopted ? "line-through" : "none" }}>{s.name}</span>
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#10B981", opacity: .7 }}>{s.dose}</span>
              </div>
            );
          })}

          {/* Daily schedule collapsed */}
          {supplementSchedule && supplementSchedule.length > 0 && (
            <details style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
              <summary style={{ padding: "12px 16px", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🕐 View daily schedule</span><span style={{ marginLeft: "auto", fontSize: 10 }}>▼</span>
              </summary>
              <div style={{ padding: "0 16px 16px" }}>
                {(() => {
                  const grouped: Record<string, typeof supplementSchedule> = {};
                  for (const item of supplementSchedule) {
                    if (!grouped[item.timing]) grouped[item.timing] = [];
                    grouped[item.timing].push(item);
                  }
                  const ORDER = ["Morning", "Pre-workout", "During", "Post-workout", "With meals", "Evening"];
                  const keys  = [...ORDER.filter(k => grouped[k]), ...Object.keys(grouped).filter(k => !ORDER.includes(k))];
                  return keys.map(timing => (
                    <div key={timing} style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 9, color: "#475569", letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 6 }}>{timing}</div>
                      {grouped[timing].map((item, j) => (
                        <div key={j} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.025)" }}>
                          <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#F1F5F9", minWidth: 130 }}>{item.name}</span>
                          <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B" }}>{item.dose}{item.withFood ? " · with food" : ""}</span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </details>
          )}
        </div>
      )}

      {activeTab === "roi" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(tierPack.biggestROI ?? []).map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
              <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 13, color: "#6366F1", fontWeight: 600, flexShrink: 0 }}>#{i + 1}</span>
              <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
          {(tierPack.whatYouAreMissing ?? []).length > 0 && (
            <div style={{ marginTop: 8, padding: "13px 16px", borderRadius: 10, background: "rgba(245,158,11,.04)", border: "1px solid rgba(245,158,11,.14)" }}>
              <div style={{ fontSize: 9, color: "#F59E0B", letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>What you&apos;re missing</div>
              {(tierPack.whatYouAreMissing ?? []).map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: "#F59E0B" }}>›</span>
                  <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#94A3B8" }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "testing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(tierPack.testing ?? []).length === 0
            ? <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#475569" }}>No testing at Tier {tierPack.tier}.</p>
            : (tierPack.testing ?? []).map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ color: "#06B6D4" }}>›</span>
                <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#94A3B8" }}>{t}</span>
              </div>
            ))}
        </div>
      )}

      {activeTab === "gear" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(tierPack.gear ?? []).length === 0
            ? <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#475569" }}>No gear at Tier {tierPack.tier}.</p>
            : (tierPack.gear ?? []).map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ color: "#10B981" }}>›</span>
                <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#94A3B8" }}>{g}</span>
              </div>
            ))}
        </div>
      )}

      {activeTab === "services" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(tierPack.services ?? []).length === 0
            ? <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#475569" }}>No services at Tier {tierPack.tier}.</p>
            : (tierPack.services ?? []).map((s, i) => {
              if (typeof s === "string") return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ color: "#A78BFA" }}>›</span>
                  <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#94A3B8" }}>{s}</span>
                </div>
              );
              const uc = URGENCY_COLORS[s.urgency ?? "low"] ?? "#64748B";
              return (
                <div key={i} style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 13, color: "#F1F5F9", marginBottom: 4 }}>{s.name}</div>
                      {s.urgency && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 100, background: `${uc}15`, color: uc, border: `1px solid ${uc}30`, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, textTransform: "uppercase" }}>{s.urgency} priority</span>}
                    </div>
                    {s.priceRange && <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: "#64748B" }}>{s.priceRange}</span>}
                  </div>
                  {s.rationale && <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B", lineHeight: 1.5, marginBottom: s.bookingUrl ? 10 : 0 }}>{s.rationale}</div>}
                  {s.bookingUrl && (
                    <a href={s.bookingUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "5px 14px", borderRadius: 7, background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.25)", color: "#A78BFA", fontSize: 11, textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>
                      Book →
                    </a>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ── Safety Section ─────────────────────────────────────────────────────────────
function SafetySection({ redFlags }: { redFlags: SportsProtocolPayload["redFlags"] }) {
  if (!redFlags) return null;
  return (
    <div className="bz-section-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 400, color: "#F1F5F9", margin: "0 0 4px" }}>Safety & red flags</h2>
        <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", margin: 0 }}>
          Generated from your injury profile and medications.
        </p>
      </div>

      {redFlags.contraindications.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", background: "rgba(239,68,68,.04)", border: "1px solid rgba(239,68,68,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid rgba(239,68,68,.08)" }}>
            <span>🚫</span>
            <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: "#FCA5A5" }}>Avoid completely</span>
          </div>
          {redFlags.contraindications.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "11px 18px", borderBottom: i < redFlags.contraindications.length - 1 ? "1px solid rgba(239,68,68,.05)" : "none" }}>
              <span style={{ color: "#EF4444", flexShrink: 0 }}>✕</span>
              <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#E2E8F0", lineHeight: 1.5, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      )}

      {redFlags.doctorDiscussion.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", background: "rgba(245,158,11,.04)", border: "1px solid rgba(245,158,11,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid rgba(245,158,11,.08)" }}>
            <span>💬</span>
            <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: "#FCD34D" }}>Discuss with your doctor</span>
          </div>
          {redFlags.doctorDiscussion.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "11px 18px", borderBottom: i < redFlags.doctorDiscussion.length - 1 ? "1px solid rgba(245,158,11,.05)" : "none" }}>
              <span style={{ color: "#F59E0B", flexShrink: 0 }}>→</span>
              <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#E2E8F0", lineHeight: 1.5, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      )}

      {redFlags.weeklyMonitoring.length > 0 && (
        <div style={{ borderRadius: 12, overflow: "hidden", background: "rgba(59,130,246,.04)", border: "1px solid rgba(59,130,246,.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid rgba(59,130,246,.08)" }}>
            <span>📊</span>
            <span style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, fontWeight: 500, color: "#93C5FD" }}>Weekly monitoring</span>
          </div>
          {redFlags.weeklyMonitoring.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "11px 18px", borderBottom: i < redFlags.weeklyMonitoring.length - 1 ? "1px solid rgba(59,130,246,.05)" : "none" }}>
              <span style={{ color: "#3B82F6", flexShrink: 0 }}>›</span>
              <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#E2E8F0", lineHeight: 1.5, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Metrics Section ────────────────────────────────────────────────────────────
function MetricsSection({ metrics, hasWearable }: { metrics: SportsWearableMetric[]; hasWearable: boolean }) {
  const [openIdx, setOpenIdx] = useState<number>(0);

  return (
    <div className="bz-section-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontSize: 20, fontWeight: 400, color: "#F1F5F9", margin: "0 0 4px" }}>Wearable metrics</h2>
        <p style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#64748B", margin: 0 }}>Protocol-specific guidance for your wearable readings.</p>
      </div>

      {!hasWearable && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 12, background: "rgba(245,158,11,.05)", border: "1px solid rgba(245,158,11,.15)" }}>
          <Watch size={20} color="#F59E0B" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: "#F1F5F9", marginBottom: 2 }}>No wearable connected</div>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 11, color: "#64748B" }}>Connect to unlock readiness and HRV coaching calibrated to your protocol.</div>
          </div>
          <a href="/app/settings" style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 7, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", color: "#FCD34D", fontSize: 11, textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>
            Connect →
          </a>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ borderRadius: 12, border: `1px solid ${openIdx === i ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.06)"}`, background: openIdx === i ? "rgba(99,102,241,.05)" : "rgba(255,255,255,.02)", overflow: "hidden" }}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
              style={{ width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
            >
              <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 13, color: "#F1F5F9", flex: 1 }}>{m.metric}</span>
              <ChevronDown size={14} color="#475569" style={{ transform: openIdx === i ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {openIdx === i && (
              <div style={{ padding: "0 18px 16px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Good trend",     text: m.goodTrend,        color: "#10B981" },
                  { label: "Concerning",     text: m.concerningTrend,  color: "#EF4444" },
                  { label: "Training guide", text: m.trainingGuidance, color: "#6366F1" },
                ].map(row => (
                  <div key={row.label} style={{ paddingTop: 12 }}>
                    <div style={{ fontSize: 9, color: row.color, letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 12, color: "#94A3B8", lineHeight: 1.55 }}>{row.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export function SportsResultsPage({
  payload,
  eventMeta,
  hasWearable       = false,
  hasBloodTest      = false,
  protocolId,
  initialAdoptedIds = [],
}: SportsResultsPageProps) {
  const [activeSection, setActiveSectionState] = useState<SectionId>("today");
  const [sectionKey,    setSectionKey]          = useState(0);
  const [adoptedIds,    setAdoptedIds]           = useState<string[]>(initialAdoptedIds);
  const prevPct = useRef(0);

  const supplements      = payload.tierPack?.supplements ?? [];
  const totalSupplements = supplements.length;
  const completionPct    = totalSupplements > 0 ? Math.round((adoptedIds.length / totalSupplements) * 100) : 0;
  const currentPhase     = payload.periodizedTimeline?.length > 0
    ? computeCurrentPhase(payload.periodizedTimeline, eventMeta.eventDate)
    : null;
  const daysToRace       = differenceInDays(new Date(eventMeta.eventDate), new Date());
  const flagCount        = [
    ...(payload.redFlags?.contraindications ?? []),
    ...(payload.redFlags?.doctorDiscussion  ?? []),
  ].length;

  // 100% completion celebration
  useEffect(() => {
    if (completionPct === 100 && prevPct.current < 100) {
      toast.success("Protocol fully activated 🎉", {
        description: "All supplements adopted. Your protocol is live.",
      });
    }
    prevPct.current = completionPct;
  }, [completionPct]);

  function setSection(id: SectionId) {
    setActiveSectionState(id);
    setSectionKey(k => k + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const toggleAdopt = useCallback(async (supplementName: string) => {
    setAdoptedIds(prev =>
      prev.includes(supplementName) ? prev.filter(n => n !== supplementName) : [...prev, supplementName]
    );
    try {
      await fetch("/api/supplement-adoptions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplementName, protocolType: "sports" }),
      });
    } catch { /* optimistic; ignore */ }
  }, []);

  function bulkAdoptEssentials() {
    const names = supplements.filter(s => s.priority === "essential").map(s => s.name);
    setAdoptedIds(prev => Array.from(new Set([...prev, ...names])));
    names.forEach(supplementName => {
      fetch("/api/supplement-adoptions/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplementName, protocolType: "sports" }),
      }).catch(() => {});
    });
  }

  return (
    <>
      <style>{`
        .bz-section-enter { animation: bzSectionIn 0.25s ease-out; }
        @keyframes bzSectionIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bzRingPulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.9;transform:scale(1.15)} }
        @media(min-width:1024px){.bz-left-panel{display:flex!important}.bz-mobile-tabs{display:none!important}.bz-right-content{padding-bottom:32px!important}}
        @media(max-width:1023px){.bz-left-panel{display:none!important}.bz-mobile-tabs{display:flex!important}.bz-right-content{padding-bottom:96px!important}}
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", minHeight: "calc(100svh - 4rem)" }}>

        {/* Left command panel */}
        <LeftCommandPanel
          activeSection={activeSection}
          setSection={setSection}
          daysToRace={daysToRace}
          currentPhase={currentPhase}
          completionPct={completionPct}
          adoptedCount={adoptedIds.length}
          totalSupplements={totalSupplements}
          eventMeta={eventMeta}
          flagCount={flagCount}
          onShare={() => generateProtocolShareCard(eventMeta)}
        />

        {/* Right content */}
        <main
          className="bz-right-content"
          style={{ flex: 1, minWidth: 0, padding: "24px 24px 16px", maxWidth: 700 }}
        >
          <div key={sectionKey}>
            {activeSection === "today" && (
              <TodaySection
                payload={payload}
                adoptedIds={adoptedIds}
                onToggle={toggleAdopt}
                eventMeta={eventMeta}
                currentPhase={currentPhase}
                hasWearable={hasWearable}
                hasBloodTest={hasBloodTest}
                protocolId={protocolId}
              />
            )}
            {activeSection === "why" && (
              <WhySection payload={payload} hasBloodTest={hasBloodTest} />
            )}
            {activeSection === "timeline" && (
              <TimelineSection
                phases={payload.periodizedTimeline}
                eventDate={eventMeta.eventDate}
                currentPhaseIndex={currentPhase?.index ?? null}
              />
            )}
            {activeSection === "supplements" && (
              <SupplementsSection
                tierPack={payload.tierPack}
                supplementSchedule={payload.supplementSchedule}
                adoptedIds={adoptedIds}
                onToggle={toggleAdopt}
                onBulkAdoptEssentials={bulkAdoptEssentials}
              />
            )}
            {activeSection === "safety" && (
              <SafetySection redFlags={payload.redFlags} />
            )}
            {activeSection === "metrics" && (
              <MetricsSection metrics={payload.wearableMetrics ?? []} hasWearable={hasWearable} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile tab bar */}
      <MobileTabBar activeSection={activeSection} setSection={setSection} />
    </>
  );
}
