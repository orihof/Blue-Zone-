/// app/components/PregnancySafetyBanner.tsx
"use client";

import { useState } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────

const SYNE   = "var(--font-serif,'Syne',sans-serif)";
const INTER  = "Inter,system-ui,sans-serif";
const TEXT   = "#F1F5F9";
const MUTED  = "#64748B";

// Amber palette
const AMB_BG    = "rgba(217,119,6,0.10)";
const AMB_BG2   = "rgba(217,119,6,0.06)";
const AMB_BD    = "rgba(217,119,6,0.30)";
const AMB_BD2   = "rgba(217,119,6,0.18)";
const AMB_TEXT  = "#FCD34D";
const AMB_MUTED = "#B45309";
const AMB_CHIP  = "rgba(217,119,6,0.15)";
const AMB_CHIP_BD = "rgba(217,119,6,0.35)";

// ── Status labels ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  not_pregnant:       "Not Pregnant",
  trying_to_conceive: "Trying to Conceive",
  first_trimester:    "First Trimester",
  second_trimester:   "Second Trimester",
  third_trimester:    "Third Trimester",
  postpartum_0_3mo:   "Postpartum (0–3 months)",
  postpartum_3_6mo:   "Postpartum (3–6 months)",
  breastfeeding:      "Breastfeeding",
};

const STATUS_ORDER = [
  "not_pregnant",
  "trying_to_conceive",
  "first_trimester",
  "second_trimester",
  "third_trimester",
  "postpartum_0_3mo",
  "postpartum_3_6mo",
  "breastfeeding",
] as const;

// Mirrors getMandatoryPregnancyDisclaimer() — kept inline since
// lib/pregnancy-safety.ts is server-only.
const DISCLAIMER =
  "This protocol has been filtered for pregnancy safety. Supplement needs change throughout " +
  "pregnancy and postpartum. Always review your full supplement list with your OB, midwife, " +
  "or prenatal dietitian before starting, stopping, or changing any supplement.";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PregnancySafetyBannerProps {
  pregnancyStatus: string;
  blockedCount:    number;
  cappedCount:     number;
}

// ── Status update modal ───────────────────────────────────────────────────────

function StatusModal({
  current,
  onClose,
}: {
  current: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(current);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSave() {
    if (selected === current) { onClose(); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pregnancy/status", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: selected }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Request failed");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Update pregnancy status"
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
      {/* Modal card — stop propagation so clicking inside doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "#111827",
          border:       `1px solid ${AMB_BD}`,
          borderRadius: 14,
          padding:      "28px 28px 24px",
          width:        "100%",
          maxWidth:     420,
          boxShadow:    "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2
            style={{
              fontFamily:    SYNE,
              fontSize:      19,
              fontWeight:    400,
              color:         TEXT,
              margin:        0,
              letterSpacing: "-.01em",
            }}
          >
            Update Pregnancy Status
          </h2>
          <button
            onClick={onClose}
            style={{
              background:   "transparent",
              border:       "none",
              cursor:       "pointer",
              color:        MUTED,
              fontSize:     20,
              lineHeight:   1,
              padding:      "2px 4px",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Select */}
        <label
          htmlFor="pregnancy-status-select"
          style={{
            display:    "block",
            fontFamily: INTER,
            fontSize:   12,
            fontWeight: 600,
            color:      MUTED,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom:  8,
          }}
        >
          Current status
        </label>
        <select
          id="pregnancy-status-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            width:        "100%",
            background:   "#0D1117",
            border:       `1px solid ${AMB_BD}`,
            borderRadius: 8,
            padding:      "10px 12px",
            color:        TEXT,
            fontFamily:   INTER,
            fontSize:     14,
            cursor:       "pointer",
            outline:      "none",
            marginBottom: 20,
            appearance:   "none",
            WebkitAppearance: "none",
          }}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} style={{ background: "#0D1117", color: TEXT }}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        {/* Info text */}
        <p
          style={{
            fontFamily:  INTER,
            fontSize:    12,
            color:       AMB_MUTED,
            lineHeight:  1.55,
            margin:      "0 0 20px",
          }}
        >
          Updating your status will re-filter your protocol supplements and doses
          for the selected phase. This change takes effect immediately.
        </p>

        {/* Error */}
        {error && (
          <p
            style={{
              fontFamily:   INTER,
              fontSize:     12,
              color:        "#F87171",
              background:   "rgba(239,68,68,0.08)",
              border:       "1px solid rgba(239,68,68,0.25)",
              borderRadius: 6,
              padding:      "8px 10px",
              margin:       "0 0 16px",
            }}
          >
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              fontFamily:   INTER,
              fontSize:     13,
              fontWeight:   500,
              background:   "transparent",
              border:       "1px solid rgba(100,116,139,0.3)",
              borderRadius: 7,
              color:        MUTED,
              padding:      "8px 16px",
              cursor:       saving ? "not-allowed" : "pointer",
              opacity:      saving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              fontFamily:   INTER,
              fontSize:     13,
              fontWeight:   600,
              background:   AMB_CHIP,
              border:       `1px solid ${AMB_CHIP_BD}`,
              borderRadius: 7,
              color:        AMB_TEXT,
              padding:      "8px 18px",
              cursor:       saving ? "not-allowed" : "pointer",
              opacity:      saving ? 0.6 : 1,
              transition:   "opacity 0.15s",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main banner ───────────────────────────────────────────────────────────────

export function PregnancySafetyBanner({
  pregnancyStatus,
  blockedCount,
  cappedCount,
}: PregnancySafetyBannerProps) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);

  // Should never render for not_pregnant — guard defensively
  if (pregnancyStatus === "not_pregnant") return null;

  const label = STATUS_LABELS[pregnancyStatus] ?? pregnancyStatus;

  // ── Collapsed (single-line) ────────────────────────────────────────────────

  if (collapsed) {
    return (
      <>
        {modalOpen && (
          <StatusModal
            current={pregnancyStatus}
            onClose={() => setModalOpen(false)}
          />
        )}
        <div
          style={{
            background:    AMB_BG2,
            border:        `1px solid ${AMB_BD2}`,
            borderRadius:  10,
            padding:       "9px 14px",
            display:       "flex",
            alignItems:    "center",
            gap:           10,
            fontFamily:    INTER,
            fontSize:      13,
          }}
        >
          <span style={{ flexShrink: 0 }}>🤱</span>
          <span style={{ color: AMB_TEXT, fontWeight: 500, flex: 1 }}>
            Pregnancy safety active — {label}
          </span>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background:   "transparent",
              border:       "none",
              cursor:       "pointer",
              color:        MUTED,
              fontSize:     12,
              fontFamily:   INTER,
              padding:      "2px 6px",
              flexShrink:   0,
            }}
          >
            View ↓
          </button>
        </div>
      </>
    );
  }

  // ── Expanded ───────────────────────────────────────────────────────────────

  return (
    <>
      {modalOpen && (
        <StatusModal
          current={pregnancyStatus}
          onClose={() => setModalOpen(false)}
        />
      )}
      <div
        style={{
          background:   AMB_BG,
          border:       `1px solid ${AMB_BD}`,
          borderRadius: 12,
          overflow:     "hidden",
        }}
      >
        {/* Top accent strip */}
        <div
          style={{
            height:     3,
            background: "linear-gradient(90deg,#D97706 0%,#F59E0B 60%,#FCD34D 100%)",
          }}
        />

        <div style={{ padding: "16px 18px 18px" }}>
          {/* Header row */}
          <div
            style={{
              display:        "flex",
              alignItems:     "flex-start",
              justifyContent: "space-between",
              gap:            12,
              marginBottom:   12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🤱</span>
              <div>
                <div
                  style={{
                    fontFamily:    SYNE,
                    fontSize:      15,
                    fontWeight:    600,
                    color:         AMB_TEXT,
                    letterSpacing: "-.01em",
                    lineHeight:    1.2,
                  }}
                >
                  Pregnancy Safety Mode
                </div>
                <div
                  style={{
                    fontFamily: INTER,
                    fontSize:   12,
                    color:      AMB_MUTED,
                    marginTop:  2,
                  }}
                >
                  {label}
                </div>
              </div>
            </div>

            {/* Minimize button */}
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Minimize pregnancy safety banner"
              style={{
                background:   "transparent",
                border:       "none",
                cursor:       "pointer",
                color:        MUTED,
                fontSize:     13,
                fontFamily:   INTER,
                padding:      "2px 6px",
                flexShrink:   0,
                marginTop:    2,
              }}
            >
              Minimize ↑
            </button>
          </div>

          {/* Disclaimer text */}
          <p
            style={{
              fontFamily:  INTER,
              fontSize:    13,
              color:       "#E2C475",
              lineHeight:  1.6,
              margin:      "0 0 12px",
            }}
          >
            {DISCLAIMER}
          </p>

          {/* Count chips */}
          {(blockedCount > 0 || cappedCount > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {blockedCount > 0 && (
                <span
                  style={{
                    fontFamily:   INTER,
                    fontSize:     12,
                    fontWeight:   600,
                    background:   "rgba(239,68,68,0.1)",
                    border:       "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 20,
                    color:        "#FCA5A5",
                    padding:      "4px 10px",
                  }}
                >
                  🚫 {blockedCount} supplement{blockedCount !== 1 ? "s" : ""} hidden for pregnancy safety
                </span>
              )}
              {cappedCount > 0 && (
                <span
                  style={{
                    fontFamily:   INTER,
                    fontSize:     12,
                    fontWeight:   600,
                    background:   AMB_CHIP,
                    border:       `1px solid ${AMB_CHIP_BD}`,
                    borderRadius: 20,
                    color:        AMB_TEXT,
                    padding:      "4px 10px",
                  }}
                >
                  ⚖️ {cappedCount} dose{cappedCount !== 1 ? "s" : ""} adjusted for pregnancy safety
                </span>
              )}
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              height:       1,
              background:   AMB_BD2,
              marginBottom: 12,
            }}
          />

          {/* Update link */}
          <button
            onClick={() => setModalOpen(true)}
            style={{
              background:   "transparent",
              border:       "none",
              cursor:       "pointer",
              fontFamily:   INTER,
              fontSize:     13,
              fontWeight:   500,
              color:        AMB_TEXT,
              padding:      0,
              textDecoration: "underline",
              textDecorationColor: AMB_BD,
              textUnderlineOffset: "3px",
            }}
          >
            Update pregnancy status →
          </button>
        </div>
      </div>
    </>
  );
}
