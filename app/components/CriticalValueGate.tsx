/// app/components/CriticalValueGate.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CriticalValueEvent } from "@/lib/types/health";

// ── Design tokens ─────────────────────────────────────────────────────────────

const GRAD    = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const SYNE    = "var(--font-serif,'Syne',sans-serif)";
const BG      = "rgba(6,8,15,0.92)";
const CARD2   = "#0D1117";
const TEXT    = "#F1F5F9";
const MUTED   = "#64748B";
const BORDER  = "rgba(99,102,241,0.2)";
const RED_BG  = "rgba(220,38,38,0.12)";
const RED_BD  = "rgba(220,38,38,0.35)";
const AMB_BG  = "rgba(217,119,6,0.1)";
const AMB_BD  = "rgba(217,119,6,0.3)";
const GRN_BG  = "rgba(16,185,129,0.1)";
const GRN_BD  = "rgba(16,185,129,0.3)";

type AckType = "provider_seen" | "provider_contacted" | "dismiss";
type AckMap  = Record<string, AckType>;
type LoadMap = Record<string, AckType | null>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function directionLabel(e: CriticalValueEvent): string {
  return e.threshold_triggered === "critical_high"
    ? `Critically elevated (threshold: ${e.threshold_value})`
    : `Critically low (threshold: ${e.threshold_value})`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AckButton({
  label,
  sublabel,
  onClick,
  disabled,
  variant,
}: {
  label:     string;
  sublabel?: string;
  onClick:   () => void;
  disabled:  boolean;
  variant:   "primary" | "secondary" | "ghost";
}) {
  const base: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    textAlign: "left",
    transition: "background 0.15s, border-color 0.15s, opacity 0.15s",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontFamily: "Inter,system-ui,sans-serif",
    fontSize: 13,
    lineHeight: 1.4,
  };

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      ...base,
      background: "rgba(59,130,246,0.15)",
      borderColor: "rgba(59,130,246,0.5)",
      color: "#93C5FD",
      fontWeight: 500,
    },
    secondary: {
      ...base,
      background: "rgba(99,102,241,0.1)",
      borderColor: "rgba(99,102,241,0.35)",
      color: "#A5B4FC",
      fontWeight: 500,
    },
    ghost: {
      ...base,
      background: "transparent",
      borderColor: "rgba(100,116,139,0.3)",
      color: MUTED,
      fontWeight: 400,
    },
  };

  return (
    <button style={styles[variant]} onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      {sublabel && (
        <span style={{ fontSize: 11, color: variant === "ghost" ? "#475569" : "inherit", opacity: 0.75 }}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

function EventCard({
  event,
  ackType,
  loadingAck,
  onAck,
}: {
  event:      CriticalValueEvent;
  ackType:    AckType | undefined;
  loadingAck: AckType | null | undefined;
  onAck:      (eventId: string, ack: AckType) => void;
}) {
  const acknowledged = ackType !== undefined;
  const isHigh       = event.threshold_triggered === "critical_high";

  return (
    <div
      style={{
        background:   acknowledged ? GRN_BG : RED_BG,
        border:       `1px solid ${acknowledged ? GRN_BD : RED_BD}`,
        borderRadius: 12,
        padding:      "18px 20px",
        display:      "flex",
        flexDirection:"column",
        gap:          14,
        transition:   "background 0.3s, border-color 0.3s",
      }}
    >
      {/* Marker header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div
            style={{
              fontFamily: SYNE,
              fontSize: 18,
              fontWeight: 600,
              color: acknowledged ? "#34D399" : "#FCA5A5",
              letterSpacing: "-.01em",
            }}
          >
            {event.marker_name}
          </div>
          <div style={{ fontFamily: "Inter,system-ui,sans-serif", fontSize: 12, color: MUTED, marginTop: 2 }}>
            {directionLabel(event)}
          </div>
        </div>

        {/* Value badge */}
        <div
          style={{
            background:   acknowledged ? GRN_BG : "rgba(239,68,68,0.15)",
            border:       `1px solid ${acknowledged ? GRN_BD : "rgba(239,68,68,0.4)"}`,
            borderRadius: 8,
            padding:      "6px 12px",
            textAlign:    "center",
            flexShrink:   0,
          }}
        >
          <div
            style={{
              fontFamily: SYNE,
              fontSize: 22,
              fontWeight: 700,
              color: acknowledged ? "#34D399" : "#F87171",
              lineHeight: 1,
            }}
          >
            {event.observed_value}
          </div>
          <div style={{ fontFamily: "Inter,system-ui,sans-serif", fontSize: 10, color: MUTED, marginTop: 2 }}>
            {isHigh ? "▲ high" : "▼ low"}
          </div>
        </div>
      </div>

      {/* Immediate action text */}
      {event.notes && (
        <div
          style={{
            background:   AMB_BG,
            border:       `1px solid ${AMB_BD}`,
            borderRadius: 8,
            padding:      "10px 13px",
            fontFamily:   "Inter,system-ui,sans-serif",
            fontSize:     13,
            color:        "#FCD34D",
            lineHeight:   1.55,
          }}
        >
          <span style={{ fontWeight: 600, marginRight: 6 }}>⚡ Recommended action:</span>
          {event.notes}
        </div>
      )}

      {/* Acknowledgement area */}
      {acknowledged ? (
        <div
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          8,
            background:   GRN_BG,
            border:       `1px solid ${GRN_BD}`,
            borderRadius: 8,
            padding:      "9px 13px",
            fontFamily:   "Inter,system-ui,sans-serif",
            fontSize:     13,
            color:        "#34D399",
            fontWeight:   500,
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span>
          <span>
            {ackType === "provider_seen"
              ? "Acknowledged — you have seen your doctor"
              : ackType === "provider_contacted"
              ? "Acknowledged — you have contacted your doctor"
              : "Dismissed (recorded for audit)"}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontFamily: "Inter,system-ui,sans-serif",
              fontSize:   11,
              color:      MUTED,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Acknowledge this result
          </div>
          <AckButton
            label="I have seen my doctor"
            sublabel="I discussed this result in person"
            onClick={() => onAck(event.id, "provider_seen")}
            disabled={loadingAck !== null && loadingAck !== undefined}
            variant="primary"
          />
          <AckButton
            label="I have contacted my doctor"
            sublabel="I called, messaged, or am scheduling an appointment"
            onClick={() => onAck(event.id, "provider_contacted")}
            disabled={loadingAck !== null && loadingAck !== undefined}
            variant="secondary"
          />
          <AckButton
            label="Dismiss (not recommended)"
            sublabel="This will be recorded. Your protocol remains paused until seen by a provider."
            onClick={() => onAck(event.id, "dismiss")}
            disabled={loadingAck !== null && loadingAck !== undefined}
            variant="ghost"
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CriticalValueGate() {
  const router = useRouter();

  const [events,    setEvents]    = useState<CriticalValueEvent[] | null>(null);
  const [ackMap,    setAckMap]    = useState<AckMap>({});
  const [loadMap,   setLoadMap]   = useState<LoadMap>({});
  const [resuming,  setResuming]  = useState(false);

  // ── Load active events on mount ───────────────────────────────────────────

  useEffect(() => {
    fetch("/api/critical-values/active")
      .then((r) => r.json())
      .then((d) => setEvents((d.critical_events as CriticalValueEvent[]) ?? []))
      .catch(() => setEvents([]));
  }, []);

  // ── Redirect when resuming ────────────────────────────────────────────────

  useEffect(() => {
    if (!resuming) return;
    const t = setTimeout(() => router.push("/app/dashboard"), 2200);
    return () => clearTimeout(t);
  }, [resuming, router]);

  // ── Acknowledge handler ───────────────────────────────────────────────────

  const acknowledge = useCallback(
    async (eventId: string, ackType: AckType) => {
      setLoadMap((prev) => ({ ...prev, [eventId]: ackType }));
      try {
        const res  = await fetch("/api/critical-values/acknowledge", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ eventId, acknowledgement: ackType }),
        });
        const data = await res.json() as { all_acknowledged?: boolean };
        setAckMap((prev) => ({ ...prev, [eventId]: ackType }));
        if (data.all_acknowledged) setResuming(true);
      } catch {
        // leave loading state cleared so user can retry
      } finally {
        setLoadMap((prev) => ({ ...prev, [eventId]: null }));
      }
    },
    []
  );

  // ── Loading state ─────────────────────────────────────────────────────────

  if (events === null) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: BG, backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "2px solid rgba(99,102,241,0.2)",
            borderTop: "2px solid #7C3AED",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  // ── No active critical events — render nothing ─────────────────────────────

  if (events.length === 0) return null;

  // ── All-acknowledged / resuming state ────────────────────────────────────

  if (resuming) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: BG, backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 16,
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: GRN_BG, border: `1px solid ${GRN_BD}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}
        >
          ✓
        </div>
        <div
          style={{
            fontFamily: SYNE,
            fontSize:   22,
            fontWeight: 400,
            color:      "#34D399",
            letterSpacing: "-.01em",
          }}
        >
          Protocol resuming…
        </div>
        <div style={{ fontFamily: "Inter,system-ui,sans-serif", fontSize: 13, color: MUTED }}>
          Returning to dashboard
        </div>
      </div>
    );
  }

  const allAcked = events.every((e) => ackMap[e.id] !== undefined);

  // ── Gate overlay ──────────────────────────────────────────────────────────

  return (
    <>
      {/* Spin keyframe */}
      <style>{`@keyframes bz-spin { to { transform: rotate(360deg) } }`}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Critical lab result acknowledgement required"
        style={{
          position:       "fixed",
          inset:          0,
          zIndex:         9999,
          background:     BG,
          backdropFilter: "blur(6px)",
          overflowY:      "auto",
          display:        "flex",
          alignItems:     "flex-start",
          justifyContent: "center",
          padding:        "40px 16px 60px",
        }}
      >
        <div
          style={{
            width:        "100%",
            maxWidth:     640,
            background:   CARD2,
            border:       `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow:     "hidden",
            boxShadow:    "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* ── Top warning banner ─────────────────────────────────────── */}
          <div
            style={{
              background:  "linear-gradient(90deg,rgba(220,38,38,0.85) 0%,rgba(239,68,68,0.6) 100%)",
              padding:     "14px 24px",
              display:     "flex",
              alignItems:  "center",
              gap:         10,
            }}
          >
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span
              style={{
                fontFamily: "Inter,system-ui,sans-serif",
                fontSize:   13,
                fontWeight: 600,
                color:      "#FEE2E2",
                letterSpacing: ".01em",
              }}
            >
              Critical lab result detected — your protocol is paused
            </span>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div style={{ padding: "28px 28px 32px" }}>

            {/* Heading */}
            <div style={{ marginBottom: 8 }}>
              <h1
                style={{
                  fontFamily:    SYNE,
                  fontSize:      "clamp(20px,3vw,26px)",
                  fontWeight:    400,
                  color:         TEXT,
                  margin:        0,
                  letterSpacing: "-.02em",
                  lineHeight:    1.25,
                }}
              >
                Lab Result Requires Medical Attention
              </h1>
            </div>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: "Inter,system-ui,sans-serif",
                fontSize:   14,
                color:      MUTED,
                lineHeight: 1.6,
                margin:     "0 0 24px",
              }}
            >
              One or more of your recent lab markers triggered a critical threshold.
              Blue Zone has paused your active protocol.
              Please acknowledge each result below before continuing.
            </p>

            {/* ── Gradient divider ──────────────────────────────────────── */}
            <div
              style={{
                height:       1,
                background:   GRAD,
                opacity:      0.3,
                borderRadius: 1,
                marginBottom: 20,
              }}
            />

            {/* ── Event cards ───────────────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  ackType={ackMap[event.id]}
                  loadingAck={loadMap[event.id]}
                  onAck={acknowledge}
                />
              ))}
            </div>

            {/* ── "All done" hint ───────────────────────────────────────── */}
            {allAcked && (
              <div
                style={{
                  marginTop:    20,
                  background:   GRN_BG,
                  border:       `1px solid ${GRN_BD}`,
                  borderRadius: 10,
                  padding:      "14px 18px",
                  fontFamily:   "Inter,system-ui,sans-serif",
                  fontSize:     13,
                  color:        "#6EE7B7",
                  textAlign:    "center",
                }}
              >
                All results acknowledged — your protocol will resume shortly.
              </div>
            )}

            {/* ── Legal footer ──────────────────────────────────────────── */}
            <p
              style={{
                fontFamily: "Inter,system-ui,sans-serif",
                fontSize:   11,
                color:      "#374151",
                lineHeight: 1.55,
                margin:     "24px 0 0",
                textAlign:  "center",
              }}
            >
              Blue Zone is not a medical provider. These results have been flagged for informational purposes only.
              Always consult a licensed healthcare professional for diagnosis and treatment.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
