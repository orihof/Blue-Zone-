/// components/blood-test/MissingMarkersModal.tsx
"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp, Download, ArrowRight } from "lucide-react";
import type { DetectionResult } from "@/lib/blood-test/detect-missing-markers";
import { CATEGORY_META, type BiomarkerCategory } from "@/lib/blood-test/biomarker-registry";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG_CARD   = "#111118";
const BG_INNER  = "rgba(255,255,255,0.04)";
const BORDER    = "rgba(255,255,255,0.08)";
const BORDER_HI = "rgba(255,255,255,0.12)";
const TEXT      = "#F1F5F9";
const MUTED     = "#64748B";
const GRAD      = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const FONT_UI   = "var(--font-ui,'Inter',sans-serif)";
const FONT_MONO = "var(--font-mono,'JetBrains Mono',monospace)";

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
  // Categories with essential markers open by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(
      Object.entries(detectionResult.missingByCategory)
        .filter(([, markers]) => markers?.some((m) => m.tier === "essential"))
        .map(([cat]) => cat),
    ),
  );

  const [downloading, setDownloading] = useState(false);

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
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

  const { completenessScore, missingEssential, missingByCategory } = detectionResult;

  // Sort categories: those with essential markers first
  const categoryEntries = (Object.entries(missingByCategory) as [BiomarkerCategory, typeof missingEssential][])
    .filter(([, markers]) => markers?.length)
    .sort(([, a], [, b]) => {
      const aE = a.some((m) => m.tier === "essential") ? 1 : 0;
      const bE = b.some((m) => m.tier === "essential") ? 1 : 0;
      return bE - aE;
    });

  // SVG ring progress
  const RADIUS = 18;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const dash   = CIRCUM * (1 - completenessScore / 100);

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         50,
        background:     "rgba(5,5,10,0.82)",
        backdropFilter: "blur(6px)",
        display:        "flex",
        alignItems:     "flex-end",
        justifyContent: "center",
        padding:        0,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── PANEL ── */}
      <div
        style={{
          width:          "100%",
          maxWidth:       520,
          background:     BG_CARD,
          border:         `1px solid ${BORDER}`,
          borderRadius:   "24px 24px 0 0",
          boxShadow:      "0 -8px 48px rgba(0,0,0,0.6)",
          maxHeight:      "90vh",
          display:        "flex",
          flexDirection:  "column",
          overflow:       "hidden",
          fontFamily:     FONT_UI,
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            display:        "flex",
            alignItems:     "flex-start",
            justifyContent: "space-between",
            padding:        "24px 24px 18px",
            borderBottom:   `1px solid ${BORDER}`,
            flexShrink:     0,
          }}
        >
          {/* Completeness ring + title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            {/* SVG ring */}
            <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0, marginTop: 2 }}>
              <svg width="48" height="48" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="24" cy="24" r={RADIUS} stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" fill="none" />
                <circle
                  cx="24" cy="24" r={RADIUS}
                  stroke="#7C3AED" strokeWidth="3.5" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUM}
                  strokeDashoffset={dash}
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div style={{
                position:   "absolute", inset: 0,
                display:    "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: TEXT, fontWeight: 500 }}>
                  {completenessScore}%
                </span>
              </div>
            </div>

            <div>
              <h2 style={{ color: TEXT, fontSize: 15, fontWeight: 500, margin: 0, lineHeight: 1.3 }}>
                Improve Your Personalized Protocol
              </h2>
              <p style={{ color: MUTED, fontSize: 12, margin: "4px 0 0" }}>
                {missingEssential.length} key marker{missingEssential.length !== 1 ? "s" : ""} missing
              </p>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: BG_INNER, border: `1px solid ${BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: MUTED, flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Explanation card */}
          <div style={{
            background:   "rgba(124,58,237,0.08)",
            border:       "1px solid rgba(124,58,237,0.18)",
            borderRadius: 16,
            padding:      "14px 16px",
          }}>
            <p style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Your uploaded blood test is missing several biomarkers that help us generate a more precise optimization protocol.
            </p>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>
              <span style={{ color: "#2DD4BF", fontWeight: 500 }}>We can still generate your protocol</span>
              {" "}— but adding these markers to your next blood test would significantly improve the accuracy of your recommendations.
            </p>
          </div>

          {/* Section divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              Recommended additions
            </span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Category accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {categoryEntries.map(([category, markers]) => {
              const meta      = CATEGORY_META[category];
              const isOpen    = expandedCategories.has(category);
              const essential = markers.filter((m) => m.tier === "essential");

              return (
                <div
                  key={category}
                  style={{
                    background:   BG_INNER,
                    border:       `1px solid ${BORDER}`,
                    borderRadius: 16,
                    overflow:     "hidden",
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
                      background: "none",
                      border:     "none",
                      cursor:     "pointer",
                      color:      TEXT,
                      fontFamily: FONT_UI,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{meta.label}</span>
                        {essential.length > 0 && (
                          <span style={{
                            fontSize:     10, color: "#F59E0B",
                            background:   "rgba(245,158,11,0.12)",
                            border:       "1px solid rgba(245,158,11,0.2)",
                            borderRadius: 99, padding: "2px 7px",
                          }}>
                            {essential.length} key
                          </span>
                        )}
                      </div>
                      <p style={{ color: MUTED, fontSize: 11, margin: "2px 0 0" }}>
                        {markers.length} marker{markers.length !== 1 ? "s" : ""} · {meta.description}
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
                            display:    "flex",
                            gap:        12,
                            padding:    "12px 16px",
                            borderTop:  idx > 0 ? `1px solid ${BORDER}` : undefined,
                          }}
                        >
                          {/* Dot */}
                          <div style={{ flexShrink: 0, paddingTop: 6 }}>
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: marker.tier === "essential" ? "#F59E0B" : MUTED,
                            }} />
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: "#E2E8F0" }}>{marker.name}</span>
                              {marker.tier === "essential" && (
                                <span style={{ fontSize: 10, color: "rgba(245,158,11,0.7)" }}>Essential</span>
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

          {/* Doctor letter prompt */}
          <div style={{
            display:      "flex",
            alignItems:   "flex-start",
            gap:          12,
            background:   BG_INNER,
            border:       `1px solid ${BORDER_HI}`,
            borderRadius: 16,
            padding:      "14px 16px",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
            <div>
              <p style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 500, margin: 0 }}>Share with your doctor</p>
              <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.55, margin: "4px 0 0" }}>
                Download a ready-to-send PDF listing exactly which tests to request at your next appointment.
              </p>
            </div>
          </div>
        </div>

        {/* ── FIXED FOOTER ── */}
        <div style={{
          padding:    "16px 24px 24px",
          borderTop:  `1px solid ${BORDER}`,
          flexShrink: 0,
          display:    "flex",
          flexDirection: "column",
          gap:        10,
        }}>
          {/* Primary CTA */}
          <button
            onClick={onContinue}
            style={{
              width:        "100%",
              background:   GRAD,
              color:        "#fff",
              fontFamily:   FONT_UI,
              fontSize:     14,
              fontWeight:   500,
              padding:      "15px 20px",
              borderRadius: 14,
              border:       "none",
              cursor:       "pointer",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              gap:          8,
            }}
          >
            Continue With Current Results
            <ArrowRight size={15} />
          </button>

          {/* Secondary: download PDF */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              width:        "100%",
              background:   "none",
              color:        downloading ? MUTED : "#CBD5E1",
              fontFamily:   FONT_UI,
              fontSize:     13,
              fontWeight:   400,
              padding:      "13px 20px",
              borderRadius: 14,
              border:       `1px solid ${BORDER_HI}`,
              cursor:       downloading ? "not-allowed" : "pointer",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              gap:          8,
              opacity:      downloading ? 0.6 : 1,
              transition:   "opacity .2s",
            }}
          >
            <Download size={14} />
            {downloading ? "Generating PDF…" : "Download Recommended Blood Panel"}
          </button>
        </div>
      </div>
    </div>
  );
}
