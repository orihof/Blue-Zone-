/// app/components/OutcomeArcWidget.tsx
"use client";

import { useEffect, useState } from "react";
import type { OutcomeSummary, OutcomeMilestone } from "@/lib/outcome-tracker";

// ── Design tokens ─────────────────────────────────────────────────────────────

const SYNE  = "var(--font-serif,'Syne',sans-serif)";
const INTER = "Inter,system-ui,sans-serif";
const TEXT  = "#F1F5F9";
const MUTED = "#64748B";
const CARD  = "#111827";
const CARD2 = "#0D1117";
const BD    = "rgba(99,102,241,0.15)";
const GRAD  = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";

// ── Trajectory palette ────────────────────────────────────────────────────────

const TRAJ = {
  positive: {
    label: "Positive",
    icon:  "↑",
    color: "#6EE7B7",
    bg:    "rgba(16,185,129,0.1)",
    bd:    "rgba(16,185,129,0.3)",
  },
  mixed: {
    label: "Mixed",
    icon:  "≈",
    color: "#FCD34D",
    bg:    "rgba(217,119,6,0.1)",
    bd:    "rgba(217,119,6,0.3)",
  },
  negative: {
    label: "Negative",
    icon:  "↓",
    color: "#FCA5A5",
    bg:    "rgba(220,38,38,0.1)",
    bd:    "rgba(220,38,38,0.3)",
  },
  insufficient_data: {
    label: "Insufficient Data",
    icon:  "—",
    color: "#94A3B8",
    bg:    "rgba(71,85,105,0.15)",
    bd:    "rgba(71,85,105,0.3)",
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        height:       6,
        borderRadius: 3,
        background:   "rgba(30,41,59,0.8)",
        overflow:     "hidden",
        flex:         1,
      }}
    >
      <div
        style={{
          height:       "100%",
          width:        `${clamped}%`,
          background:   GRAD,
          borderRadius: 3,
          transition:   "width 0.4s ease",
        }}
      />
    </div>
  );
}

// ── Add Milestone modal ───────────────────────────────────────────────────────

type FormState = {
  marker_name:    string;
  milestone_name: string;
  target_value:   string;
  target_unit:    string;
  target_date:    string;
};

const EMPTY_FORM: FormState = {
  marker_name:    "",
  milestone_name: "",
  target_value:   "",
  target_unit:    "",
  target_date:    "",
};

function AddMilestoneModal({
  onClose,
  onAdded,
}: {
  onClose:  () => void;
  onAdded:  (m: OutcomeMilestone) => void;
}) {
  const [form,   setForm]   = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const targetNum = parseFloat(form.target_value);
    if (!form.marker_name.trim()) { setError("Marker name is required."); return; }
    if (!form.milestone_name.trim()) { setError("Milestone name is required."); return; }
    if (!form.target_value || isNaN(targetNum) || targetNum <= 0) { setError("Target value must be a positive number."); return; }
    if (!form.target_unit.trim()) { setError("Target unit is required."); return; }

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        marker_name:    form.marker_name.trim(),
        milestone_name: form.milestone_name.trim(),
        target_value:   targetNum,
        target_unit:    form.target_unit.trim(),
      };
      if (form.target_date) body.target_date = form.target_date;

      const res  = await fetch("/api/outcomes/milestones", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json() as { milestone?: OutcomeMilestone; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      onAdded(data.milestone!);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    background:   CARD2,
    border:       `1px solid ${BD}`,
    borderRadius: 7,
    padding:      "9px 11px",
    color:        TEXT,
    fontFamily:   INTER,
    fontSize:     13,
    outline:      "none",
    boxSizing:    "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display:       "block",
    fontFamily:    INTER,
    fontSize:      11,
    fontWeight:    600,
    color:         MUTED,
    textTransform: "uppercase",
    letterSpacing: ".06em",
    marginBottom:  5,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add milestone"
      onClick={onClose}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         1000,
        background:     "rgba(6,8,15,0.75)",
        backdropFilter: "blur(4px)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "20px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   CARD,
          border:       `1px solid ${BD}`,
          borderRadius: 14,
          padding:      "26px 26px 22px",
          width:        "100%",
          maxWidth:     440,
          boxShadow:    "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: SYNE, fontSize: 18, fontWeight: 400, color: TEXT, margin: 0, letterSpacing: "-.01em" }}>
            Add Milestone
          </h2>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: MUTED, fontSize: 20, lineHeight: 1, padding: "2px 4px" }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Marker name</label>
            <input
              style={inputStyle}
              placeholder="e.g. Ferritin"
              value={form.marker_name}
              onChange={(e) => set("marker_name", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Milestone name</label>
            <input
              style={inputStyle}
              placeholder="e.g. Ferritin above 50"
              value={form.milestone_name}
              onChange={(e) => set("milestone_name", e.target.value)}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Target value</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="any"
                placeholder="50"
                value={form.target_value}
                onChange={(e) => set("target_value", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Unit</label>
              <input
                style={inputStyle}
                placeholder="ng/mL"
                value={form.target_unit}
                onChange={(e) => set("target_unit", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Target date (optional)</label>
            <input
              style={inputStyle}
              type="date"
              value={form.target_date}
              onChange={(e) => set("target_date", e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontFamily: INTER, fontSize: 12, color: "#F87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, padding: "8px 10px", margin: "14px 0 0" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ fontFamily: INTER, fontSize: 13, fontWeight: 500, background: "transparent", border: `1px solid rgba(100,116,139,0.3)`, borderRadius: 7, color: MUTED, padding: "8px 16px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ fontFamily: INTER, fontSize: 13, fontWeight: 600, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 7, color: "#A5B4FC", padding: "8px 18px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, transition: "opacity 0.15s" }}
          >
            {saving ? "Saving…" : "Save Milestone"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Milestone rows ────────────────────────────────────────────────────────────

function AchievedRow({ m }: { m: OutcomeMilestone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <span style={{ fontSize: 15, color: "#34D399", flexShrink: 0 }}>✓</span>
      <span style={{ fontFamily: INTER, fontSize: 13, color: "#6EE7B7", flex: 1, lineHeight: 1.3 }}>
        {m.milestone_name}
      </span>
      {m.achieved_at && (
        <span style={{ fontFamily: INTER, fontSize: 11, color: MUTED, flexShrink: 0 }}>
          {fmtDate(m.achieved_at)}
        </span>
      )}
    </div>
  );
}

function InProgressRow({ m }: { m: OutcomeMilestone }) {
  return (
    <div style={{ padding: "7px 0", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: INTER, fontSize: 13, color: TEXT }}>
          {m.milestone_name}
        </span>
        <span style={{ fontFamily: INTER, fontSize: 11, color: "#A5B4FC", flexShrink: 0 }}>
          {m.progress_pct}%
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ProgressBar pct={m.progress_pct} />
        <span style={{ fontFamily: INTER, fontSize: 11, color: MUTED, flexShrink: 0, minWidth: 50 }}>
          {m.target_value} {m.target_unit}
        </span>
      </div>
    </div>
  );
}

function NotStartedRow({ m }: { m: OutcomeMilestone }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", opacity: 0.55 }}>
      <span style={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>○</span>
      <span style={{ fontFamily: INTER, fontSize: 13, color: MUTED, flex: 1 }}>
        {m.milestone_name}
      </span>
      <span style={{ fontFamily: INTER, fontSize: 11, color: "#374151", flexShrink: 0 }}>
        {m.target_value} {m.target_unit}
      </span>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function OutcomeArcWidget() {
  const [summary,    setSummary]    = useState<OutcomeSummary | null>(null);
  const [milestones, setMilestones] = useState<OutcomeMilestone[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);

  // ── Fetch on mount ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sumRes, msRes] = await Promise.all([
          fetch("/api/outcomes/summary"),
          fetch("/api/outcomes/milestones"),
        ]);
        const [sumData, msData] = await Promise.all([
          sumRes.json() as Promise<OutcomeSummary & { error?: string }>,
          msRes.json()  as Promise<{ milestones?: OutcomeMilestone[]; error?: string }>,
        ]);
        if (cancelled) return;
        if (sumData.error) throw new Error(sumData.error);
        setSummary(sumData);
        setMilestones(msData.milestones ?? []);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Enrich milestone statuses from summary ────────────────────────────────

  const enrichedMilestones: OutcomeMilestone[] = (() => {
    if (!summary) return milestones;
    const achievedMap = new Map<string, typeof summary.milestones_achieved[number]>();
    for (const m of summary.milestones_achieved) achievedMap.set(m.milestone_id, m);
    return milestones.map((m) => {
      const r = achievedMap.get(m.id);
      if (!r) return m;
      return { ...m, status: r.status, progress_pct: r.progress_pct, achieved_at: r.achieved_at ?? m.achieved_at };
    });
  })();

  const achieved   = enrichedMilestones.filter((m) => m.status === "achieved");
  const inProgress = enrichedMilestones.filter((m) => m.status === "in_progress");
  const notStarted = enrichedMilestones.filter((m) => m.status === "not_started");

  // ── Handle new milestone added ────────────────────────────────────────────

  function handleAdded(m: OutcomeMilestone) {
    setMilestones((prev) => [m, ...prev]);
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const traj     = summary ? TRAJ[summary.overall_trajectory] : null;
  const improved = summary?.markers_improved ?? [];
  const declined = summary?.markers_declined ?? [];

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          background:   CARD,
          border:       `1px solid ${BD}`,
          borderRadius: 14,
          padding:      "24px 20px",
          display:      "flex",
          alignItems:   "center",
          gap:          12,
        }}
      >
        <div
          style={{
            width: 20, height: 20, borderRadius: "50%",
            border: "2px solid rgba(99,102,241,0.2)",
            borderTop: "2px solid #7C3AED",
            animation: "bz-spin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontFamily: INTER, fontSize: 13, color: MUTED }}>Loading outcome data…</span>
        <style>{`@keyframes bz-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div
        style={{
          background:   CARD,
          border:       "1px solid rgba(220,38,38,0.25)",
          borderRadius: 14,
          padding:      "16px 20px",
          fontFamily:   INTER,
          fontSize:     13,
          color:        "#FCA5A5",
        }}
      >
        Failed to load outcome data: {loadError}
      </div>
    );
  }

  // ── Widget ────────────────────────────────────────────────────────────────

  return (
    <>
      {modalOpen && (
        <AddMilestoneModal
          onClose={() => setModalOpen(false)}
          onAdded={handleAdded}
        />
      )}

      <div
        style={{
          background:   CARD,
          border:       `1px solid ${BD}`,
          borderRadius: 14,
          overflow:     "hidden",
        }}
      >
        {/* ── Gradient top strip ───────────────────────────────────────────── */}
        <div style={{ height: 3, background: GRAD }} />

        <div style={{ padding: "20px 20px 22px" }}>

          {/* ── Header row ──────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <h2
              style={{
                fontFamily:    SYNE,
                fontSize:      17,
                fontWeight:    400,
                color:         TEXT,
                margin:        0,
                letterSpacing: "-.01em",
              }}
            >
              Protocol Outcomes
            </h2>

            {/* Trajectory badge */}
            {traj && (
              <span
                style={{
                  fontFamily:   INTER,
                  fontSize:     12,
                  fontWeight:   700,
                  background:   traj.bg,
                  border:       `1px solid ${traj.bd}`,
                  borderRadius: 20,
                  color:        traj.color,
                  padding:      "3px 10px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          5,
                  flexShrink:   0,
                }}
              >
                <span style={{ fontSize: 11 }}>{traj.icon}</span>
                {traj.label}
              </span>
            )}
          </div>

          {/* ── Narrative ───────────────────────────────────────────────────── */}
          {summary?.narrative && (
            <p
              style={{
                fontFamily:  INTER,
                fontSize:    13,
                color:       "#94A3B8",
                lineHeight:  1.55,
                margin:      "0 0 18px",
              }}
            >
              {summary.narrative}
            </p>
          )}

          {/* ── Markers section ─────────────────────────────────────────────── */}
          {(improved.length > 0 || declined.length > 0) && (
            <div
              style={{
                background:   "rgba(15,23,42,0.6)",
                border:       `1px solid ${BD}`,
                borderRadius: 10,
                padding:      "13px 14px",
                marginBottom: 18,
                display:      "flex",
                flexDirection:"column",
                gap:          8,
              }}
            >
              <div
                style={{
                  fontFamily:    INTER,
                  fontSize:      10,
                  fontWeight:    700,
                  color:         MUTED,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom:  4,
                }}
              >
                Biomarker Trends
              </div>

              {improved.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                  {improved.map((name) => (
                    <span
                      key={name}
                      style={{
                        fontFamily: INTER,
                        fontSize:   12,
                        color:      "#6EE7B7",
                        display:    "flex",
                        alignItems: "center",
                        gap:        4,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700 }}>↑</span> {name}
                    </span>
                  ))}
                </div>
              )}

              {declined.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                  {declined.map((name) => (
                    <span
                      key={name}
                      style={{
                        fontFamily: INTER,
                        fontSize:   12,
                        color:      "#FCA5A5",
                        display:    "flex",
                        alignItems: "center",
                        gap:        4,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700 }}>↓</span> {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Milestones section ──────────────────────────────────────────── */}
          <div>
            <div
              style={{
                fontFamily:    INTER,
                fontSize:      10,
                fontWeight:    700,
                color:         MUTED,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom:  10,
              }}
            >
              Milestones
            </div>

            {enrichedMilestones.length === 0 ? (
              <p style={{ fontFamily: INTER, fontSize: 13, color: "#374151", margin: "0 0 12px", lineHeight: 1.5 }}>
                No milestones set yet. Add your first goal below.
              </p>
            ) : (
              <div
                style={{
                  display:       "flex",
                  flexDirection: "column",
                  borderTop:     `1px solid ${BD}`,
                }}
              >
                {/* Achieved */}
                {achieved.map((m) => (
                  <div key={m.id} style={{ borderBottom: `1px solid ${BD}` }}>
                    <AchievedRow m={m} />
                  </div>
                ))}

                {/* In-progress */}
                {inProgress.map((m) => (
                  <div key={m.id} style={{ borderBottom: `1px solid ${BD}` }}>
                    <InProgressRow m={m} />
                  </div>
                ))}

                {/* Not started */}
                {notStarted.map((m) => (
                  <div key={m.id} style={{ borderBottom: `1px solid rgba(30,41,59,0.5)` }}>
                    <NotStartedRow m={m} />
                  </div>
                ))}
              </div>
            )}

            {/* Add Milestone button */}
            <button
              onClick={() => setModalOpen(true)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          6,
                marginTop:    12,
                background:   "transparent",
                border:       `1px dashed rgba(99,102,241,0.35)`,
                borderRadius: 8,
                color:        "#818CF8",
                fontFamily:   INTER,
                fontSize:     13,
                fontWeight:   500,
                padding:      "7px 14px",
                cursor:       "pointer",
                width:        "100%",
                justifyContent: "center",
                transition:   "background 0.15s, border-color 0.15s",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Add Milestone
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
