"use client";

import { useState } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Priority = "Essential" | "Important" | "Calculated";

interface Marker {
  name: string;
  priority: Priority;
  consequence: string;
}

interface MarkerGroup {
  id: string;
  icon: string;
  label: string;
  accentColor: string;
  impact: string;
  impactShort: string;
  count: number;
  markers: Marker[];
}

interface UploadedMarker {
  name: string;
  category: string;
}

// ─── DATA ────────────────────────────────────────────────────────────────────

const UPLOADED_MARKERS: UploadedMarker[] = [
  { name: "Total Cholesterol", category: "Lipids" },
  { name: "HDL Cholesterol", category: "Lipids" },
  { name: "LDL Cholesterol", category: "Lipids" },
  { name: "Triglycerides", category: "Lipids" },
  { name: "CBC Panel", category: "Blood Count" },
  { name: "Vitamin D", category: "Micronutrients" },
];

const MISSING_GROUPS: MarkerGroup[] = [
  {
    id: "metabolic",
    icon: "⚡",
    label: "Metabolic Health",
    accentColor: "#F59E0B",
    impact: "Biological age score accuracy drops ~34% without these",
    impactShort: "Bio age −34% accuracy",
    count: 4,
    markers: [
      {
        name: "Fasting Glucose",
        priority: "Essential",
        consequence:
          "Cannot calibrate insulin response or metabolic age without baseline glucose.",
      },
      {
        name: "Fasting Insulin",
        priority: "Essential",
        consequence:
          "Reveals insulin resistance years before glucose becomes abnormal. Protocol blind spot without it.",
      },
      {
        name: "HbA1c",
        priority: "Essential",
        consequence:
          "90-day glucose average — the difference between point-in-time and longitudinal metabolic health.",
      },
      {
        name: "HOMA-IR",
        priority: "Calculated",
        consequence: "Derived from glucose + insulin. Unlocks once both are present.",
      },
    ],
  },
  {
    id: "hormonal",
    icon: "◎",
    label: "Hormonal Panel",
    accentColor: "#8B5CF6",
    impact: "Recovery protocol cannot personalise without hormonal baseline",
    impactShort: "Recovery protocol incomplete",
    count: 3,
    markers: [
      {
        name: "Testosterone (Total)",
        priority: "Essential",
        consequence:
          "Core recovery and adaptation signal. Without it your training load recommendations are generic.",
      },
      {
        name: "Free Testosterone",
        priority: "Essential",
        consequence:
          "Active fraction — total testosterone alone misses bioavailability.",
      },
      {
        name: "Cortisol (AM)",
        priority: "Essential",
        consequence:
          "HPA axis baseline. Critical for interpreting HRV and sleep quality signals.",
      },
    ],
  },
  {
    id: "inflammation",
    icon: "🔥",
    label: "Inflammation Markers",
    accentColor: "#EF4444",
    impact: "Longevity risk score incomplete — inflammation is the primary driver",
    impactShort: "Longevity score incomplete",
    count: 2,
    markers: [
      {
        name: "hs-CRP",
        priority: "Essential",
        consequence:
          "High-sensitivity CRP is the single most predictive longevity biomarker. Non-negotiable.",
      },
      {
        name: "Homocysteine",
        priority: "Important",
        consequence:
          "Cardiovascular and cognitive risk marker. Especially relevant for endurance athletes.",
      },
    ],
  },
];

const PRIORITY_STYLES: Record<Priority, { bg: string; color: string; border: string }> = {
  Essential:  { bg: "rgba(245,158,11,0.1)",  color: "#F59E0B", border: "rgba(245,158,11,0.2)" },
  Important:  { bg: "rgba(59,130,246,0.1)",  color: "#3B82F6", border: "rgba(59,130,246,0.2)" },
  Calculated: { bg: "rgba(16,185,129,0.1)",  color: "#10B981", border: "rgba(16,185,129,0.2)" },
};

const totalMissing   = MISSING_GROUPS.reduce((sum, g) => sum + g.count, 0);
const totalUploaded  = UPLOADED_MARKERS.length;
const totalPossible  = totalUploaded + totalMissing;
const completeness   = Math.round((totalUploaded / totalPossible) * 100);

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

interface MarkerRowProps {
  marker: Marker;
  accent: string;
}

function MarkerRow({ marker, accent }: MarkerRowProps) {
  const [open, setOpen] = useState(false);
  const p = PRIORITY_STYLES[marker.priority];

  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "12px 18px",
        cursor: "pointer",
        transition: "background 0.15s",
        background: open ? "rgba(255,255,255,0.02)" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Missing dot — animated */}
        <div style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: accent, opacity: 0.3,
            animation: "missingPulse 2s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: 2, borderRadius: "50%",
            background: accent, opacity: 0.6,
          }} />
        </div>

        <span style={{
          fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700,
          color: "rgba(255,255,255,0.7)", flex: 1,
        }}>
          {marker.name}
        </span>

        <span style={{
          fontSize: 9, fontWeight: 700, fontFamily: "Syne, sans-serif",
          padding: "2px 8px", borderRadius: 99,
          background: p.bg, color: p.color,
          border: `1px solid ${p.border}`,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {marker.priority}
        </span>

        <span style={{
          fontSize: 10, color: open ? "#64748B" : "#334155",
          transition: "transform 0.2s", display: "inline-block",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          marginLeft: 4,
        }}>▾</span>
      </div>

      {open && (
        <p style={{
          fontFamily: "Syne, sans-serif", fontSize: 12,
          color: "#475569", lineHeight: 1.6,
          marginTop: 10, paddingLeft: 20,
          animation: "slideDown 0.2s ease",
        }}>
          {marker.consequence}
        </p>
      )}
    </div>
  );
}

interface GroupCardProps {
  group: MarkerGroup;
  defaultOpen?: boolean;
}

function GroupCard({ group, defaultOpen = false }: GroupCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      background: "#0E0E1A",
      border: `1px solid ${open ? group.accentColor + "25" : "rgba(255,255,255,0.05)"}`,
      borderRadius: 16, overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Group header */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 18px", cursor: "pointer",
          background: open ? `${group.accentColor}06` : "transparent",
          transition: "background 0.2s",
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${group.accentColor}12`,
          border: `1px solid ${group.accentColor}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>
          {group.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{
              fontFamily: "Syne, sans-serif", fontSize: 14,
              fontWeight: 700, color: "white",
            }}>
              {group.label}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 600,
              color: group.accentColor,
              background: `${group.accentColor}12`,
              border: `1px solid ${group.accentColor}20`,
              padding: "2px 8px", borderRadius: 99,
            }}>
              {group.count} missing
            </span>
          </div>
          <p style={{
            fontFamily: "Syne, sans-serif", fontSize: 11,
            color: "#EF4444", lineHeight: 1.4,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ opacity: 0.7 }}>⚠</span> {group.impact}
          </p>
        </div>

        <span style={{
          fontSize: 12, color: "#334155",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}>▾</span>
      </div>

      {/* Markers */}
      {open && (
        <div style={{ animation: "slideDown 0.2s ease" }}>
          {group.markers.map((m) => (
            <MarkerRow key={m.name} marker={m} accent={group.accentColor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface MissingBiomarkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  /** Called when the user taps "Download Recommended Blood Panel".
   *  Pass the actual PDF generation function from the parent. */
  onDownload: () => void;
}

export function MissingBiomarkersModal({
  isOpen,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose,
  onContinue,
  onDownload,
}: MissingBiomarkersModalProps) {
  const [view, setView] = useState<"missing" | "uploaded">("missing");

  if (!isOpen) return null;

  return (
    <div style={{
      background: "#07070E", minHeight: "100vh",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "0 0 40px",
      fontFamily: "Syne, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes missingPulse {
          0%,100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes progressFill {
          from { width: 0; }
        }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 600,
        animation: "fadeUp 0.4s ease both",
      }}>
        {/* ── COMPLETENESS HEADER ── */}
        <div style={{
          background: "#0E0E1A",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "28px 28px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
                color: "#EF4444", textTransform: "uppercase", marginBottom: 6,
              }}>
                ⚠ Incomplete Blood Panel
              </p>
              <h2 style={{
                fontFamily: "Syne, sans-serif", fontSize: 22,
                fontWeight: 800, color: "white", lineHeight: 1.2,
              }}>
                {totalMissing} biomarkers missing
              </h2>
              <p style={{
                fontSize: 12, color: "#475569", marginTop: 5, lineHeight: 1.5,
              }}>
                Your protocol will be generated with reduced accuracy<br />
                until these are added.
              </p>
            </div>

            {/* Donut score */}
            <div style={{ textAlign: "center", flexShrink: 0, marginLeft: 16 }}>
              <div style={{ position: "relative", width: 72, height: 72 }}>
                <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle
                    cx="36" cy="36" r="28" fill="none"
                    stroke="url(#scoreGrad)" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - completeness / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 16, fontWeight: 600, color: "white",
                    lineHeight: 1,
                  }}>{completeness}%</span>
                </div>
              </div>
              <p style={{ fontSize: 9, color: "#334155", marginTop: 5, fontWeight: 600, letterSpacing: "0.08em" }}>
                COMPLETE
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{
              height: 6, borderRadius: 99,
              background: "rgba(255,255,255,0.05)",
              overflow: "hidden", marginBottom: 8,
            }}>
              <div style={{
                height: "100%",
                width: `${completeness}%`,
                background: "linear-gradient(90deg, #F59E0B, #EF4444)",
                borderRadius: 99,
                animation: "progressFill 1s ease both",
                boxShadow: "0 0 8px rgba(245,158,11,0.4)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: "#10B981",
              }}>
                ✓ {totalUploaded} uploaded
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: "#EF4444",
              }}>
                ✕ {totalMissing} missing
              </span>
            </div>
          </div>

          {/* Tab toggle */}
          <div style={{
            display: "flex", gap: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10, padding: 4, marginTop: 20,
          }}>
            {([
              { key: "missing",  label: `${totalMissing} Missing`,  color: "#EF4444" },
              { key: "uploaded", label: `${totalUploaded} Uploaded`, color: "#10B981" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                style={{
                  flex: 1, padding: "8px 12px",
                  borderRadius: 7, border: "none",
                  fontFamily: "Syne, sans-serif",
                  fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: view === tab.key ? "#161624" : "transparent",
                  color: view === tab.key ? tab.color : "#334155",
                  boxShadow: view === tab.key ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        <div style={{ padding: "20px 28px" }}>
          {view === "missing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MISSING_GROUPS.map((group, i) => (
                <div key={group.id} style={{
                  animation: `fadeUp 0.4s ease both`,
                  animationDelay: `${i * 0.07}s`,
                }}>
                  <GroupCard group={group} defaultOpen={i === 0} />
                </div>
              ))}
            </div>
          )}

          {view === "uploaded" && (
            <div style={{
              background: "#0E0E1A",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 16, overflow: "hidden",
              animation: "fadeUp 0.3s ease both",
            }}>
              <div style={{
                padding: "14px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
                  color: "#10B981", textTransform: "uppercase",
                }}>
                  ✓ Successfully parsed
                </p>
              </div>
              {UPLOADED_MARKERS.map((m, i) => (
                <div key={m.name} style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: i < UPLOADED_MARKERS.length - 1
                    ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#10B981", flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: "Syne, sans-serif",
                      fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)",
                    }}>
                      {m.name}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, color: "#334155",
                  }}>
                    {m.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CTAs — Download is always primary, Continue always ghost ── */}
        <div style={{ padding: "0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* PRIMARY: Download blood panel */}
          <button
            type="button"
            onClick={onDownload}
            style={{
              width: "100%", padding: "16px",
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 700,
              fontFamily: "Syne, sans-serif",
              color: "white", cursor: "pointer",
              boxShadow: "0 0 32px rgba(139,92,246,0.2), 0 4px 16px rgba(59,130,246,0.15)",
              letterSpacing: "0.01em",
            }}
          >
            ↓ Download Recommended Blood Panel
          </button>

          {/* SECONDARY: Continue with partial data — framed as compromise */}
          <button
            type="button"
            onClick={onContinue}
            style={{
              width: "100%", padding: "14px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              fontSize: 13, fontWeight: 600,
              fontFamily: "Syne, sans-serif",
              color: "#475569", cursor: "pointer",
            }}
          >
            Continue with {completeness}% complete data →
          </button>

          {/* Trust micro-copy */}
          <p style={{
            textAlign: "center", fontSize: 11,
            fontFamily: "Syne, sans-serif", color: "#1E293B",
            lineHeight: 1.5, marginTop: -4,
          }}>
            Your protocol will update automatically when missing markers are added.
          </p>
        </div>
      </div>
    </div>
  );
}
