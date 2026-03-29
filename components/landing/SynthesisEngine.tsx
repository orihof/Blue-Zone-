/// components/landing/SynthesisEngine.tsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Database, Activity, GitBranch, FlaskConical } from "lucide-react";
import { EASE_OUT_EXPO } from "@/lib/animations";

/* ── Scenario data ── */

const SCENARIOS = [
  {
    id: "iron",
    bloodSignals: [
      { label: "Ferritin", value: "58 ng/mL", status: "low" as const, badge: "↓ Low" },
      { label: "Transferrin sat.", value: "19%", status: "warn" as const, badge: "Borderline" },
      { label: "hs-CRP", value: "1.2 mg/L", status: "warn" as const, badge: "Elevated" },
    ],
    wearableSignals: [
      { label: "HRV trend", value: "41ms", status: "low" as const, badge: "↓ 14-day decline" },
      { label: "Training load", value: "High", status: "active" as const, badge: "↑ Week 4 build" },
      { label: "Sleep quality", value: "5.8 / 10", status: "low" as const, badge: "↓ 3wk average" },
    ],
    rootCause: "Iron depletion under oxidative training stress",
    rootCauseDetail: "Not overtraining — iron-restricted erythropoiesis",
    protocol: {
      name: "Iron bisglycinate",
      dose: "25mg",
      timing: "Evening · Away from training window · With Vitamin C",
    },
  },
  {
    id: "thyroid",
    bloodSignals: [
      { label: "TSH", value: "2.8 mIU/L", status: "warn" as const, badge: "In range — watch" },
      { label: "Free T3", value: "Low-normal", status: "low" as const, badge: "↓ Bottom quartile" },
      { label: "Vitamin D", value: "31 ng/mL", status: "warn" as const, badge: "Suboptimal" },
    ],
    wearableSignals: [
      { label: "Resting HR", value: "+7 BPM", status: "low" as const, badge: "↑ Baseline shift" },
      { label: "Sleep quality", value: "4.9 / 10", status: "low" as const, badge: "↓ 3 weeks" },
      { label: "Recovery score", value: "Low", status: "low" as const, badge: "↓ Consistent" },
    ],
    rootCause: "Subclinical T3 suppression",
    rootCauseDetail: "Invisible on standard panel — visible in context",
    protocol: {
      name: "Selenium + Iodine audit",
      dose: "200mcg",
      timing: "Morning · Retest thyroid panel in 6 weeks",
    },
  },
  {
    id: "cortisol",
    bloodSignals: [
      { label: "hs-CRP", value: "1.4 mg/L", status: "warn" as const, badge: "Borderline" },
      { label: "Cortisol AM", value: "22 µg/dL", status: "warn" as const, badge: "High-normal" },
      { label: "Magnesium RBC", value: "4.1 mg/dL", status: "warn" as const, badge: "↓ Low-normal" },
    ],
    wearableSignals: [
      { label: "Resting HR", value: "+8 BPM", status: "low" as const, badge: "↑ Elevated" },
      { label: "Weekly volume", value: "+30%", status: "active" as const, badge: "↑ Ramp too fast" },
      { label: "HRV", value: "38ms", status: "low" as const, badge: "↓ Suppressed" },
    ],
    rootCause: "Training-induced inflammatory overload",
    rootCauseDetail: "Volume ramp blocking adaptation — not fitness",
    protocol: {
      name: "Volume reduction + Omega-3",
      dose: "−20% vol · 2g EPA/DHA",
      timing: "Immediate · Retest hs-CRP in 3 weeks",
    },
  },
];

type SignalStatus = "low" | "warn" | "active";

const BADGE_STYLES: Record<SignalStatus, string> = {
  low: "bg-orange-500/10 text-orange-400",
  warn: "bg-yellow-500/10 text-yellow-400",
  active: "bg-[color:var(--ion-blue)]/10 text-[color:var(--ion-blue)]",
};

const FEATURES = [
  { icon: Database, text: "We read what your doctor flags — and what they don\u2019t" },
  { icon: Activity, text: "Your HRV only makes sense with your training load" },
  { icon: GitBranch, text: "Every fix ordered by what moves your markers fastest" },
];

/* ── Types ── */

type LineData = {
  id: string;
  d: string;
  side: "left" | "right";
};

type Phase =
  | "idle"
  | "signals_in"
  | "lines_draw"
  | "converge"
  | "result_in"
  | "hold"
  | "fade_out";

/* ── Component ── */

export function SynthesisEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const scenarioIndexRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [lineData, setLineData] = useState<LineData[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [hasTriggered, setHasTriggered] = useState(false);

  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  const scenario = SCENARIOS[scenarioIndex];

  /* ── Phase visibility helpers ── */
  const signalsVisible = (["signals_in", "lines_draw", "converge", "result_in", "hold"] as Phase[]).includes(phase);
  const linesVisible = (["lines_draw", "converge", "result_in", "hold"] as Phase[]).includes(phase);
  const nodeActive = (["converge", "result_in", "hold"] as Phase[]).includes(phase);
  const resultVisible = (["result_in", "hold"] as Phase[]).includes(phase);
  const isFadingOut = phase === "fade_out";

  /* ── Line position calculation ── */
  const calculateLinePositions = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const nodeEl = document.getElementById("convergence-node");
    if (!nodeEl) return;
    const nodeRect = nodeEl.getBoundingClientRect();
    const nodeCenterX = nodeRect.left + nodeRect.width / 2 - containerRect.left;
    const nodeCenterY = nodeRect.top + nodeRect.height / 2 - containerRect.top;
    const lines: LineData[] = [];
    for (let i = 0; i < 3; i++) {
      const dotEl = document.getElementById(`blood-dot-${i}`);
      if (!dotEl) continue;
      const dotRect = dotEl.getBoundingClientRect();
      const startX = dotRect.right - containerRect.left;
      const startY = dotRect.top + dotRect.height / 2 - containerRect.top;
      const cpX = (startX + nodeCenterX) / 2;
      lines.push({ id: `line-blood-${i}`, d: `M ${startX} ${startY} Q ${cpX} ${startY} ${nodeCenterX} ${nodeCenterY}`, side: "left" });
    }
    for (let i = 0; i < 3; i++) {
      const dotEl = document.getElementById(`wearable-dot-${i}`);
      if (!dotEl) continue;
      const dotRect = dotEl.getBoundingClientRect();
      const startX = dotRect.left - containerRect.left;
      const startY = dotRect.top + dotRect.height / 2 - containerRect.top;
      const cpX = (startX + nodeCenterX) / 2;
      lines.push({ id: `line-wearable-${i}`, d: `M ${startX} ${startY} Q ${cpX} ${startY} ${nodeCenterX} ${nodeCenterY}`, side: "right" });
    }
    setLineData(lines);
  }, []);

  /* ── Animation sequence ── */
  const runSequence = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    const t = (delay: number, fn: () => void) => {
      const id = setTimeout(fn, delay);
      timeoutsRef.current.push(id);
    };
    t(0, () => setPhase("signals_in"));
    t(1200, () => setPhase("lines_draw"));
    t(2200, () => setPhase("converge"));
    t(2800, () => setPhase("result_in"));
    t(3800, () => setPhase("hold"));
    t(7300, () => setPhase("fade_out"));
    t(7900, () => {
      const nextIdx = (scenarioIndexRef.current + 1) % 3;
      scenarioIndexRef.current = nextIdx;
      setScenarioIndex(nextIdx);
      setPhase("idle");
      const restartId = setTimeout(() => { runSequence(); }, 150);
      timeoutsRef.current.push(restartId);
    });
  }, []);

  /* ── Effects ── */

  // ResizeObserver for line recalculation
  useEffect(() => {
    const timer = setTimeout(() => { calculateLinePositions(); }, 200);
    const onLoad = () => { calculateLinePositions(); };
    window.addEventListener("load", onLoad);
    const observer = new ResizeObserver(() => { calculateLinePositions(); });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { clearTimeout(timer); window.removeEventListener("load", onLoad); observer.disconnect(); };
  }, [calculateLinePositions]);

  // Recalculate lines on scenario change
  useEffect(() => {
    const timer = setTimeout(() => { calculateLinePositions(); }, 100);
    return () => clearTimeout(timer);
  }, [scenarioIndex, calculateLinePositions]);

  // Fire sequence on scroll entry
  useEffect(() => {
    if (isInView && !hasTriggered && !shouldReduceMotion) {
      setHasTriggered(true);
      runSequence();
    }
  }, [isInView, hasTriggered, shouldReduceMotion, runSequence]);

  // Reduced motion: skip to final state
  useEffect(() => {
    if (shouldReduceMotion) setPhase("hold");
  }, [shouldReduceMotion]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => { timeoutsRef.current.forEach(clearTimeout); };
  }, []);

  return (
    <section ref={sectionRef} style={{ background: "#0A0A0F", padding: "64px 0 96px", overflow: "visible", position: "relative", backgroundImage: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99,102,241,0.06) 0%, transparent 70%)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 16px" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 16 }}>
            WHY BLUE ZONE IS DIFFERENT
          </div>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 700, fontSize: "clamp(26px,4vw,40px)", color: "#FFFFFF", lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
            One platform that sees the full picture.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", margin: 0 }}>
            Blood and training data read together — because they&apos;re not separate problems.
          </p>
        </div>

        {/* Visualization container */}
        <div ref={containerRef} className="max-w-6xl mx-auto px-4 relative">
        {/* SVG connector lines overlay — desktop only */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="lineGradLeft" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.05)" />
              <stop offset="60%" stopColor="rgba(99,102,241,0.45)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.1)" />
            </linearGradient>
            <linearGradient id="lineGradRight" gradientUnits="userSpaceOnUse" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.05)" />
              <stop offset="60%" stopColor="rgba(99,102,241,0.45)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.1)" />
            </linearGradient>
          </defs>
          {lineData.map((line, idx) => (
            <g key={line.id}>
              {/* Safari fallback — solid color behind gradient */}
              <motion.path
                d={line.d}
                stroke="rgba(99,102,241,0.35)"
                strokeWidth={1.5}
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: linesVisible && !isFadingOut ? 1 : 0,
                  opacity: linesVisible && !isFadingOut ? 0.4 : 0,
                }}
                transition={{
                  pathLength: { duration: 0.6, delay: idx * 0.08, ease: EASE_OUT_EXPO },
                  opacity: { duration: 0.3, delay: idx * 0.08 },
                }}
              />
              {/* Gradient path — renders on top in Chrome */}
              <motion.path
                data-line-id={line.id}
                d={line.d}
                stroke={line.side === "left" ? "url(#lineGradLeft)" : "url(#lineGradRight)"}
                strokeWidth={1.5}
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: linesVisible && !isFadingOut ? 1 : 0,
                  opacity: linesVisible && !isFadingOut ? 0.65 : 0,
                }}
                transition={{
                  pathLength: { duration: 0.6, delay: idx * 0.08, ease: EASE_OUT_EXPO },
                  opacity: { duration: 0.3, delay: idx * 0.08 },
                }}
              />
            </g>
          ))}
        </svg>
        <div className="flex flex-col items-center gap-6 md:grid md:grid-cols-[1fr_200px_1fr] md:gap-0 md:items-start" style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* ── LEFT COLUMN — Blood signals ── */}
          <div className="flex flex-col gap-4 items-start md:items-end w-full">
            <div className="flex items-center justify-start md:justify-end gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex-shrink-0">
                <FlaskConical size={12} className="text-orange-400" />
              </div>
              <span className="text-xs font-semibold tracking-[0.15em] uppercase text-white/60" style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Blood Panel</span>
            </div>
            {scenario.bloodSignals.map((s, i) => (
              <motion.div
                key={`${scenario.id}-blood-${i}`}
                className="flex items-center gap-4 justify-start md:justify-end"
                animate={signalsVisible && !isFadingOut ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.4, delay: i * 0.12, ease: EASE_OUT_EXPO }}
              >
                <span className={`text-xs px-2.5 py-1 rounded-full ${BADGE_STYLES[s.status]}`} style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>
                  {s.badge}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", whiteSpace: "nowrap" }}>
                  {s.value}
                </span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
                <span
                  id={`blood-dot-${i}`}
                  className={`hidden md:block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${
                    linesVisible && !isFadingOut
                      ? "bg-[color:var(--ion-blue)] shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                      : "bg-white/20"
                  }`}
                />
              </motion.div>
            ))}
          </div>

          {/* ── CENTER COLUMN — Convergence node ONLY ── */}
          <div className="flex items-center justify-center w-20 mx-auto md:w-auto pt-2 relative">
            {/* Atmospheric glow behind node */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-[400ms]"
              style={{
                opacity: nodeActive ? 1 : 0,
                background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
                transform: "scale(2)",
              }}
              aria-hidden="true"
            />
            <motion.div
              animate={nodeActive ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <div
                id="convergence-node"
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-[400ms] ${
                  nodeActive
                    ? "border-[color:var(--ion-blue)]/50 shadow-[0_0_40px_rgba(99,102,241,0.25)]"
                    : "border-[color:var(--ion-blue)]/30 shadow-[0_0_32px_rgba(99,102,241,0.1)]"
                }`}
                style={{ border: `1px solid rgba(99,102,241,${nodeActive ? 0.5 : 0.3})` }}
              >
                <div
                  className={`rounded-full flex items-center justify-center transition-all duration-[400ms]`}
                  style={{
                    width: 52, height: 52,
                    background: `rgba(99,102,241,${nodeActive ? 0.25 : 0.15})`,
                    border: `1px solid rgba(99,102,241,${nodeActive ? 0.6 : 0.4})`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full transition-all duration-[400ms]"
                    style={{
                      background: "var(--ion-blue)",
                      boxShadow: `0 0 ${nodeActive ? 16 : 12}px rgba(99,102,241,${nodeActive ? 1 : 0.8})`,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN — Wearable signals ── */}
          <div className="flex flex-col gap-4 items-start w-full">
            <div className="flex items-center justify-start gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: "rgba(0,138,255,0.1)", border: "1px solid rgba(0,138,255,0.2)" }}>
                <Activity size={12} style={{ color: "var(--ion-blue)" }} />
              </div>
              <span className="text-xs font-semibold tracking-[0.15em] uppercase text-white/60" style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Wearables</span>
            </div>
            {scenario.wearableSignals.map((s, i) => (
              <motion.div
                key={`${scenario.id}-wearable-${i}`}
                className="flex items-center gap-4 justify-start"
                animate={signalsVisible && !isFadingOut ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ duration: 0.4, delay: i * 0.12, ease: EASE_OUT_EXPO }}
              >
                <span
                  id={`wearable-dot-${i}`}
                  className={`hidden md:block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-300 ${
                    linesVisible && !isFadingOut
                      ? "bg-[color:var(--ion-blue)] shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                      : "bg-white/20"
                  }`}
                />
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", whiteSpace: "nowrap" }}>
                  {s.value}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full ${BADGE_STYLES[s.status]}`} style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>
                  {s.badge}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
        </div>

        {/* Result panel — below the grid, centered */}
        <div className="flex flex-col items-center mx-auto text-center max-w-sm" style={{ marginTop: 16 }}>
          {/* Root cause */}
          <motion.div
            animate={resultVisible && !isFadingOut ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ion-blue)", opacity: 0.5, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 4 }}>
              ROOT CAUSE
            </div>
            <div className="text-base md:text-lg" style={{ fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-serif,'Syne',sans-serif)", lineHeight: 1.35, marginBottom: 4 }}>
              {scenario.rootCause}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontStyle: "italic", overflow: "hidden" }}>
              {scenario.rootCauseDetail}
            </div>
          </motion.div>

          {/* Protocol */}
          <motion.div
            animate={resultVisible && !isFadingOut ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT_EXPO }}
            style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", width: "100%" }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 2 }}>
              {scenario.protocol.name}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ion-blue)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
              {scenario.protocol.dose}
            </div>
            <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 max-w-xs mx-auto" style={{ marginTop: 4 }}>
              {scenario.protocol.timing.split(" · ").map((phrase, i, arr) => (
                <span key={phrase} className="contents">
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>{phrase}</span>
                  {i < arr.length - 1 && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>·</span>}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scenario indicator dots */}
        <div style={{ marginTop: 40, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
          {SCENARIOS.map((s, i) => (
            <motion.div
              key={s.id}
              animate={{
                width: i === scenarioIndex ? 16 : 6,
                backgroundColor: i === scenarioIndex ? "var(--ion-blue)" : "rgba(255,255,255,0.15)",
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ height: 6, borderRadius: 3 }}
            />
          ))}
        </div>

        {/* Feature summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5 border border-white/5 rounded-2xl overflow-hidden" style={{ marginTop: 64 }}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.text} style={{ background: "#111118", padding: "20px 24px" }}>
                <Icon size={14} style={{ color: "var(--ion-blue)", opacity: 0.6 }} />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 8, lineHeight: 1.55 }}>
                  {f.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
