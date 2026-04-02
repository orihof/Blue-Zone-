"use client";
import type { Hotspot } from "./types";

interface Props {
  hotspot: Hotspot | null;
  screenPos: { x: number; y: number } | null;
  onClose: () => void;
  onCtaClick: (id: string) => void;
}

export default function DataPanel({
  hotspot,
  screenPos,
  onClose,
  onCtaClick,
}: Props) {
  if (!hotspot || !screenPos) return null;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const left = Math.min(Math.max(screenPos.x + 20, 12), vw - 256);
  const top = Math.min(Math.max(screenPos.y - 60, 12), vh - 300);

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: 240,
        zIndex: 1000,
        background: "rgba(5,10,31,0.96)",
        border: "1px solid rgba(0,212,255,0.6)",
        borderRadius: 8,
        padding: "14px 16px",
        fontFamily: "var(--font-label)",
        boxShadow: "0 0 32px rgba(0,212,255,0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--bz-cyan)",
            letterSpacing: "0.12em",
          }}
        >
          {hotspot.label}
        </span>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: "none",
            border: "none",
            color: "var(--bz-muted)",
            cursor: "pointer",
            fontSize: 16,
            padding: 0,
            minHeight: 44,
            minWidth: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "manipulation",
          }}
        >
          &times;
        </button>
      </div>
      <div
        style={{
          height: 1,
          background: "rgba(0,212,255,0.15)",
          marginBottom: 10,
        }}
      />
      {hotspot.metrics.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--bz-muted)" }}>
          No data available
        </div>
      ) : (
        hotspot.metrics.map((m, i) => (
          <div key={i} style={{ marginBottom: 9 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--bz-muted)",
                marginBottom: 2,
              }}
            >
              {m.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 17,
                  color: "#fff",
                  fontFamily: "var(--font-data)",
                  fontWeight: 700,
                }}
              >
                {m.value}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color:
                    m.trend === "stable"
                      ? "var(--bz-muted)"
                      : m.good
                        ? "var(--bz-teal)"
                        : "var(--bz-amber)",
                }}
              >
                {m.trend === "up" ? "\u2191" : m.trend === "down" ? "\u2193" : "\u2192"}
              </span>
            </div>
          </div>
        ))
      )}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(0,212,255,0.15)",
        }}
      >
        <button
          onClick={() => onCtaClick(hotspot.id)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--bz-cyan)",
            fontSize: 11,
            fontFamily: "var(--font-label)",
            letterSpacing: "0.06em",
            minHeight: 44,
            touchAction: "manipulation",
          }}
        >
          View Full Protocol &rarr;
        </button>
      </div>
    </div>
  );
}
