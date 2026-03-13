/// components/sports/WearablesStep.tsx
"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// ─── LOGO SVGs ────────────────────────────────────────────────────────────────

function WhoopMark({ size = 28 }: { size?: number }) {
  const h = Math.round(size * 0.55);
  return (
    <svg width={size} height={h} viewBox="0 0 30 17" fill="none">
      <path
        d="M1 14 L6 2.5 L11 11 L15 2.5 L19 11 L24 2.5 L29 14"
        stroke="#3B82F6"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OuraMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#8B5CF6" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="3.5" fill="#8B5CF6" opacity={0.65} />
    </svg>
  );
}

// ─── VALUE CARD ICONS ─────────────────────────────────────────────────────────

function HRVIcon() {
  return (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
      <polyline
        points="0,13 5,13 8,4 11,16 14,8 17,13 21,9 25,13 34,13"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function TimingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="13" r="8.5" stroke="#8B5CF6" strokeWidth="1.6" />
      <path d="M12 8.5v4.5l2.5 2.5" stroke="#8B5CF6" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 2.5h5M12 2.5V4" stroke="#8B5CF6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LoadIcon() {
  return (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
      <polyline
        points="0,17 5,13 9,9 13,5 17,7.5 21,3 25,9 29,6.5 34,11"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// ─── SAMSUNG RUNNER LOGO ─────────────────────────────────────────────────────

function SamsungRunnerLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="samsg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1428A0" />
          <stop offset="100%" stopColor="#0070C1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#samsg)" />
      {/* Head */}
      <circle cx="28" cy="10" r="3.8" fill="white" />
      {/* Ponytail */}
      <path d="M 25.5 8.5 Q 30 5 29 2" stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      {/* Neck + torso */}
      <line x1="28" y1="13.5" x2="22" y2="22" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
      {/* Hip */}
      <line x1="22" y1="22" x2="24" y2="28" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
      {/* Near arm */}
      <path d="M 26 17 L 20 21 L 22 26" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Far arm */}
      <path d="M 24 18 L 30 23 L 28 27" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Near leg */}
      <path d="M 24 28 L 19 35 L 22 43" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Far leg */}
      <path d="M 24 28 L 29 34 L 26 43" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────────────

interface WearableDefinition {
  id: string;
  name: string;
  desc: string;
  type: "oauth" | "upload";
  accent: string;
  tags: string[];
  logo: ReactNode;
  uploadSteps?: string[];
}

const LIVE_WEARABLES: WearableDefinition[] = [
  {
    id: "oura",
    name: "Oura Ring",
    desc: "Readiness score, sleep stages, body temperature deviation",
    type: "oauth",
    accent: "#8B5CF6",
    tags: ["Readiness", "Sleep", "Temp"],
    logo: <OuraMark />,
  },
  {
    id: "strava",
    name: "Strava",
    desc: "Training load, VO₂ max trend, race history and segment data",
    type: "oauth",
    accent: "#F97316",
    tags: ["Training Load", "VO₂ Max", "Race History"],
    logo: (
      <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: 18, color: "#F97316", lineHeight: 1 }}>
        S
      </span>
    ),
  },
];

const UPLOAD_WEARABLES: WearableDefinition[] = [
  {
    id: "apple",
    name: "Apple Health",
    desc: "Export your Health data archive for steps, heart rate, and sleep",
    type: "upload",
    accent: "#EC4899",
    tags: ["Steps", "Heart Rate", "Sleep"],
    logo: <span style={{ fontSize: 18 }}>🍎</span>,
    uploadSteps: [
      "Open Health app → tap your avatar (top right)",
      'Scroll down → tap "Export All Health Data"',
      "Share the .zip file, then upload it here",
    ],
  },
  {
    id: "samsung",
    name: "Samsung Health",
    desc: "Export CSV data from the Samsung Health app",
    type: "upload",
    accent: "#06B6D4",
    tags: ["Steps", "Heart Rate", "Sleep CSV"],
    logo: <SamsungRunnerLogo />,
    uploadSteps: [
      'Open Samsung Health → ⋮ menu → "Download personal data"',
      "Wait for the export confirmation email (may take a few minutes)",
      "Upload the .zip or .csv file here",
    ],
  },
];

// ─── UPLOAD / OAUTH STAGE DEFINITIONS ────────────────────────────────────────

interface Stage {
  label: string;
  duration: number;
}

const UPLOAD_STAGES: Stage[] = [
  { label: "Uploading file",         duration: 1800 },
  { label: "Parsing health records", duration: 2200 },
  { label: "Extracting biomarkers",  duration: 1600 },
  { label: "Calibrating baselines",  duration: 1400 },
  { label: "Syncing to protocol",    duration: 1000 },
];

const OAUTH_STAGES: Stage[] = [
  { label: "Redirecting to provider", duration: 900  },
  { label: "Authenticating",          duration: 1200 },
  { label: "Fetching permissions",    duration: 800  },
  { label: "Importing data",          duration: 2000 },
  { label: "Syncing to protocol",     duration: 800  },
];

// ─── PROGRESS OVERLAY ─────────────────────────────────────────────────────────

interface ProgressOverlayProps {
  wearable: WearableDefinition;
  onComplete: () => void;
}

function ProgressOverlay({ wearable, onComplete }: ProgressOverlayProps) {
  const stages = wearable.type === "upload" ? UPLOAD_STAGES : OAUTH_STAGES;
  const [stageIdx, setStageIdx] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cur = 0;
    let t0  = Date.now();

    const tick = () => {
      const elapsed   = Date.now() - t0;
      const progress  = Math.min(elapsed / stages[cur].duration, 1);
      setStageIdx(cur);
      setStageProgress(progress);

      if (progress >= 1) {
        if (cur < stages.length - 1) { cur++; t0 = Date.now(); }
        else { setDone(true); setTimeout(onComplete, 900); return; }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalProgress = ((stageIdx + (done ? 1 : stageProgress)) / stages.length) * 100;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(7,7,14,0.93)", backdropFilter: "blur(24px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "#0E0E1A",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 24, padding: "36px 32px",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: "absolute", top: -60, left: "50%",
          transform: "translateX(-50%)", width: 200, height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${wearable.accent}20 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: `${wearable.accent}14`,
          border: `1px solid ${wearable.accent}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", position: "relative",
        }}>
          {wearable.logo}
          <div style={{
            position: "absolute", inset: -5, borderRadius: 23,
            border: `2px solid ${done ? wearable.accent : "transparent"}`,
            borderTopColor: done ? wearable.accent : wearable.accent,
            animation: done ? "none" : "spin 1.2s linear infinite",
          }} />
        </div>

        <p style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "white", textAlign: "center", marginBottom: 6 }}>
          {done ? `${wearable.name} Connected` : `Connecting ${wearable.name}`}
        </p>
        <p style={{ fontFamily: "Syne, sans-serif", fontSize: 13, color: "#475569", textAlign: "center", marginBottom: 32 }}>
          {done ? "Your data is synced and ready." : (stages[stageIdx]?.label ?? "") + "…"}
        </p>

        {/* Master bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginBottom: 24, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${done ? 100 : totalProgress}%`,
            background: `linear-gradient(90deg, ${wearable.accent}, ${wearable.accent}cc)`,
            borderRadius: 99, transition: "width 0.15s linear",
            boxShadow: `0 0 8px ${wearable.accent}55`,
          }} />
        </div>

        {/* Stage list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stages.map((stage, i) => {
            const isActive   = i === stageIdx && !done;
            const isComplete = done || i < stageIdx;
            return (
              <div key={stage.label} style={{ display: "flex", alignItems: "center", gap: 12, opacity: isComplete ? 1 : isActive ? 1 : 0.22, transition: "opacity 0.3s" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: isComplete ? `${wearable.accent}18` : isActive ? `${wearable.accent}12` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${(isComplete || isActive) ? wearable.accent + "35" : "rgba(255,255,255,0.06)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isComplete
                    ? <span style={{ fontSize: 9, color: wearable.accent }}>✓</span>
                    : isActive
                    ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: wearable.accent, animation: "pulse 1s ease infinite" }} />
                    : <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
                  }
                </div>
                <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, flex: 1, color: isComplete ? "#94A3B8" : isActive ? "white" : "#1E293B", transition: "color 0.3s" }}>
                  {stage.label}
                </span>
                {isActive && (
                  <div style={{ width: 40, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${stageProgress * 100}%`, background: wearable.accent, transition: "width 0.1s linear" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── HERO PREVIEW CARDS ───────────────────────────────────────────────────────

function HeroPreviewCards({ hasConnection }: { hasConnection: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20, animation: "fadeUp 0.5s ease both", animationDelay: "0.1s" }}>

      {/* Recovery — unlocks immediately */}
      <div style={{
        background: "rgba(14,14,26,0.9)",
        border: `1px solid ${hasConnection ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 14, padding: "16px", position: "relative", overflow: "hidden", transition: "border-color 0.4s",
      }}>
        {hasConnection && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #3B82F6, #8B5CF6)" }} />
        )}
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
          Recovery
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 8 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 36, fontWeight: 800, color: hasConnection ? "#10B981" : "#1E293B", lineHeight: 1, transition: "color 0.4s" }}>
            {hasConnection ? "78" : "—"}
          </span>
          {hasConnection && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#334155" }}>/100</span>}
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
          <div style={{
            height: "100%", width: hasConnection ? "78%" : "0%",
            background: "linear-gradient(90deg, #10B981, #34D399)",
            borderRadius: 99, transition: "width 1.4s cubic-bezier(0.22,1,0.36,1)",
            boxShadow: hasConnection ? "0 0 6px rgba(16,185,129,0.4)" : "none",
          }} />
        </div>
        <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: hasConnection ? "#10B981" : "#334155", transition: "color 0.4s" }}>
          {hasConnection ? "Good to train" : "Connect to unlock"}
        </p>
      </div>

      {/* Sleep — locked until connection */}
      <div style={{
        background: "rgba(14,14,26,0.9)",
        border: `1px solid ${hasConnection ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 14, padding: "16px", position: "relative", overflow: "hidden", transition: "border-color 0.4s",
      }}>
        {hasConnection && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #8B5CF6, #A78BFA)" }} />
        )}
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
          Sleep Quality
        </p>
        {hasConnection ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 8 }}>
              <span style={{ fontFamily: "Syne, sans-serif", fontSize: 36, fontWeight: 800, color: "#8B5CF6", lineHeight: 1 }}>82</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#334155" }}>/100</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: "82%", background: "linear-gradient(90deg, #8B5CF6, #A78BFA)", borderRadius: 99, boxShadow: "0 0 6px rgba(139,92,246,0.4)" }} />
            </div>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#8B5CF6" }}>Deep sleep optimal</p>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0 2px" }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, fontSize: 16,
            }}>🔒</div>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#334155", textAlign: "center", lineHeight: 1.4 }}>
              Connect a wearable to unlock sleep staging
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VALUE CARDS ──────────────────────────────────────────────────────────────

function ValueCards() {
  const cards = [
    { icon: <HRVIcon />, label: "HRV", detail: "Daily readiness gating", color: "#10B981", bg: "rgba(16,185,129,0.05)", border: "rgba(16,185,129,0.15)" },
    { icon: <TimingIcon />, label: "Timing", detail: "Supplement windows", color: "#8B5CF6", bg: "rgba(139,92,246,0.05)", border: "rgba(139,92,246,0.15)" },
    { icon: <LoadIcon />, label: "Load", detail: "Training adaptation", color: "#F59E0B", bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.15)" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 28, animation: "fadeUp 0.5s ease both", animationDelay: "0.18s" }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 12px" }}>
          {c.icon}
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, color: c.color, marginTop: 10, marginBottom: 3 }}>{c.label}</p>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#334155", lineHeight: 1.4 }}>{c.detail}</p>
        </div>
      ))}
    </div>
  );
}

// ─── WHOOP HERO CARD ──────────────────────────────────────────────────────────

interface WhoopHeroCardProps {
  status: "connected" | "loading" | null;
  onConnect: (id: string) => void;
}

function WhoopHeroCard({ status, onConnect }: WhoopHeroCardProps) {
  const isConnected = status === "connected";
  const isLoading   = status === "loading";

  return (
    <div
      style={{
        background: isConnected
          ? "rgba(59,130,246,0.06)"
          : "linear-gradient(140deg, rgba(14,14,30,1) 0%, rgba(18,18,42,1) 100%)",
        border: `1px solid ${isConnected ? "rgba(59,130,246,0.32)" : "rgba(59,130,246,0.18)"}`,
        borderRadius: 18, padding: 22, position: "relative", overflow: "hidden",
        marginBottom: 10, transition: "all 0.3s ease",
        animation: "fadeUp 0.5s ease both", animationDelay: "0.06s",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Best-for badge */}
      {!isConnected && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)",
          borderRadius: 99, padding: "3px 10px", marginBottom: 14,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B82F6", boxShadow: "0 0 6px rgba(59,130,246,0.6)" }} />
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#3B82F6", textTransform: "uppercase" }}>
            Best for Competition Prep
          </span>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: isConnected ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.07)",
            border: "1px solid rgba(59,130,246,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <WhoopMark size={30} />
          </div>
          <div>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 800, color: "white", marginBottom: 2 }}>WHOOP</p>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#475569" }}>HRV · Recovery · Strain · Sleep</p>
          </div>
        </div>

        <button
          onClick={() => !isConnected && !isLoading && onConnect("whoop")}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            fontSize: 13, fontWeight: 700, fontFamily: "Syne, sans-serif",
            cursor: isConnected || isLoading ? "default" : "pointer",
            background: isConnected
              ? "rgba(59,130,246,0.1)"
              : "linear-gradient(135deg, #3B82F6, #6366F1)",
            color: isConnected ? "#3B82F6" : "white",
            boxShadow: isConnected ? "none" : "0 4px 16px rgba(59,130,246,0.28)",
            transition: "all 0.2s ease", whiteSpace: "nowrap", minWidth: 100,
          }}
        >
          {isConnected ? "✓ Connected" : isLoading ? "Connecting…" : "Connect →"}
        </button>
      </div>

      <p style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>
        The most granular daily readiness signal available — HRV-based recovery scoring, sleep staging, and strain monitoring that your protocol adapts to in real time.
      </p>

      {/* Tag chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["HRV Recovery", "Sleep Staging", "Strain Score", "Readiness Score"].map((tag) => (
          <span key={tag} style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "#3B82F6",
            background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)",
            padding: "3px 8px", borderRadius: 6,
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── STANDARD WEARABLE CARD ───────────────────────────────────────────────────

interface WearableCardProps {
  wearable:   WearableDefinition;
  status:     "connected" | "loading" | null;
  onConnect:  (id: string) => void;
  onUpload:   (id: string) => void;
  animDelay?: number;
}

function WearableCard({ wearable, status, onConnect, onUpload, animDelay = 0 }: WearableCardProps) {
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isConnected = status === "connected";
  const isLoading   = status === "loading";
  const accept      = wearable.id === "samsung" ? ".zip,.csv" : ".zip";

  const handleAction = () => {
    if (isConnected || isLoading) return;
    if (wearable.type === "oauth") onConnect(wearable.id);
    else setExpanded((e) => !e);
  };

  return (
    <div style={{
      background: isConnected ? `${wearable.accent}07` : "#0E0E1A",
      border: `1px solid ${isConnected ? wearable.accent + "28" : expanded ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)"}`,
      borderRadius: 14, overflow: "hidden", transition: "all 0.25s ease",
      animation: "fadeUp 0.5s ease both", animationDelay: `${animDelay}ms`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 15px" }}>
        {/* Logo */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${wearable.accent}0e`, border: `1px solid ${wearable.accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {wearable.logo}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>
            {wearable.name}
          </p>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#475569", lineHeight: 1.4, marginBottom: 6 }}>
            {wearable.desc}
          </p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {wearable.tags.map((tag) => (
              <span key={tag} style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                color: "#2D3748",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                padding: "2px 5px", borderRadius: 4,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action */}
        <button
          onClick={handleAction}
          style={{
            flexShrink: 0, padding: "8px 15px", borderRadius: 9,
            border: isConnected ? `1px solid ${wearable.accent}28` : "none",
            fontSize: 11, fontWeight: 700, fontFamily: "Syne, sans-serif",
            cursor: isConnected || isLoading ? "default" : "pointer",
            transition: "all 0.2s ease",
            background: isConnected
              ? `${wearable.accent}0f`
              : wearable.type === "oauth"
              ? wearable.accent
              : "rgba(255,255,255,0.06)",
            color: isConnected ? wearable.accent : "white",
            minWidth: 76,
          }}
        >
          {isConnected ? "✓ Done" : isLoading ? "…" : wearable.type === "oauth" ? "Connect" : expanded ? "↑ Close" : "Upload"}
        </button>
      </div>

      {/* Upload expansion */}
      {wearable.type === "upload" && expanded && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.04)", padding: "15px",
          background: "rgba(0,0,0,0.14)", animation: "slideDown 0.2s ease",
        }}>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#334155", textTransform: "uppercase", marginBottom: 10 }}>
            How to export
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {wearable.uploadSteps?.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  background: `${wearable.accent}10`, border: `1px solid ${wearable.accent}1e`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: wearable.accent, fontWeight: 600 }}>{i + 1}</span>
                </div>
                <span style={{ fontFamily: "Syne, sans-serif", fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) onUpload(wearable.id); }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%", padding: "11px",
              background: `${wearable.accent}0e`, border: `1px dashed ${wearable.accent}2e`,
              borderRadius: 9, color: wearable.accent,
              fontSize: 12, fontWeight: 600, fontFamily: "Syne, sans-serif", cursor: "pointer",
            }}
          >
            ↑ Select file to upload
          </button>
        </div>
      )}
    </div>
  );
}

// ─── COMING SOON SECTION ──────────────────────────────────────────────────────

interface ComingSoonCardProps {
  name:   string;
  caption: string;
  logo:   ReactNode;
  notified: boolean;
  onNotify: () => void;
}

function ComingSoonCard({ name, caption, logo, notified, onNotify }: ComingSoonCardProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 15px", opacity: 0.65 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: "#0e1128", border: "1px solid rgba(108,92,231,0.32)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {logo}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
            {name}
          </span>
          <span style={{
            fontFamily: "Syne, sans-serif", fontSize: 8, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#A78BFA", background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.2)", padding: "2px 6px", borderRadius: 99,
          }}>
            Soon
          </span>
        </div>
        <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#334155" }}>{caption}</p>
      </div>
      <button
        onClick={notified ? undefined : onNotify}
        style={{
          flexShrink: 0, padding: "7px 12px", borderRadius: 8, cursor: notified ? "default" : "pointer",
          fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 600,
          background: notified ? "rgba(16,185,129,0.08)" : "transparent",
          border: `1px solid ${notified ? "rgba(16,185,129,0.25)" : "rgba(108,92,231,0.3)"}`,
          color: notified ? "#10B981" : "#A78BFA",
          display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
        }}
      >
        {notified
          ? <><span style={{ fontSize: 10 }}>✓</span> You&apos;re on the list</>
          : <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              Notify me
            </>
        }
      </button>
    </div>
  );
}

interface ComingSoonSectionProps {
  notified: Record<string, boolean>;
  onNotify: (id: string) => void;
}

function ComingSoonSection({ notified, onNotify }: ComingSoonSectionProps) {
  const coming = [
    {
      id: "garmin", name: "Garmin", caption: "GPS · Performance · Multisport",
      logo: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <path d="M 25 12 A 10 10 0 1 0 24.5 20 L 18 20 L 18 16 L 26 16" stroke="rgba(162,155,254,0.85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      ),
    },
    {
      id: "polar", name: "Polar", caption: "Heart rate · Training zones · Recovery",
      logo: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <path d="M 10 8 L 10 24 M 10 8 Q 20 8 20 13 Q 20 18 10 18" stroke="rgba(162,155,254,0.85)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="20" cy="20" r="4.5" stroke="rgba(162,155,254,0.5)" strokeWidth="1.6" fill="none" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{
      background: "rgba(108,92,231,0.04)",
      border: "1px solid rgba(108,92,231,0.12)",
      borderRadius: 14, overflow: "hidden", marginBottom: 28,
      animation: "fadeUp 0.5s ease both", animationDelay: "0.32s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 15px", borderBottom: "1px solid rgba(108,92,231,0.1)" }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        <span style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: "#A78BFA", textTransform: "uppercase", flex: 1 }}>
          Coming soon
        </span>
        <span style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#334155" }}>Integrations in development</span>
      </div>
      {coming.map((c) => (
        <ComingSoonCard key={c.id} name={c.name} caption={c.caption} logo={c.logo} notified={!!notified[c.id]} onNotify={() => onNotify(c.id)} />
      ))}
    </div>
  );
}

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────

function SectionDivider({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, animation: "fadeUp 0.4s ease both", animationDelay: `${delay}ms` }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
      <span style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "#334155", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface WearablesStepProps {
  /** Called when the user taps Back. Defaults to router.back(). */
  onBack?:     () => void;
  /** Called when the user skips or continues (connected IDs passed). */
  onContinue?: (connectedIds: string[]) => void;
}

export default function WearablesStep({ onBack, onContinue }: WearablesStepProps = {}) {
  const router = useRouter();
  const [statuses, setStatuses]           = useState<Record<string, "connected" | "loading">>({});
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [notified, setNotified]           = useState<Record<string, boolean>>({});

  const handleConnect = (id: string) => { setStatuses((s) => ({ ...s, [id]: "loading" })); setActiveOverlay(id); };
  const handleUpload  = (id: string) => { setStatuses((s) => ({ ...s, [id]: "loading" })); setActiveOverlay(id); };

  const handleOverlayComplete = () => {
    if (activeOverlay) setStatuses((s) => ({ ...s, [activeOverlay]: "connected" }));
    setActiveOverlay(null);
  };

  const connectedIds   = Object.entries(statuses).filter(([, v]) => v === "connected").map(([k]) => k);
  const connectedCount = connectedIds.length;
  const hasConnection  = connectedCount > 0;

  const overlayWearable = [...LIVE_WEARABLES, ...UPLOAD_WEARABLES].find((w) => w.id === activeOverlay) ?? null;
  const whoopStatus     = statuses["whoop"] ?? null;

  const handleBack     = () => (onBack     ? onBack()                : router.back());
  const handleContinue = () => (onContinue ? onContinue(connectedIds) : router.back());
  const handleNotify   = (id: string) => setNotified((n) => ({ ...n, [id]: true }));

  return (
    <div style={{ background: "#07070E", minHeight: "100vh", fontFamily: "Syne, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn  { from { opacity: 0; }                         to { opacity: 1; } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin    { to   { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        @keyframes progressFill { from { width: 0%; } }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(7,7,14,0.95)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <button onClick={handleBack} style={{ background: "none", border: "none", color: "#475569", fontSize: 13, fontFamily: "Syne, sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
          ← Back
        </button>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 99, padding: "6px 14px" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#3B82F6", fontWeight: 600 }}>3 / 5</span>
          <div style={{ width: 56, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg, #3B82F6, #8B5CF6)", borderRadius: 99, animation: "progressFill 0.8s ease both", boxShadow: "0 0 6px rgba(59,130,246,0.45)" }} />
          </div>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#334155" }}>Wearables</span>
        </div>

        <div style={{ width: 54 }} />
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "26px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 20, animation: "fadeUp 0.4s ease both" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)",
            borderRadius: 7, padding: "4px 10px", marginBottom: 14,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F97316" }} />
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: "#F97316", textTransform: "uppercase" }}>
              Competition Prep · Step 3
            </span>
          </div>

          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 30, fontWeight: 800, color: "white", lineHeight: 1.1, marginBottom: 8 }}>
            Connect your wearable
          </h1>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 13, color: "#475569", lineHeight: 1.65, maxWidth: 480 }}>
            Live HRV and recovery data lets your protocol adapt to how your body is actually responding — not how it was two weeks ago.
          </p>
        </div>

        {/* Preview cards */}
        <HeroPreviewCards hasConnection={hasConnection} />

        {/* Value cards */}
        <ValueCards />

        {/* Live sync section */}
        <SectionDivider label="Live sync" delay={60} />

        {/* WHOOP — featured hero */}
        <WhoopHeroCard status={whoopStatus} onConnect={handleConnect} />

        {/* Oura + Strava */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {LIVE_WEARABLES.map((w, i) => (
            <WearableCard
              key={w.id}
              wearable={w}
              status={statuses[w.id] ?? null}
              onConnect={handleConnect}
              onUpload={handleUpload}
              animDelay={80 + i * 60}
            />
          ))}
        </div>

        {/* Manual import section */}
        <SectionDivider label="Manual import" delay={200} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {UPLOAD_WEARABLES.map((w, i) => (
            <WearableCard
              key={w.id}
              wearable={w}
              status={statuses[w.id] ?? null}
              onConnect={handleConnect}
              onUpload={handleUpload}
              animDelay={240 + i * 60}
            />
          ))}
        </div>

        {/* Coming soon */}
        <ComingSoonSection notified={notified} onNotify={handleNotify} />

        {/* Continue CTA — slides in after first connection */}
        {hasConnection && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, padding: "18px 20px", marginBottom: 12,
            background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: 14, animation: "slideUp 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            <div>
              <p style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "white", marginBottom: 3 }}>
                Your wearable is connected
              </p>
              <p style={{ fontFamily: "Syne, sans-serif", fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                Blue Zone is ready to adapt to your recovery. Next: set your protocol.
              </p>
            </div>
            <button
              onClick={handleContinue}
              style={{
                flexShrink: 0, padding: "11px 18px",
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                border: "none", borderRadius: 10,
                fontSize: 13, fontWeight: 700, fontFamily: "Syne, sans-serif",
                color: "white", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(59,130,246,0.25)",
                display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
              }}
            >
              Continue to Protocol
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}

        {/* Skip */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, padding: "14px 0",
        }}>
          <div>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#334155", marginBottom: 5 }}>
              {hasConnection ? "Connected. Ready to continue whenever you are." : "Not ready yet? No problem."}
            </p>
            <button
              onClick={handleContinue}
              style={{
                background: "none", border: "none", padding: 0,
                fontFamily: "Syne, sans-serif", fontSize: 12, color: "#475569",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {hasConnection ? "Go to next step" : "Continue without connecting"}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 2 }}>
              {hasConnection ? "You can manage wearables anytime" : "You can connect anytime"}
            </p>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "#1E293B" }}>
              Track → Wearables in the sidebar
            </p>
          </div>
        </div>
      </div>

      {/* ── PROGRESS OVERLAY ── */}
      {activeOverlay && overlayWearable && (
        <ProgressOverlay wearable={overlayWearable} onComplete={handleOverlayComplete} />
      )}
    </div>
  );
}
