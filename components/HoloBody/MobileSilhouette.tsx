"use client";
import { useState } from "react";
import { HOTSPOTS, DEFAULT_FLAGGED } from "./hotspots";
import type { Hotspot } from "./types";

const MOBILE_HOTSPOTS = [
  { id: "brain", cx: 100, cy: 28 },
  { id: "heart", cx: 108, cy: 130 },
  { id: "lung_l", cx: 84, cy: 122 },
  { id: "gut", cx: 100, cy: 185 },
  { id: "knee_l", cx: 88, cy: 308 },
  { id: "knee_r", cx: 112, cy: 308 },
];

interface Props {
  flaggedOrgans?: string[];
}

export default function MobileSilhouette({
  flaggedOrgans = DEFAULT_FLAGGED,
}: Props) {
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);

  return (
    <div
      style={{
        width: "100%",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <svg viewBox="0 0 200 420" width="160" style={{ overflow: "visible" }}>
        {/* Head */}
        <circle
          cx="100"
          cy="28"
          r="22"
          fill="rgba(0,212,255,0.03)"
          stroke="#00D4FF"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
        {/* Neck */}
        <rect
          x="93"
          y="50"
          width="14"
          height="18"
          fill="rgba(0,212,255,0.03)"
          stroke="#00D4FF"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
        {/* Torso */}
        <path
          d="M68,68 L132,68 L138,190 L62,190 Z"
          fill="rgba(0,212,255,0.03)"
          stroke="#00D4FF"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
        {/* Arms */}
        <path
          d="M68,72 L46,150 L52,152 L72,80"
          fill="rgba(0,212,255,0.02)"
          stroke="#00D4FF"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />
        <path
          d="M132,72 L154,150 L148,152 L128,80"
          fill="rgba(0,212,255,0.02)"
          stroke="#00D4FF"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />
        {/* Legs */}
        <path
          d="M78,190 L74,310 L92,310 L100,240 L108,310 L126,310 L122,190 Z"
          fill="rgba(0,212,255,0.03)"
          stroke="#00D4FF"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />

        {/* Hotspot nodes */}
        {MOBILE_HOTSPOTS.map(({ id, cx, cy }, i) => {
          const hotspot = HOTSPOTS.find((h) => h.id === id);
          if (!hotspot) return null;
          const isFlagged = flaggedOrgans.includes(id);
          const color = isFlagged ? "#FFB800" : "#00D4FF";
          return (
            <g
              key={id}
              onClick={() =>
                setActiveHotspot(activeHotspot?.id === id ? null : hotspot)
              }
              style={{ cursor: "pointer" }}
            >
              <circle cx={cx} cy={cy} r={12} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={7}
                fill={color}
                fillOpacity="0.2"
                stroke={color}
                strokeWidth="1"
                style={{
                  animation: `mobileHotspot 1.4s ease-in-out ${i * 0.2}s infinite`,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                }}
              />
              <circle cx={cx} cy={cy} r={3} fill={color} />
            </g>
          );
        })}
      </svg>

      {/* Inline data panel for mobile */}
      {activeHotspot && (
        <div
          style={{
            width: "100%",
            background: "rgba(5,10,31,0.96)",
            border: "1px solid rgba(0,212,255,0.5)",
            borderRadius: 8,
            padding: "14px 16px",
            fontFamily: "var(--font-label)",
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
              {activeHotspot.label}
            </span>
            <button
              onClick={() => setActiveHotspot(null)}
              aria-label="Close panel"
              style={{
                background: "none",
                border: "none",
                color: "var(--bz-muted)",
                cursor: "pointer",
                fontSize: 18,
                padding: "0 4px",
                minHeight: 44,
                minWidth: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              &times;
            </button>
          </div>
          {activeHotspot.metrics.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
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
                    fontSize: 18,
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
                  {m.trend === "up"
                    ? "\u2191"
                    : m.trend === "down"
                      ? "\u2193"
                      : "\u2192"}
                </span>
              </div>
            </div>
          ))}
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(0,212,255,0.15)",
            }}
          >
            <button
              onClick={() => {
                window.location.href = `/dashboard?focus=${activeHotspot.id}`;
              }}
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
      )}

      <style>{`
        @keyframes mobileHotspot {
          0%,100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.3); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
