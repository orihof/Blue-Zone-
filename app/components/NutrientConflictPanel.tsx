/// app/components/NutrientConflictPanel.tsx
"use client";

import { useState } from "react";
import type { CompetitionResult } from "@/lib/nutrient-competition";

// ── Design tokens ─────────────────────────────────────────────────────────────

const SYNE  = "var(--font-serif,'Syne',sans-serif)";
const INTER = "Inter,system-ui,sans-serif";
const TEXT  = "#F1F5F9";
const MUTED = "#64748B";
const CARD  = "#111827";
const BD    = "rgba(99,102,241,0.15)";

// Severity palettes
const P = {
  critical: {
    bg:   "rgba(220,38,38,0.10)",
    bd:   "rgba(220,38,38,0.32)",
    tag:  "rgba(220,38,38,0.20)",
    tagT: "#FCA5A5",
    head: "#FCA5A5",
    ack:  "rgba(220,38,38,0.15)",
    ackBd:"rgba(220,38,38,0.40)",
    ackT: "#FCA5A5",
  },
  high: {
    bg:   "rgba(217,119,6,0.09)",
    bd:   "rgba(217,119,6,0.28)",
    tag:  "rgba(217,119,6,0.18)",
    tagT: "#FCD34D",
    head: "#FCD34D",
    ack:  "",
    ackBd:"",
    ackT: "",
  },
  moderate: {
    bg:   "rgba(71,85,105,0.12)",
    bd:   "rgba(71,85,105,0.28)",
    tag:  "rgba(71,85,105,0.22)",
    tagT: "#94A3B8",
    head: "#94A3B8",
    ack:  "",
    ackBd:"",
    ackT: "",
  },
  synergy: {
    bg:   "rgba(16,185,129,0.08)",
    bd:   "rgba(16,185,129,0.28)",
    tag:  "rgba(16,185,129,0.16)",
    tagT: "#6EE7B7",
    head: "#6EE7B7",
    ack:  "",
    ackBd:"",
    ackT: "",
  },
  pairing: {
    bg:   "rgba(59,130,246,0.09)",
    bd:   "rgba(59,130,246,0.28)",
    tag:  "rgba(59,130,246,0.16)",
    tagT: "#93C5FD",
    head: "#93C5FD",
    ack:  "",
    ackBd:"",
    ackT: "",
  },
} as const;

// ── Human-readable labels ─────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  transporter_competition: "Transporter Competition",
  absorption_inhibition:   "Absorption Inhibition",
  absorption_inhibitor:    "Absorption Inhibition",
  synergy_dependency:      "Synergy Dependency",
  synergy_enhancer:        "Synergy Enhancer",
  antagonism:              "Antagonism",
  oxidative_interference:  "Oxidative Interference",
  masking_interaction:     "Masking Interaction",
  binding_inhibition:      "Binding Inhibition",
  metabolic_depletion:     "Metabolic Depletion",
  receptor_competition:    "Receptor Competition",
};

function typeLabel(raw: string): string {
  return TYPE_LABELS[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function conflictKey(r: CompetitionResult): string {
  return `${r.nutrient_a}|${r.nutrient_b}`;
}

// ── Section header (collapsible) ──────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  open,
  onToggle,
  color,
}: {
  label:    string;
  count:    number;
  open:     boolean;
  onToggle: () => void;
  color:    string;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         8,
        background:  "transparent",
        border:      "none",
        cursor:      "pointer",
        padding:     "6px 0",
        width:       "100%",
        textAlign:   "left",
      }}
    >
      <span style={{ fontFamily: INTER, fontSize: 11, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>
        {label}
      </span>
      <span
        style={{
          fontFamily:   INTER,
          fontSize:     11,
          fontWeight:   700,
          background:   "rgba(99,102,241,0.15)",
          border:       "1px solid rgba(99,102,241,0.25)",
          borderRadius: 20,
          color:        "#A5B4FC",
          padding:      "1px 7px",
        }}
      >
        {count}
      </span>
      <span style={{ marginLeft: "auto", fontFamily: INTER, fontSize: 13, color: MUTED }}>
        {open ? "↑" : "↓"}
      </span>
    </button>
  );
}

// ── Conflict card ─────────────────────────────────────────────────────────────

type Palette = typeof P[keyof typeof P];

function ConflictCard({
  result,
  palette,
  showAck,
  acknowledged,
  onAck,
}: {
  result:       CompetitionResult;
  palette:      Palette;
  showAck:      boolean;
  acknowledged: boolean;
  onAck:        () => void;
}) {
  const dimmed = acknowledged;

  return (
    <div
      style={{
        background:   dimmed ? "rgba(30,41,59,0.5)" : palette.bg,
        border:       `1px solid ${dimmed ? "rgba(71,85,105,0.3)" : palette.bd}`,
        borderRadius: 10,
        padding:      "14px 16px",
        display:      "flex",
        flexDirection:"column",
        gap:          10,
        opacity:      dimmed ? 0.7 : 1,
        transition:   "all 0.2s",
      }}
    >
      {/* Nutrient pair + type badge */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontFamily: SYNE, fontSize: 15, fontWeight: 600, color: dimmed ? MUTED : palette.head, letterSpacing: "-.01em" }}>
          {result.nutrient_a}
        </span>
        <span style={{ fontFamily: INTER, fontSize: 14, color: MUTED }}>↔</span>
        <span style={{ fontFamily: SYNE, fontSize: 15, fontWeight: 600, color: dimmed ? MUTED : palette.head, letterSpacing: "-.01em" }}>
          {result.nutrient_b}
        </span>
        <span
          style={{
            fontFamily:   INTER,
            fontSize:     11,
            fontWeight:   600,
            background:   dimmed ? "rgba(71,85,105,0.15)" : palette.tag,
            border:       `1px solid ${dimmed ? "rgba(71,85,105,0.2)" : palette.bd}`,
            borderRadius: 20,
            color:        dimmed ? MUTED : palette.tagT,
            padding:      "2px 9px",
            flexShrink:   0,
          }}
        >
          {typeLabel(result.competition_type)}
        </span>

        {/* Acknowledged badge */}
        {acknowledged && (
          <span
            style={{
              fontFamily:   INTER,
              fontSize:     11,
              fontWeight:   600,
              background:   "rgba(16,185,129,0.1)",
              border:       "1px solid rgba(16,185,129,0.25)",
              borderRadius: 20,
              color:        "#6EE7B7",
              padding:      "2px 9px",
              flexShrink:   0,
            }}
          >
            ✓ Acknowledged
          </span>
        )}
      </div>

      {/* Mitigation strategy */}
      <p
        style={{
          fontFamily: INTER,
          fontSize:   13,
          color:      dimmed ? "#475569" : "#CBD5E1",
          lineHeight: 1.55,
          margin:     0,
        }}
      >
        {result.mitigation_strategy}
      </p>

      {/* Timing separation */}
      {result.timing_separation_hours !== undefined && (
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          6,
            fontFamily:   INTER,
            fontSize:     12,
            color:        dimmed ? "#374151" : "#94A3B8",
            background:   "rgba(15,23,42,0.5)",
            border:       "1px solid rgba(51,65,85,0.5)",
            borderRadius: 6,
            padding:      "6px 10px",
            width:        "fit-content",
          }}
        >
          <span>⏱</span>
          <span>Take {result.timing_separation_hours} hour{result.timing_separation_hours !== 1 ? "s" : ""} apart</span>
        </div>
      )}

      {/* Acknowledge button (critical only, pre-acknowledgement) */}
      {showAck && !acknowledged && (
        <button
          onClick={onAck}
          style={{
            fontFamily:   INTER,
            fontSize:     12,
            fontWeight:   600,
            background:   palette.ack,
            border:       `1px solid ${palette.ackBd}`,
            borderRadius: 7,
            color:        palette.ackT,
            padding:      "7px 14px",
            cursor:       "pointer",
            alignSelf:    "flex-start",
            transition:   "opacity 0.15s",
          }}
        >
          I understand — acknowledge
        </button>
      )}
    </div>
  );
}

// ── Synergy / pairing card ────────────────────────────────────────────────────

function SuggestionCard({
  result,
  palette,
  icon,
  label,
}: {
  result:  CompetitionResult;
  palette: Palette;
  icon:    string;
  label:   string;
}) {
  return (
    <div
      style={{
        background:   palette.bg,
        border:       `1px solid ${palette.bd}`,
        borderRadius: 10,
        padding:      "13px 16px",
        display:      "flex",
        flexDirection:"column",
        gap:          6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span
          style={{
            fontFamily:   INTER,
            fontSize:     11,
            fontWeight:   700,
            background:   palette.tag,
            border:       `1px solid ${palette.bd}`,
            borderRadius: 20,
            color:        palette.tagT,
            padding:      "2px 9px",
          }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontFamily: INTER,
          fontSize:   13,
          color:      "#CBD5E1",
          lineHeight: 1.55,
          margin:     0,
        }}
      >
        {result.action === "suggest_addition"
          ? `Consider adding ${result.nutrient_b} — works synergistically with ${result.nutrient_a} in your protocol.`
          : `${result.nutrient_a} and ${result.nutrient_b} work well together — consider taking them at the same time.`}
      </p>
      {result.mitigation_strategy && result.mitigation_strategy !== result.user_message && (
        <p
          style={{
            fontFamily: INTER,
            fontSize:   12,
            color:      MUTED,
            lineHeight: 1.5,
            margin:     0,
          }}
        >
          {result.mitigation_strategy}
        </p>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface NutrientConflictPanelProps {
  conflicts: CompetitionResult[];
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function NutrientConflictPanel({ conflicts }: NutrientConflictPanelProps) {
  const [panelOpen,    setPanelOpen]    = useState(true);
  const [highOpen,     setHighOpen]     = useState(true);
  const [moderateOpen, setModerateOpen] = useState(false);
  const [synergiesOpen,setSynergiesOpen]= useState(true);
  const [pairingsOpen, setPairingsOpen] = useState(true);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  // ── Partition conflicts ────────────────────────────────────────────────────

  const visible    = conflicts.filter((r) => r.action !== "log_silent");
  const criticals  = visible.filter((r) => r.clinical_significance === "critical" && r.action !== "suggest_addition" && r.action !== "suggest_pairing");
  const highs      = visible.filter((r) => r.clinical_significance === "high"     && r.action !== "suggest_addition" && r.action !== "suggest_pairing");
  const moderates  = visible.filter((r) => r.clinical_significance === "moderate" && r.action !== "suggest_addition" && r.action !== "suggest_pairing");
  const synergies  = visible.filter((r) => r.action === "suggest_addition");
  const pairings   = visible.filter((r) => r.action === "suggest_pairing");

  const totalCount = visible.length;

  // ── Nothing to show ────────────────────────────────────────────────────────

  if (totalCount === 0) return null;

  function ack(r: CompetitionResult) {
    setAcknowledged((prev) => new Set(Array.from(prev).concat(conflictKey(r))));
  }

  // ── Panel ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        background:   CARD,
        border:       `1px solid ${BD}`,
        borderRadius: 14,
        overflow:     "hidden",
      }}
    >
      {/* ── Panel header ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setPanelOpen((o) => !o)}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            10,
          width:          "100%",
          background:     "transparent",
          border:         "none",
          borderBottom:   panelOpen ? `1px solid ${BD}` : "none",
          padding:        "16px 20px",
          cursor:         "pointer",
          textAlign:      "left",
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚗️</span>
        <span
          style={{
            fontFamily:    SYNE,
            fontSize:      16,
            fontWeight:    400,
            color:         TEXT,
            letterSpacing: "-.01em",
            flex:          1,
          }}
        >
          Supplement Interactions
        </span>

        {/* Count badge */}
        <span
          style={{
            fontFamily:   INTER,
            fontSize:     12,
            fontWeight:   700,
            background:   criticals.length > 0
              ? "rgba(220,38,38,0.15)"
              : highs.length > 0
              ? "rgba(217,119,6,0.15)"
              : "rgba(99,102,241,0.15)",
            border:       criticals.length > 0
              ? "1px solid rgba(220,38,38,0.35)"
              : highs.length > 0
              ? "1px solid rgba(217,119,6,0.35)"
              : "1px solid rgba(99,102,241,0.25)",
            borderRadius: 20,
            color:        criticals.length > 0
              ? "#FCA5A5"
              : highs.length > 0
              ? "#FCD34D"
              : "#A5B4FC",
            padding:      "2px 10px",
            flexShrink:   0,
          }}
        >
          {totalCount}
        </span>

        <span style={{ fontFamily: INTER, fontSize: 13, color: MUTED, flexShrink: 0 }}>
          {panelOpen ? "↑" : "↓"}
        </span>
      </button>

      {/* ── Panel body ─────────────────────────────���────────────────────────── */}
      {panelOpen && (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Critical section ────────────────────────────────────────────── */}
          {criticals.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily:    INTER,
                  fontSize:      11,
                  fontWeight:    700,
                  color:         "#FCA5A5",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  marginBottom:  10,
                  display:       "flex",
                  alignItems:    "center",
                  gap:           6,
                }}
              >
                <span>🔴</span> Critical
                <span
                  style={{
                    background:   "rgba(220,38,38,0.15)",
                    border:       "1px solid rgba(220,38,38,0.32)",
                    borderRadius: 20,
                    padding:      "1px 7px",
                    color:        "#FCA5A5",
                  }}
                >
                  {criticals.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {criticals.map((r) => (
                  <ConflictCard
                    key={conflictKey(r)}
                    result={r}
                    palette={P.critical}
                    showAck
                    acknowledged={acknowledged.has(conflictKey(r))}
                    onAck={() => ack(r)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── High section ────────────────────────────────────────────────── */}
          {highs.length > 0 && (
            <div>
              <SectionHeader
                label="High"
                count={highs.length}
                open={highOpen}
                onToggle={() => setHighOpen((o) => !o)}
                color="#FCD34D"
              />
              {highOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {highs.map((r) => (
                    <ConflictCard
                      key={conflictKey(r)}
                      result={r}
                      palette={P.high}
                      showAck={false}
                      acknowledged={false}
                      onAck={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Moderate section (collapsed by default) ─────────────────────── */}
          {moderates.length > 0 && (
            <div>
              <SectionHeader
                label="Moderate"
                count={moderates.length}
                open={moderateOpen}
                onToggle={() => setModerateOpen((o) => !o)}
                color="#94A3B8"
              />
              {moderateOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {moderates.map((r) => (
                    <ConflictCard
                      key={conflictKey(r)}
                      result={r}
                      palette={P.moderate}
                      showAck={false}
                      acknowledged={false}
                      onAck={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Synergy suggestions ─────────────────────────────────────────── */}
          {synergies.length > 0 && (
            <div>
              <SectionHeader
                label="Synergy Opportunities"
                count={synergies.length}
                open={synergiesOpen}
                onToggle={() => setSynergiesOpen((o) => !o)}
                color="#6EE7B7"
              />
              {synergiesOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {synergies.map((r) => (
                    <SuggestionCard
                      key={conflictKey(r)}
                      result={r}
                      palette={P.synergy}
                      icon="✦"
                      label="Synergy"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Pairing suggestions ─────────────────────────────────────────── */}
          {pairings.length > 0 && (
            <div>
              <SectionHeader
                label="Pairing Suggestions"
                count={pairings.length}
                open={pairingsOpen}
                onToggle={() => setPairingsOpen((o) => !o)}
                color="#93C5FD"
              />
              {pairingsOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {pairings.map((r) => (
                    <SuggestionCard
                      key={conflictKey(r)}
                      result={r}
                      palette={P.pairing}
                      icon="⊕"
                      label="Pairing"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
