/// components/upload/SamsungHealthHelpModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const SAMSUNG_BLUE = "#1428A0";
const SAMSUNG_LIGHT = "#6B8FFF";
const T = { text: "#F1F5F9", muted: "#64748B" };

const ANIMATION_CSS = `
  @keyframes sh-pulse {
    0%, 100% { transform: scale(1); opacity: 0.4; }
    50%       { transform: scale(1.6); opacity: 0; }
  }
  @keyframes sh-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(4px); }
  }
  @keyframes sh-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  @keyframes sh-float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes sh-pop-in {
    0%   { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes sh-upload-dot {
    0%, 100% { opacity: 0.2; transform: translateY(3px); }
    50%       { opacity: 1;   transform: translateY(-2px); }
  }
`;

// ─── Reduced Motion Hook ───────────────────────────────────────────────────────
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ─── Slide 1: Open Samsung Health ─────────────────────────────────────────────
function Slide1Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <div style={{ position: "relative", width: 80, height: 130, margin: "0 auto" }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 14,
        border: "2px solid #3F3F46", background: "#18181B",
        overflow: "hidden", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Status bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: "#27272A" }} />
        {/* App icon centered */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {active && !reduced && (
            <div style={{
              position: "absolute", width: 44, height: 44, borderRadius: "50%",
              background: SAMSUNG_BLUE,
              animation: "sh-pulse 1.8s ease-out infinite",
            }} />
          )}
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: SAMSUNG_BLUE,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", zIndex: 1,
          }}>
            {/* Heart symbol */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>
        {/* Home indicator */}
        <div style={{
          position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
          width: 28, height: 3, background: "#3F3F46", borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

// ─── Slide 2: Go to Settings ──────────────────────────────────────────────────
const MENU_ROWS = ["Home", "Fitness", "Food", "Settings"];

function Slide2Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!active) { setMenuOpen(false); return; }
    if (reduced)  { setMenuOpen(true);  return; }
    const cycle = () => {
      setMenuOpen(false);
      setTimeout(() => setMenuOpen(true), 600);
    };
    cycle();
    const id = setInterval(cycle, 3200);
    return () => clearInterval(id);
  }, [active, reduced]);

  return (
    <div style={{
      position: "relative", width: 150, height: 130, margin: "0 auto",
      borderRadius: 14, border: "2px solid #3F3F46", background: "#18181B", overflow: "hidden",
    }}>
      {/* App header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 10px", borderBottom: "1px solid #27272A",
      }}>
        <span style={{ fontSize: 9, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Samsung Health</span>
        {/* Hamburger — pulses when active */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 2, padding: "3px 4px",
          borderRadius: 4,
          background: menuOpen ? `${SAMSUNG_BLUE}33` : "transparent",
          border: menuOpen ? `1px solid ${SAMSUNG_BLUE}66` : "1px solid transparent",
          transition: "all 300ms",
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 12, height: 1.5,
              background: menuOpen ? SAMSUNG_LIGHT : "#71717A",
              borderRadius: 1, transition: "background 300ms",
            }} />
          ))}
        </div>
      </div>
      {/* Menu items */}
      {MENU_ROWS.map((item) => {
        const isTarget = item === "Settings";
        return (
          <div key={item} style={{
            padding: "7px 10px", fontSize: 8,
            display: "flex", alignItems: "center", gap: 5,
            color: isTarget && menuOpen ? SAMSUNG_LIGHT : "#71717A",
            background: isTarget && menuOpen ? `${SAMSUNG_BLUE}22` : "transparent",
            borderLeft: isTarget && menuOpen ? `2px solid ${SAMSUNG_BLUE}` : "2px solid transparent",
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            transition: "all 300ms",
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: isTarget && menuOpen ? SAMSUNG_BLUE : "#3F3F46",
              transition: "background 300ms",
            }} />
            {item}
          </div>
        );
      })}
    </div>
  );
}

// ─── Slide 3: Export Your Data ────────────────────────────────────────────────
const SETTINGS_ROWS = ["Account", "Notifications", "Units", "Download Personal Data"];

function Slide3Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <div style={{
      width: 160, margin: "0 auto",
      borderRadius: 14, border: "2px solid #3F3F46", background: "#18181B", overflow: "hidden",
    }}>
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #27272A" }}>
        <span style={{ fontSize: 8, color: "#71717A", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Settings</span>
      </div>
      {SETTINGS_ROWS.map((item) => {
        const isTarget = item === "Download Personal Data";
        return (
          <div key={item} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 10px", fontSize: 8,
            color: isTarget ? SAMSUNG_LIGHT : "#71717A",
            background: isTarget ? `${SAMSUNG_BLUE}22` : "transparent",
            border: isTarget ? `1px solid ${SAMSUNG_BLUE}44` : "1px solid transparent",
            margin: isTarget ? "2px 4px" : "0",
            borderRadius: isTarget ? 6 : 0,
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
          }}>
            <span>{item}</span>
            {isTarget && (
              <span style={{
                fontSize: 10, color: SAMSUNG_BLUE,
                animation: active && !reduced ? "sh-bounce 1s ease-in-out infinite" : "none",
                display: "inline-block",
              }}>
                ↓
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Slide 4: Save the File ───────────────────────────────────────────────────
function Slide4Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        position: "relative",
        animation: active && !reduced ? "sh-pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
      }}>
        {/* ZIP file */}
        <div style={{
          width: 52, height: 64, borderRadius: 10,
          background: "#27272A", border: "2px solid #3F3F46",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 28, height: 2, background: "#3F3F46", borderRadius: 1 }} />
          ))}
          <span style={{ fontSize: 9, color: "#71717A", fontFamily: "monospace", marginTop: 2 }}>.zip</span>
        </div>
        {/* Check badge */}
        <div style={{
          position: "absolute", bottom: -6, right: -6,
          width: 20, height: 20, borderRadius: "50%",
          background: "#10B981", border: "2px solid #18181B",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>✓</span>
        </div>
      </div>
      <span style={{ fontSize: 10, color: "#71717A", fontFamily: "monospace" }}>
        samsung_health.zip
      </span>
    </div>
  );
}

// ─── Slide 5: Upload to Blue Zone ─────────────────────────────────────────────
function Slide5Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {/* BZ logo */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: "linear-gradient(135deg,#7C3AED,#06B6D4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: active && !reduced ? "sh-float 2s ease-in-out infinite" : "none",
      }}>
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>BZ</span>
      </div>

      {/* Upload dots */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 2, height: 8,
            background: SAMSUNG_LIGHT, borderRadius: 1,
            animation: active && !reduced ? `sh-upload-dot 1.2s ease-in-out infinite` : "none",
            animationDelay: `${i * 0.18}s`,
            opacity: 1 - i * 0.25,
          }} />
        ))}
        {/* Arrow */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={SAMSUNG_LIGHT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: active && !reduced ? "sh-float 1.2s ease-in-out infinite" : "none" }}
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>

      {/* Phone */}
      <div style={{
        width: 36, height: 54, borderRadius: 10,
        border: "2px solid #3F3F46", background: "#18181B",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 14 }}>⌚</span>
      </div>

      <style>{`
        @keyframes sh-upload-dot {
          0%, 100% { opacity: 0.2; transform: translateY(3px); }
          50%       { opacity: 1;   transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

// ─── Animation Dispatcher ─────────────────────────────────────────────────────
function SlideAnimation({ slideId, active, reduced }: { slideId: string; active: boolean; reduced: boolean }) {
  switch (slideId) {
    case "open-app":     return <Slide1Animation active={active} reduced={reduced} />;
    case "settings":     return <Slide2Animation active={active} reduced={reduced} />;
    case "export":       return <Slide3Animation active={active} reduced={reduced} />;
    case "save":         return <Slide4Animation active={active} reduced={reduced} />;
    case "upload":       return <Slide5Animation active={active} reduced={reduced} />;
    default:             return null;
  }
}

// ─── Slide Data ───────────────────────────────────────────────────────────────
type Slide = {
  id: string;
  title: string;
  instructions: string[] | null;
  info: string | null;
  tip: string | null;
  isFinal?: boolean;
  ctaLabel?: string;
};

const HELP_SLIDES: Slide[] = [
  {
    id: "open-app",
    title: "Open Samsung Health",
    instructions: [
      "Open the Samsung Health app on your Galaxy phone or tablet.",
    ],
    info: null,
    tip: null,
  },
  {
    id: "settings",
    title: "Go to Settings",
    instructions: [
      "Tap the three-line menu (☰) in the top-right corner.",
      'Select "Settings" from the menu.',
    ],
    info: null,
    tip: "On newer Galaxy UI, Settings may be inside your profile page.",
  },
  {
    id: "export",
    title: "Export Your Data",
    instructions: [
      'Scroll down to "Personal Data Management".',
      'Tap "Download Personal Data".',
      "Select data types: Heart Rate, Sleep, Steps, and SpO₂.",
      "Confirm the export.",
    ],
    info: null,
    tip: "Select all four data types for the most personalised protocol.",
  },
  {
    id: "save",
    title: "Save the ZIP File",
    instructions: [
      "Samsung Health will prepare a ZIP archive.",
      "Save it to your device storage, Google Drive, or email it to yourself.",
    ],
    info: "The ZIP contains individual CSV files — you can upload the ZIP directly without unzipping.",
    tip: null,
  },
  {
    id: "upload",
    title: "Upload to Blue Zone",
    instructions: null,
    info: null,
    tip: null,
    isFinal: true,
    ctaLabel: "Upload Samsung Health ZIP",
  },
];

// ─── Carousel ─────────────────────────────────────────────────────────────────
function Carousel({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(0);
  const reduced = useReducedMotion();
  const slide = HELP_SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === HELP_SLIDES.length - 1;

  function goNext() { if (!isLast)  setIndex((i) => i + 1); }
  function goPrev() { if (!isFirst) setIndex((i) => i - 1); }

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) goNext();
    if (delta > 50)  goPrev();
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: 520 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!reduced && <style>{ANIMATION_CSS}</style>}

      {/* Header: dots + close */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {HELP_SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 20 : 7, height: 7, borderRadius: 4, cursor: "pointer",
                background: i === index ? SAMSUNG_BLUE : "rgba(255,255,255,0.15)",
                transition: "all .25s",
              }}
            />
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Slide track */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{
          display: "flex",
          transform: `translateX(-${index * 100}%)`,
          transition: "transform 300ms ease-in-out",
          willChange: "transform",
        }}>
          {HELP_SLIDES.map((s, i) => (
            <div key={s.id} style={{ minWidth: "100%", padding: "14px 24px 0", boxSizing: "border-box" }}>
              {/* Illustration */}
              <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <SlideAnimation slideId={s.id} active={i === index} reduced={reduced} />
              </div>

              {/* Text */}
              <div style={{ overflow: "auto", maxHeight: 200 }}>
                <h3 style={{
                  fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 20,
                  color: T.text, marginBottom: 14, letterSpacing: "-.02em",
                }}>
                  {s.title}
                </h3>

                {s.instructions && (
                  <ol style={{ paddingLeft: 20, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {s.instructions.map((inst, j) => (
                      <li key={j} style={{ fontSize: 14, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.65 }}>
                        {inst}
                      </li>
                    ))}
                  </ol>
                )}

                {s.info && (
                  <div style={{
                    borderLeft: "2px solid rgba(100,116,139,0.4)", paddingLeft: 12,
                    fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12,
                    fontFamily: "var(--font-ui,'Inter',sans-serif)",
                  }}>
                    {s.info}
                  </div>
                )}

                {s.tip && (
                  <div style={{ fontSize: 13, color: "#34D399", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.5 }}>
                    💡 {s.tip}
                  </div>
                )}

                {s.isFinal && (
                  <p style={{ fontSize: 14, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.6 }}>
                    Tap the button below to select your exported file. We accept the ZIP archive or individual CSV files.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px calc(16px + env(safe-area-inset-bottom, 0px))",
        borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 16,
      }}>
        <button
          onClick={goPrev}
          disabled={isFirst}
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
            color: isFirst ? "rgba(255,255,255,0.2)" : T.text,
            cursor: isFirst ? "default" : "pointer",
            padding: "8px 16px", fontSize: 13,
            fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .15s",
          }}
        >
          ← Back
        </button>

        {isLast ? (
          <button
            onClick={onComplete}
            style={{
              background: SAMSUNG_BLUE, border: "none", borderRadius: 8, color: "#fff",
              cursor: "pointer", padding: "9px 20px", fontSize: 13,
              fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500,
            }}
          >
            {slide.ctaLabel}
          </button>
        ) : (
          <button
            onClick={goNext}
            style={{
              background: `${SAMSUNG_BLUE}26`, border: `1px solid ${SAMSUNG_BLUE}4D`,
              borderRadius: 8, color: T.text, cursor: "pointer", padding: "8px 16px",
              fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .15s",
            }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function SamsungHealthHelpModal({
  open,
  onClose,
  onRequestUpload,
}: {
  open:            boolean;
  onClose:         () => void;
  onRequestUpload: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  function handleComplete() {
    onClose();
    setTimeout(onRequestUpload, 80);
  }

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      {/* Panel */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 480,
        background: "#111827", borderRadius: 16, overflow: "hidden",
        border: `1px solid ${SAMSUNG_BLUE}33`,
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
      }}>
        <Carousel onComplete={handleComplete} onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}
