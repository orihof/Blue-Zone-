/// components/ProtocolLoader.tsx
// Cinematic full-screen loading screen shown while a protocol is being generated.
// "Personal" headline word flickers char-by-char; steps reveal via typewriter.
// Bottom: 2px aurora progress bar, fixed, full width.
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BZLogo } from "@/components/BZLogo";

const STEPS = [
  "Ingesting health data",
  "Parsing uploads & OCR",
  "Normalising wearable metrics",
  "Building biomarker snapshot",
  "Generating personalised protocol",
] as const;

const STEP_DURATION_MS = 4_000;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// ── Character-level flicker for the word "Personal" ──────────────────────────

function FlickerWord({ word }: { word: string }) {
  const [displayed, setDisplayed] = useState(word);

  useEffect(() => {
    let iter = 0;
    const total = word.length * 4;
    // randomise per-character delay
    const delays = Array.from({ length: word.length }, () =>
      Math.floor(Math.random() * 120) + 60
    );
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function scramble() {
      const id = setInterval(() => {
        setDisplayed(
          word.split("").map((ch, i) => {
            if (i < Math.floor(iter / 3)) return ch;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          }).join("")
        );
        iter++;
        if (iter > total) clearInterval(id);
      }, delays[Math.min(iter, delays.length - 1)] ?? 80);
      return id;
    }

    const id = scramble();
    return () => {
      clearInterval(id);
      timeouts.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        background: "var(--gradient-aurora)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {displayed}
    </span>
  );
}

// ── Typewriter step ───────────────────────────────────────────────────────────

function TypewriterStep({
  text,
  isDone,
  isActive,
  delay = 0,
}: {
  text: string;
  isDone: boolean;
  isActive: boolean;
  delay?: number;
}) {
  const [visible, setVisible] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isActive && !isDone) return;
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [isActive, isDone, delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const id = setInterval(() => {
      setVisible(text.slice(0, ++i));
      if (i >= text.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [started, text]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3"
    >
      {/* Status indicator */}
      <div className="w-5 flex-shrink-0 flex justify-center">
        {isDone ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--bz-optimal)" }}
          />
        ) : isActive ? (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--bz-blue)" }}
          />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--rim)" }} />
        )}
      </div>

      {/* Text */}
      <span
        className="text-xs tracking-wide"
        style={{
          fontFamily: "var(--font-mono)",
          color: isDone ? "var(--bz-optimal)" : isActive ? "var(--stellar)" : "var(--dust)",
        }}
      >
        {isDone ? "✓ " : isActive ? "→ " : "  "}
        {isDone ? text : visible}
        {isActive && visible.length < text.length && (
          <span className="animate-cursor">▎</span>
        )}
      </span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ProtocolLoaderProps {
  protocolId: string;
}

export function ProtocolLoader({ protocolId }: ProtocolLoaderProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0]);
  const [failed, setFailed] = useState(false);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  useEffect(() => {
    function advance() {
      setCurrentStep((s) => {
        const next = Math.min(s + 1, STEPS.length - 1);
        if (next !== s) {
          setVisibleSteps((prev) => prev.includes(next) ? prev : [...prev, next]);
          stepTimer.current = setTimeout(advance, STEP_DURATION_MS);
        }
        return next;
      });
    }

    async function poll() {
      try {
        const res = await fetch(`/api/protocols/status?protocolId=${protocolId}`);
        if (!res.ok) return;
        const { status } = await res.json();
        if (status === "ready")  { router.refresh(); return; }
        if (status === "failed") { setFailed(true);  return; }
      } catch { /* keep polling */ }
      pollTimer.current = setTimeout(poll, 3_000);
    }

    stepTimer.current = setTimeout(advance, STEP_DURATION_MS);
    pollTimer.current = setTimeout(poll, 3_000);

    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [protocolId, router]);

  // ── Failed state ─────────────────────────────────────────────────────────
  if (failed) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: "var(--void)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-4"
        >
          <p
            className="font-light text-xl"
            style={{ color: "var(--stellar)", fontFamily: "var(--font-serif)" }}
          >
            Protocol generation failed
          </p>
          <p className="text-sm" style={{ color: "var(--dust)" }}>
            Something went wrong. Please try again.
          </p>
          <button
            onClick={() => router.push("/app/onboarding/dial")}
            className="border rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
            style={{ borderColor: "rgba(0,138,255,0.35)", color: "var(--cerulean)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,138,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Try again
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-grid-subtle overflow-hidden"
      style={{ background: "var(--void)" }}
    >
      {/* Aurora radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(91,33,255,0.12) 0%, rgba(0,138,255,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-6">

        {/* Pulsing logo */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            filter: "drop-shadow(0 0 20px rgba(91,33,255,0.6)) drop-shadow(0 0 40px rgba(0,138,255,0.3))",
          }}
        >
          <BZLogo size={52} variant="mark" />
        </motion.div>

        {/* Headline */}
        <div className="text-center space-y-1.5">
          <h2
            className="font-light leading-snug"
            style={{
              fontSize: "clamp(22px, 4vw, 34px)",
              fontFamily: "var(--font-serif)",
              color: "var(--stellar)",
            }}
          >
            Creating Your{" "}
            <FlickerWord word="Personal" />{" "}
            Optimization Protocol
          </h2>
          <p
            className="text-sm"
            style={{ color: "var(--dust)", fontFamily: "var(--font-ui, sans-serif)" }}
          >
            This usually takes 30–60 seconds
          </p>
        </div>

        {/* Steps list */}
        <div className="w-full space-y-3">
          <AnimatePresence initial={false}>
            {STEPS.map((step, i) => {
              if (!visibleSteps.includes(i)) return null;
              return (
                <TypewriterStep
                  key={i}
                  text={step}
                  isDone={i < currentStep}
                  isActive={i === currentStep}
                  delay={i === 0 ? 0 : 200}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed bottom 2px progress bar */}
      <div
        className="fixed bottom-0 inset-x-0 h-0.5"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <motion.div
          className="h-full"
          style={{
            background: "var(--gradient-aurora)",
            boxShadow: "0 0 8px rgba(91,33,255,0.6), 0 0 16px rgba(0,138,255,0.3)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
