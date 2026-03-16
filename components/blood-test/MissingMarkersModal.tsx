/// components/blood-test/MissingMarkersModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp, Download } from "lucide-react";
import type { DetectionResult } from "@/lib/blood-test/detect-missing-markers";
import { CATEGORY_META, type BiomarkerCategory } from "@/lib/blood-test/biomarker-registry";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG_CARD   = "#07070E";
const BG_INNER  = "#0E0E1A";
const BORDER    = "rgba(255,255,255,0.05)";
const BORDER_HI = "rgba(255,255,255,0.1)";
const TEXT      = "#FFFFFF";
const MUTED     = "#475569";
const TEXT_MUTED = "#334155";
const GRAD      = "linear-gradient(135deg,#3B82F6 0%,#8B5CF6 100%)";
const FONT_UI   = "var(--font-ui,'Syne',sans-serif)";
const FONT_MONO = "var(--font-mono,'JetBrains Mono',monospace)";

// Hex accent per category — used for the animated pulsing dot
const CATEGORY_HEX: Record<BiomarkerCategory, string> = {
  metabolic:      "#14B8A6",
  cardiovascular: "#EF4444",
  hormonal:       "#8B5CF6",
  micronutrients: "#F59E0B",
  inflammation:   "#F97316",
  thyroid:        "#3B82F6",
  kidney_liver:   "#10B981",
};

export interface MissingMarkersModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  onContinue:      () => void;
  detectionResult: DetectionResult;
}

export function MissingMarkersModal({
  isOpen,
  onClose,
  onContinue,
  detectionResult,
}: MissingMarkersModalProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(
      Object.entries(detectionResult.missingByCategory)
        .filter(([, markers]) => markers?.some((m) => m.tier === "essential"))
        .map(([cat]) => cat),
    ),
  );

  const [downloading, setDownloading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const { generateDoctorLetterPDF } = await import("@/lib/blood-test/generate-doctor-letter");
      await generateDoctorLetterPDF(detectionResult);
    } catch {
      /* no-op — PDF generation is best-effort */
    } finally {
      setDownloading(false);
    }
  }

  if (!isOpen) return null;

  const { completenessScore, missingEssential, missingRecommended, missingByCategory } = detectionResult;
  const uploadedCount     = detectionResult.detectedMarkers.length;
  const totalMissingCount = missingEssential.length + missingRecommended.length;

  // Sort categories: essential-bearing categories first
  const categoryEntries = (Object.entries(missingByCategory) as [BiomarkerCategory, typeof missingEssential][])
    .filter(([, markers]) => markers?.length)
    .sort(([, a], [, b]) => {
      const aE = a.some((m) => m.tier === "essential") ? 1 : 0;
      const bE = b.some((m) => m.tier === "essential") ? 1 : 0;
      return bE - aE;
    });

  // SVG ring — amber→red gradient
  const RADIUS = 22;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const dash   = CIRCUM * (1 - completenessScore / 100);

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9000,
        background:     "rgba(5,5,10,0.82)",
        backdropFilter: "blur(6px)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes missingPulse {
          0%,100% { transform: scale(1); opacity: 0.3; }
          50%      { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      {/* ── PANEL ── */}
      <div
        style={{
          width:         "100%",
          maxWidth:      520,
          background:    BG_CARD,
          border:        `1px solid ${BORDER_HI}`,
          borderRadius:  16,
          boxShadow:     "0 8px 48px rgba(0,0,0,0.6)",
          maxHeight:     "85vh",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          fontFamily:    FONT_UI,
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            background:     BG_INNER,
            borderBottom:   `1px solid ${BORDER}`,
            padding:        "24px 24px 20px",
            flexShrink:     0,
          }}
        >
          {/* Title row — close on left, ring on right */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
                color: "#EF4444", textTransform: "uppercase", marginBottom: 6,
                fontFamily: FONT_UI,
              }}>
                ⚠ Incomplete Blood Panel
              </p>
              <h2 style={{ color: TEXT, fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.2, fontFamily: FONT_UI }}>
                {totalMissingCount} biomarkers missing<br />
                <span style={{ fontSize: 13, fontWeight: 400, color: MUTED }}>
                  from your protocol
                </span>
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: MUTED, marginBottom: 8,
                }}
              >
                <X size={12} />
              </button>

              {/* Completeness ring */}
              <div style={{ position: "relative", width: 56, height: 56 }}>
                <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
                  <defs>
                    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                  </defs>
                  <circle cx="28" cy="28" r={RADIUS} stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="none" />
                  <circle
                    cx="28" cy="28" r={RADIUS}
                    stroke="url(#ringGrad)" strokeWidth="4" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUM}
                    strokeDashoffset={dash}
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                </svg>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: TEXT, fontWeight: 600 }}>
                    {completenessScore}%
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 8, color: TEXT_MUTED, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_UI }}>
                COMPLETE
              </p>
            </div>
          </div>

          {/* Uploaded / missing counts */}
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#10B981" }}>
              ✓ {uploadedCount} uploaded
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#EF4444" }}>
              ✕ {totalMissingCount} missing
            </span>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Category accordion */}
          {categoryEntries.map(([category, markers]) => {
            const meta      = CATEGORY_META[category];
            const isOpen    = expandedCategories.has(category);
            const essential = markers.filter((m) => m.tier === "essential");
            const accent    = CATEGORY_HEX[category];

            return (
              <div
                key={category}
                style={{
                  background:   BG_INNER,
                  border:       `1px solid ${isOpen ? BORDER_HI : BORDER}`,
                  borderRadius: 16,
                  overflow:     "visible",
                  transition:   "border-color 0.2s",
                }}
              >
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(category)}
                  style={{
                    width:      "100%",
                    display:    "flex",
                    alignItems: "center",
                    gap:        12,
                    padding:    "14px 16px",
                    textAlign:  "left",
                    background: isOpen ? `${accent}06` : "none",
                    border:     "none",
                    cursor:     "pointer",
                    color:      TEXT,
                    fontFamily: FONT_UI,
                    transition: "background 0.2s",
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{meta?.icon ?? "📊"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: FONT_UI }}>{meta?.label ?? category}</span>
                      {essential.length > 0 && (
                        <span style={{
                          fontSize: 10, color: "#F59E0B",
                          background: "rgba(245,158,11,0.12)",
                          border: "1px solid rgba(245,158,11,0.2)",
                          borderRadius: 99, padding: "2px 7px",
                          fontFamily: FONT_MONO,
                        }}>
                          {essential.length} key
                        </span>
                      )}
                    </div>
                    <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>
                      {markers.length} marker{markers.length !== 1 ? "s" : ""} · {meta?.description ?? ""}
                    </p>
                  </div>
                  {isOpen
                    ? <ChevronUp size={14} color={MUTED} style={{ flexShrink: 0 }} />
                    : <ChevronDown size={14} color={MUTED} style={{ flexShrink: 0 }} />
                  }
                </button>

                {/* Expanded marker list */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${BORDER}` }}>
                    {markers.map((marker, idx) => (
                      <div
                        key={marker.id}
                        style={{
                          display:   "flex",
                          gap:       12,
                          padding:   "12px 16px",
                          borderTop: idx > 0 ? `1px solid ${BORDER}` : undefined,
                        }}
                      >
                        {/* Animated pulsing ring dot */}
                        <div style={{ flexShrink: 0, paddingTop: 5, position: "relative", width: 10, height: 10 }}>
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

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: FONT_UI }}>
                              {marker.name}
                            </span>
                            {marker.tier === "essential" && (
                              <span style={{
                                fontSize: 9, color: "#F59E0B",
                                background: "rgba(245,158,11,0.1)",
                                border: "1px solid rgba(245,158,11,0.2)",
                                borderRadius: 99, padding: "2px 6px",
                                fontFamily: FONT_MONO,
                              }}>Essential</span>
                            )}
                          </div>
                          <p style={{ color: MUTED, fontSize: 11, lineHeight: 1.55, margin: 0 }}>
                            {marker.whyItMatters}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── FIXED FOOTER — Download is PRIMARY, Continue is ghost ── */}
        <div style={{
          padding:       "16px 24px 24px",
          borderTop:     `1px solid ${BORDER}`,
          flexShrink:    0,
          display:       "flex",
          flexDirection: "column",
          gap:           10,
        }}>
          {/* PRIMARY: Download */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            style={{
              width:          "100%",
              background:     downloading ? "rgba(59,130,246,0.4)" : GRAD,
              color:          "#fff",
              fontFamily:     FONT_UI,
              fontSize:       14,
              fontWeight:     700,
              padding:        "15px 20px",
              borderRadius:   14,
              border:         "none",
              cursor:         downloading ? "not-allowed" : "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            8,
              boxShadow:      downloading ? "none" : "0 0 32px rgba(139,92,246,0.2), 0 4px 16px rgba(59,130,246,0.15)",
              transition:     "all 0.2s",
              letterSpacing:  "0.01em",
            }}
          >
            <Download size={15} />
            {downloading ? "Generating PDF…" : "↓ Download Recommended Blood Panel"}
          </button>

          {/* SECONDARY: Continue with completeness % — ghost, framed as compromise */}
          <button
            type="button"
            onClick={onContinue}
            style={{
              width:          "100%",
              background:     "transparent",
              color:          MUTED,
              fontFamily:     FONT_UI,
              fontSize:       13,
              fontWeight:     600,
              padding:        "13px 20px",
              borderRadius:   14,
              border:         `1px solid ${BORDER_HI}`,
              cursor:         "pointer",
            }}
          >
            Continue with {completenessScore}% complete data →
          </button>

          {/* Trust micro-copy */}
          <p style={{
            textAlign:  "center",
            fontSize:   11,
            fontFamily: FONT_UI,
            color:      TEXT_MUTED,
            lineHeight: 1.5,
            margin:     "-4px 0 0",
          }}>
            Your protocol will update automatically when missing markers are added.
          </p>
        </div>
      </div>
    </div>
  );
}
