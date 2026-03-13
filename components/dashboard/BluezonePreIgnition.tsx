"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const UNLOCK_ITEMS = [
  {
    icon: "🧬",
    label: "Biological Age",
    desc: "vs. your calendar age",
    unit: "yrs",
    color: "#8B5CF6",
  },
  {
    icon: "⚡",
    label: "Recovery Score",
    desc: "daily readiness index",
    unit: "/100",
    color: "#3B82F6",
  },
  {
    icon: "❤️",
    label: "HRV Baseline",
    desc: "autonomic nervous system",
    unit: "ms",
    color: "#3B82F6",
  },
  {
    icon: "🌙",
    label: "Sleep Quality",
    desc: "recovery architecture",
    unit: "/100",
    color: "#8B5CF6",
  },
  {
    icon: "🔥",
    label: "Detected Signals",
    desc: "anomalies & opportunities",
    unit: null,
    color: "#F59E0B",
  },
  {
    icon: "🎯",
    label: "Weekly Protocol",
    desc: "AI-personalised targets",
    unit: null,
    color: "#10B981",
  },
];

const DATA_SOURCES = [
  {
    id: "labs",
    icon: "🧪",
    label: "Lab Results",
    desc: "Blood work, biomarkers",
    accent: "#8B5CF6",
  },
  {
    id: "whoop",
    icon: "⌚",
    label: "Wearable",
    desc: "Whoop, Oura, Garmin",
    accent: "#3B82F6",
  },
  {
    id: "checkin",
    icon: "✍️",
    label: "Manual Check-in",
    desc: "Takes 90 seconds",
    accent: "#10B981",
  },
];

const SOURCE_ROUTES: Record<string, string> = {
  labs:    "/app/biomarkers",
  whoop:   "/app/wearables",
  checkin: "/app/dashboard",
};

export default function BluezonePreIgnition() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        background: "#07070E",
        minHeight: "100vh",
        maxWidth: 390,
        margin: "0 auto",
        fontFamily: "system-ui",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rotateConic {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        @keyframes dotBlink {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes rowReveal {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .fade-up-0 { animation: fadeUp 0.6s ease both; animation-delay: 0.1s; }
        .fade-up-1 { animation: fadeUp 0.6s ease both; animation-delay: 0.2s; }
        .fade-up-2 { animation: fadeUp 0.6s ease both; animation-delay: 0.3s; }
        .fade-up-3 { animation: fadeUp 0.6s ease both; animation-delay: 0.4s; }
        .fade-up-4 { animation: fadeUp 0.6s ease both; animation-delay: 0.5s; }

        .source-card { transition: all 0.2s ease; cursor: pointer; }
        .source-card:active { transform: scale(0.97); }
      `}</style>

      {/* NAV */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "rgba(7,7,14,0.9)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 12,
              color: "white",
            }}
          >
            BZ
          </div>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "white",
            }}
          >
            Blue Zone
          </span>
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          👤
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div
        style={{
          overflowY: "auto",
          paddingBottom: 140,
        }}
      >
        {/* GREETING */}
        <div
          className="fade-up-0"
          style={{ padding: "28px 20px 0", opacity: mounted ? 1 : 0 }}
        >
          <p
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "#3B82F6",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Living Dashboard
          </p>
          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 30,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              marginBottom: 8,
            }}
          >
            Good morning, Or.
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#475569",
              lineHeight: 1.5,
              fontFamily: "Syne, sans-serif",
            }}
          >
            Your protocol is primed.{" "}
            <span style={{ color: "#64748B" }}>
              One data source activates everything.
            </span>
          </p>
        </div>

        {/* HERO — BIO AGE PRE-IGNITION */}
        <div
          className="fade-up-1"
          style={{ padding: "20px 20px 0", opacity: mounted ? 1 : 0 }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              background: "#0E0E1A",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "28px 24px 24px",
            }}
          >
            {/* Rotating gradient halo behind everything */}
            <div
              style={{
                position: "absolute",
                inset: -2,
                borderRadius: 21,
                background: "conic-gradient(from 0deg, #3B82F6 0deg, #8B5CF6 60deg, transparent 120deg, transparent 360deg)",
                animation: "rotateConic 4s linear infinite",
                opacity: 0.18,
                zIndex: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 1,
                borderRadius: 19,
                background: "#0E0E1A",
                zIndex: 1,
              }}
            />

            {/* Scanline effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "30%",
                background:
                  "linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 100%)",
                animation: "scanline 4s linear infinite",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />

            {/* Content */}
            <div style={{ position: "relative", zIndex: 3 }}>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "#334155",
                  textTransform: "uppercase",
                  fontFamily: "Syne, sans-serif",
                  marginBottom: 20,
                }}
              >
                Biological Age Score
              </p>

              {/* Score display — tease state */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 4,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 80,
                    fontWeight: 600,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(139,92,246,0.4))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "blur(3px)",
                    userSelect: "none",
                  }}
                >
                  38
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 18,
                    color: "rgba(139,92,246,0.3)",
                    marginBottom: 12,
                    filter: "blur(2px)",
                  }}
                >
                  yrs
                </span>
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: "#475569",
                  fontFamily: "Syne, sans-serif",
                  lineHeight: 1.5,
                  marginBottom: 20,
                }}
              >
                Your score is locked until your first data source connects.
              </p>

              {/* Progress indicators */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingTop: 18,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {[
                  {
                    label: "Lab results / biomarkers",
                    done: false,
                    accent: "#8B5CF6",
                  },
                  {
                    label: "Wearable device",
                    done: false,
                    accent: "#3B82F6",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `1px solid ${item.done ? item.accent : "rgba(255,255,255,0.1)"}`,
                        background: item.done
                          ? item.accent
                          : "rgba(255,255,255,0.02)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.done && (
                        <span style={{ fontSize: 10, color: "white" }}>✓</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#475569",
                        fontFamily: "Syne, sans-serif",
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: item.accent,
                        opacity: 0.6,
                      }}
                    >
                      → Add
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WHAT YOU'LL UNLOCK */}
        <div
          className="fade-up-2"
          style={{ padding: "20px 20px 0", opacity: mounted ? 1 : 0 }}
        >
          <div
            style={{
              borderRadius: 20,
              background: "#0E0E1A",
              border: "1px solid rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "#334155",
                    textTransform: "uppercase",
                    fontFamily: "Syne, sans-serif",
                    marginBottom: 3,
                  }}
                >
                  What You&apos;ll Unlock
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  6 modules activate instantly
                </p>
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#334155",
                  animation: "dotBlink 2s ease infinite",
                }}
              />
            </div>

            {/* Metric rows */}
            <div>
              {UNLOCK_ITEMS.map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "13px 20px",
                    borderBottom:
                      i < UNLOCK_ITEMS.length - 1
                        ? "1px solid rgba(255,255,255,0.03)"
                        : "none",
                    animation: `rowReveal 0.4s ease both`,
                    animationDelay: `${0.3 + i * 0.06}s`,
                    opacity: mounted ? 1 : 0,
                    gap: 12,
                  }}
                >
                  {/* Lock indicator */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: `${item.color}10`,
                      border: `1px solid ${item.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      flexShrink: 0,
                      filter: "grayscale(0.6)",
                      opacity: 0.6,
                    }}
                  >
                    {item.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: "Syne, sans-serif",
                        marginBottom: 2,
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#1E293B",
                        fontFamily: "Syne, sans-serif",
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>

                  {/* Fake value — blurred */}
                  {item.unit && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 2,
                        filter: "blur(4px)",
                        opacity: 0.2,
                        userSelect: "none",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 22,
                          fontWeight: 600,
                          color: item.color,
                        }}
                      >
                        {i === 0 ? "38" : i === 1 ? "81" : i === 2 ? "62" : "74"}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: "#475569",
                        }}
                      >
                        {item.unit}
                      </span>
                    </div>
                  )}

                  {!item.unit && (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: 9, color: "#1E293B" }}>🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SOURCE SELECTION HINT */}
        <div
          className="fade-up-3"
          style={{ padding: "20px 20px 0", opacity: mounted ? 1 : 0 }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "#1E293B",
              textTransform: "uppercase",
              fontFamily: "Syne, sans-serif",
              marginBottom: 12,
              paddingLeft: 2,
            }}
          >
            Choose Your Entry Point
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DATA_SOURCES.map((src) => (
              <div
                key={src.id}
                className="source-card"
                onClick={() =>
                  setSelectedSource(selectedSource === src.id ? null : src.id)
                }
                style={{
                  background:
                    selectedSource === src.id ? `${src.accent}12` : "#0E0E1A",
                  border: `1px solid ${selectedSource === src.id ? src.accent + "35" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background:
                      selectedSource === src.id
                        ? `${src.accent}20`
                        : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedSource === src.id ? src.accent + "30" : "rgba(255,255,255,0.06)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {src.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color:
                        selectedSource === src.id ? "white" : "rgba(255,255,255,0.5)",
                      fontFamily: "Syne, sans-serif",
                      marginBottom: 2,
                      transition: "color 0.2s",
                    }}
                  >
                    {src.label}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color:
                        selectedSource === src.id ? "#64748B" : "#1E293B",
                      fontFamily: "Syne, sans-serif",
                      transition: "color 0.2s",
                    }}
                  >
                    {src.desc}
                  </p>
                </div>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `2px solid ${selectedSource === src.id ? src.accent : "rgba(255,255,255,0.08)"}`,
                    background:
                      selectedSource === src.id ? src.accent : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {selectedSource === src.id && (
                    <span style={{ fontSize: 9, color: "white" }}>✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRUST MICRO-COPY */}
        <div
          className="fade-up-4"
          style={{
            padding: "16px 20px 0",
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: mounted ? 1 : 0,
          }}
        >
          {["End-to-end encrypted", "Never sold", "HIPAA-aligned"].map(
            (text) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  flex: 1,
                }}
              >
                <span style={{ fontSize: 9, opacity: 0.4 }}>🔐</span>
                <span
                  style={{
                    fontSize: 9,
                    color: "#1E293B",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    lineHeight: 1.3,
                  }}
                >
                  {text}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* PINNED BOTTOM CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 390,
          padding: "12px 20px 32px",
          background:
            "linear-gradient(to top, #07070E 60%, rgba(7,7,14,0) 100%)",
          zIndex: 40,
        }}
      >
        <button
          type="button"
          disabled={!selectedSource}
          onClick={() => {
            if (selectedSource) router.push(SOURCE_ROUTES[selectedSource]);
          }}
          style={{
            width: "100%",
            padding: "16px 24px",
            background: selectedSource
              ? "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(139,92,246,0.3) 100%)",
            border: "none",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
            color: selectedSource ? "white" : "rgba(255,255,255,0.25)",
            cursor: selectedSource ? "pointer" : "default",
            fontFamily: "Syne, sans-serif",
            letterSpacing: "0.01em",
            transition: "all 0.3s ease",
            boxShadow: selectedSource
              ? "0 0 40px rgba(139,92,246,0.25), 0 4px 20px rgba(59,130,246,0.2)"
              : "none",
          }}
        >
          {selectedSource
            ? `Connect ${DATA_SOURCES.find((s) => s.id === selectedSource)?.label} →`
            : "Select a data source above"}
        </button>
      </div>
    </div>
  );
}
