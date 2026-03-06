/// components/upload/AppleHealthHelpModal.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };

// All keyframes injected once — only when animations are enabled
const ANIMATION_CSS = `
  @keyframes tap-finger {
    0%   { transform: scale(1) translate(0,0); }
    40%  { transform: scale(0.85) translate(2px,2px); }
    55%  { transform: scale(1) translate(0,0); }
    100% { transform: scale(1) translate(0,0); }
  }
  @keyframes ping-ripple {
    0%        { transform: scale(1); opacity: 0.5; }
    75%, 100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes bounce-down {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%      { transform: translateX(-50%) translateY(4px); }
  }
  @keyframes pop-in {
    0%   { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes float-up {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-8px); }
  }
`;

// ─── Reduced Motion Hook ──────────────────────────────────────────────────────
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

// ─── Slide 1: Open the Health App ────────────────────────────────────────────
function Slide1Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <div style={{ position: "relative", width: 80, height: 130, margin: "0 auto" }}>
      {/* Phone frame */}
      <div style={{
        width: "100%", height: "100%", borderRadius: 14,
        border: "2px solid #3F3F46", background: "#18181B",
        overflow: "hidden", position: "relative",
      }}>
        {/* Status bar */}
        <div style={{ height: 14, background: "#27272A", width: "100%" }} />
        {/* App grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: "4px 6px" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              width: 13, height: 13, borderRadius: 3,
              background: i === 0 ? "#F87171" : "#3F3F46",
            }} />
          ))}
        </div>
        {/* Profile picture + ripple */}
        <div style={{ position: "absolute", top: 14, right: 6 }}>
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "linear-gradient(135deg,#8B5CF6,#2DD4BF)",
            position: "relative",
          }}>
            {active && !reduced && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "#2DD4BF",
                animation: "ping-ripple 1.8s ease-out infinite",
              }} />
            )}
          </div>
        </div>
      </div>
      {/* Finger emoji */}
      {active && !reduced && (
        <div style={{
          position: "absolute", right: -8, top: 16, fontSize: 16, lineHeight: 1,
          animation: "tap-finger 1.8s ease-in-out infinite",
        }}>
          👆
        </div>
      )}
    </div>
  );
}

// ─── Slide 2: Access Data Export ─────────────────────────────────────────────
const MENU_ITEMS = ["Medical ID", "Health Checklist", "Privacy", "Devices", "Apps", "Export All Health Data"];

function Slide2Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!active) { setScrolled(false); return; }
    if (reduced) { setScrolled(true); return; } // static: show the export option
    const cycle = () => {
      setScrolled(false);
      setTimeout(() => setScrolled(true), 400);
    };
    cycle();
    const id = setInterval(cycle, 3000);
    return () => clearInterval(id);
  }, [active, reduced]);

  return (
    <div style={{
      position: "relative", width: 130, height: 130, margin: "0 auto",
      borderRadius: 14, border: "2px solid #3F3F46", background: "#18181B", overflow: "hidden",
    }}>
      {/* Scrolling list */}
      <div style={{
        position: "absolute", width: "100%",
        transition: reduced ? "none" : "transform 1000ms ease-in-out",
        transform: scrolled ? "translateY(-46px)" : "translateY(0)",
      }}>
        {MENU_ITEMS.map((item) => {
          const isTarget = item === "Export All Health Data";
          return (
            <div key={item} style={{
              padding: "7px 8px", fontSize: 8, borderBottom: "1px solid #27272A",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              color: isTarget ? "#2DD4BF" : "#71717A",
              background: isTarget ? "rgba(20,184,166,0.08)" : "transparent",
              fontFamily: "var(--font-ui,'Inter',sans-serif)",
            }}>
              {item}
              {isTarget && <span style={{ color: "#2DD4BF" }}>›</span>}
            </div>
          );
        })}
      </div>
      {/* Bounce arrow */}
      {active && !reduced && (
        <div style={{
          position: "absolute", bottom: 6, left: "50%", color: "#52525B", fontSize: 11,
          animation: "bounce-down 1s ease-in-out infinite",
        }}>
          ↓
        </div>
      )}
    </div>
  );
}

// ─── Slide 3: Generate Export File ───────────────────────────────────────────
function Slide3Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [phase, setPhase] = useState<"progress" | "done">("done");
  const [progress, setProgress] = useState(0);
  const fillRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || reduced) {
      setPhase("done");
      if (fillRef.current) clearInterval(fillRef.current);
      if (cycleRef.current) clearInterval(cycleRef.current);
      return;
    }
    function runCycle() {
      setPhase("progress");
      setProgress(0);
      let p = 0;
      if (fillRef.current) clearInterval(fillRef.current);
      fillRef.current = setInterval(() => {
        p += 4;
        setProgress(Math.min(p, 100));
        if (p >= 100) {
          if (fillRef.current) { clearInterval(fillRef.current); fillRef.current = null; }
          setTimeout(() => setPhase("done"), 300);
        }
      }, 80);
    }
    runCycle();
    cycleRef.current = setInterval(runCycle, 4200);
    return () => {
      if (fillRef.current) clearInterval(fillRef.current);
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [active, reduced]);

  const ZipFile = ({ animated }: { animated: boolean }) => (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      animation: animated ? "pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
    }}>
      <div style={{
        width: 48, height: 58, borderRadius: 10, background: GRAD,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
      }}>
        <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>ZIP</span>
        <div style={{ width: 28, borderTop: "1px solid rgba(255,255,255,0.3)", margin: "4px 0" }} />
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontFamily: "monospace" }}>export</span>
      </div>
      <span style={{ color: "#2DD4BF", fontSize: 10, marginTop: 6, fontFamily: "monospace" }}>export.zip ✓</span>
    </div>
  );

  if (phase === "done") return <ZipFile animated={active && !reduced} />;

  return (
    <div style={{ width: 150, margin: "0 auto" }}>
      <div style={{ background: "#27272A", borderRadius: 12, padding: 14, textAlign: "center" }}>
        <p style={{ fontSize: 10, color: "#71717A", marginBottom: 10, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Preparing export…
        </p>
        <div style={{ width: "100%", background: "#3F3F46", borderRadius: 100, height: 6 }}>
          <div style={{
            height: 6, borderRadius: 100, background: GRAD,
            transition: "width 100ms linear", width: `${progress}%`,
          }} />
        </div>
        <p style={{ fontSize: 10, color: "#52525B", marginTop: 6, fontFamily: "monospace" }}>{progress}%</p>
      </div>
    </div>
  );
}

// ─── Slide 4: Choose Destination ─────────────────────────────────────────────
const DESTINATIONS = [
  { label: "AirDrop", icon: "📡", angle: -110, recommended: false },
  { label: "Email",   icon: "✉️",  angle: -40,  recommended: false },
  { label: "Files",   icon: "📁",  angle: 40,   recommended: true  },
  { label: "Cloud",   icon: "☁️",  angle: 110,  recommended: false },
];

function Slide4Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [activeIdx, setActiveIdx] = useState(2); // start on "Files"

  useEffect(() => {
    if (!active || reduced) { setActiveIdx(2); return; }
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % DESTINATIONS.length), 900);
    return () => clearInterval(id);
  }, [active, reduced]);

  return (
    <div style={{
      position: "relative", width: 190, height: 110, margin: "0 auto",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Central ZIP icon */}
      <div style={{
        width: 34, height: 42, borderRadius: 8, background: GRAD, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
        boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
      }}>
        <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, fontFamily: "monospace" }}>ZIP</span>
      </div>
      {/* Destination nodes */}
      {DESTINATIONS.map((dest, i) => {
        const isActive = reduced ? dest.recommended : i === activeIdx;
        const rad = (dest.angle * Math.PI) / 180;
        const x = Math.cos(rad) * 74;
        const y = Math.sin(rad) * 38;
        return (
          <div key={dest.label} style={{
            position: "absolute",
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: `translate(-50%, -50%) scale(${isActive ? 1.1 : 0.9})`,
            display: "flex", flexDirection: "column", alignItems: "center",
            transition: "all 300ms",
            opacity: isActive ? 1 : 0.35,
          }}>
            <span style={{ fontSize: 14 }}>{dest.icon}</span>
            <span style={{
              fontSize: 8, marginTop: 2,
              fontFamily: "var(--font-ui,'Inter',sans-serif)",
              color: dest.recommended ? "#2DD4BF" : "#71717A",
            }}>
              {dest.label}{dest.recommended ? " ✓" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Slide 5: Ready to Upload ─────────────────────────────────────────────────
function Slide5Animation({ active, reduced }: { active: boolean; reduced: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%", background: GRAD,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 24px rgba(99,102,241,0.35)", marginBottom: 6,
        animation: active && !reduced ? "float-up 2s ease-in-out infinite" : "none",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#2DD4BF" }}>export.zip</span>
    </div>
  );
}

// ─── Animation Dispatcher ─────────────────────────────────────────────────────
function SlideAnimation({ slideId, active, reduced }: { slideId: string; active: boolean; reduced: boolean }) {
  switch (slideId) {
    case "open-app":           return <Slide1Animation active={active} reduced={reduced} />;
    case "access-export":      return <Slide2Animation active={active} reduced={reduced} />;
    case "generate-file":      return <Slide3Animation active={active} reduced={reduced} />;
    case "choose-destination": return <Slide4Animation active={active} reduced={reduced} />;
    case "ready-to-upload":    return <Slide5Animation active={active} reduced={reduced} />;
    default:                   return null;
  }
}

// ─── Slide Data ───────────────────────────────────────────────────────────────
type Slide = {
  id: string;
  title: string;
  instructions: string[] | null;
  info: string | null;
  recommendation: string | null;
  isFinal?: boolean;
  checklist?: string[];
  ctaLabel?: string;
};

const HELP_SLIDES: Slide[] = [
  {
    id: "open-app",
    title: "Open the Health App",
    instructions: [
      "On your iPhone, open the Health app.",
      "Tap your profile picture in the top right corner.",
    ],
    info: null,
    recommendation: null,
  },
  {
    id: "access-export",
    title: "Access Data Export",
    instructions: [
      'Scroll down to the bottom and tap "Export All Health Data".',
    ],
    info: "Apple may warn the export can take a few minutes — this is normal. It includes your full health database.",
    recommendation: null,
  },
  {
    id: "generate-file",
    title: "Generate the Export File",
    instructions: [
      "Tap Export.",
      "Your iPhone will prepare the file.",
      'When ready, iOS creates a ZIP file named "export.zip".',
    ],
    info: null,
    recommendation: null,
  },
  {
    id: "choose-destination",
    title: "Choose Where to Send It",
    instructions: [
      "After the file is generated you can send it via: AirDrop, Email, Save to Files, or upload to cloud storage.",
    ],
    info: null,
    recommendation: "For most users, saving to Files first is the easiest path to upload.",
  },
  {
    id: "ready-to-upload",
    title: "Ready to upload?",
    instructions: null,
    info: null,
    recommendation: null,
    isFinal: true,
    checklist: [
      "I exported All Health Data",
      "I have export.zip",
      "I saved it to Files (recommended)",
    ],
    ctaLabel: "I'm ready — upload export.zip",
  },
];

// ─── Carousel ─────────────────────────────────────────────────────────────────
function Carousel({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState([false, false, false]);
  const touchStartX = useRef(0);
  const reduced = useReducedMotion();
  const slide = HELP_SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === HELP_SLIDES.length - 1;

  useEffect(() => {
    console.log("[analytics] apple_health_help_slide_viewed", { slideId: slide.id, slideIndex: index });
  }, [index, slide.id]);

  function goNext() { if (!isLast) setIndex((i) => i + 1); }
  function goPrev() { if (!isFirst) setIndex((i) => i - 1); }

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) goNext();
    if (delta > 50) goPrev();
  }

  function toggleCheck(i: number) {
    setChecked((prev) => { const next = [...prev]; next[i] = !next[i]; return next; });
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
                width: i === index ? 20 : 7, height: 7, borderRadius: 4,
                background: i === index ? GRAD : "rgba(255,255,255,0.15)",
                cursor: "pointer", transition: "all .25s",
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

              {/* Animation zone — fixed height to prevent layout shift */}
              <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <SlideAnimation slideId={s.id} active={i === index} reduced={reduced} />
              </div>

              {/* Text content */}
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

                {s.recommendation && (
                  <div style={{ fontSize: 13, color: "#34D399", marginBottom: 12, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.5 }}>
                    💡 {s.recommendation}
                  </div>
                )}

                {s.isFinal && s.checklist && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 6 }}>
                    {s.checklist.map((item, j) => (
                      <label key={j} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => toggleCheck(j)}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: checked[j] ? "none" : "1.5px solid rgba(255,255,255,0.25)",
                          background: checked[j] ? "#10B981" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s",
                        }}>
                          {checked[j] && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14, color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: back / next / CTA */}
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
            color: isFirst ? "rgba(255,255,255,0.2)" : T.text, cursor: isFirst ? "default" : "pointer",
            padding: "8px 16px", fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)",
            transition: "all .15s",
          }}
        >
          ← Back
        </button>

        {isLast ? (
          <button
            onClick={onComplete}
            style={{
              background: GRAD, border: "none", borderRadius: 8, color: "#fff",
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
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
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

// ─── Modal ────���───────────────────────────────────────────────────────────────
export default function AppleHealthHelpModal({
  open,
  onClose,
  onRequestUpload,
}: {
  open: boolean;
  onClose: () => void;
  onRequestUpload: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    console.log("[analytics] apple_health_help_modal_opened");
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  function handleComplete() {
    console.log("[analytics] apple_health_help_cta_clicked");
    onClose();
    setTimeout(onRequestUpload, 80);
  }

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      {/* Modal panel */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 480,
        background: "#111827", borderRadius: 16, overflow: "hidden",
        border: "1px solid rgba(99,102,241,0.2)",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
      }}>
        <Carousel onComplete={handleComplete} onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}
