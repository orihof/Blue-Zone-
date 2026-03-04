/// components/results/ProcessingSteps.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BZLogo } from "@/components/BZLogo";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const STEPS = [
  "Ingesting health data",
  "Parsing uploads & OCR",
  "Normalising wearable metrics",
  "Building biomarker snapshot",
  "Generating personalised protocol",
];

const STEP_DURATION_MS = 4_000;

// ── Flickering text effect on a single word ───────────────────────────────────
function FlickerWord({ word }: { word: string }) {
  const [displayed, setDisplayed] = useState(word);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  useEffect(() => {
    let iter = 0;
    const total = word.length * 3;
    const id = setInterval(() => {
      setDisplayed(
        word
          .split("")
          .map((ch, i) => {
            if (i < Math.floor(iter / 3)) return ch;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      iter++;
      if (iter > total) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  return (
    <span
      className="font-mono"
      style={{ color: "var(--bz-blue)", fontFamily: "var(--font-mono)" }}
    >
      {displayed}
    </span>
  );
}

interface ProcessingStepsProps {
  protocolId: string;
}

export function ProcessingSteps({ protocolId }: ProcessingStepsProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0]);
  const [failed, setFailed] = useState(false);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Progress: 0–100 across all steps
  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  useEffect(() => {
    function advanceStep() {
      setCurrentStep((s) => {
        const next = s < STEPS.length - 1 ? s + 1 : s;
        if (next !== s) {
          setVisibleSteps((prev) => (prev.includes(next) ? prev : [...prev, next]));
          stepTimerRef.current = setTimeout(advanceStep, STEP_DURATION_MS);
        }
        return next;
      });
    }

    async function poll() {
      try {
        const res = await fetch(`/api/protocols/status?protocolId=${protocolId}`);
        if (!res.ok) return;
        const { status } = await res.json();
        if (status === "ready") { router.refresh(); return; }
        if (status === "failed") { setFailed(true); return; }
      } catch { /* keep polling */ }
      pollTimerRef.current = setTimeout(poll, 3_000);
    }

    stepTimerRef.current = setTimeout(advanceStep, STEP_DURATION_MS);
    pollTimerRef.current = setTimeout(poll, 3_000);

    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [protocolId, router]);

  // ── Failed state ──────────────────────────────────────────────────────────
  if (failed) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: "var(--bz-midnight)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-4"
        >
          <XCircle className="w-10 h-10 mx-auto" style={{ color: "var(--bz-critical)" }} />
          <p className="text-lg font-semibold" style={{ color: "var(--bz-white)" }}>
            Protocol generation failed
          </p>
          <p className="text-sm" style={{ color: "var(--bz-muted)" }}>
            Something went wrong. Please try again.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/app/onboarding/dial")}
            className="border-bz-border"
          >
            Try again
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Cinematic loading screen ──────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-grid-subtle"
      style={{ background: "var(--bz-midnight)" }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(0,138,255,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-6">
        {/* Pulsing logo */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ color: "var(--bz-blue)" }}
        >
          <BZLogo size={48} variant="mark" />
        </motion.div>

        {/* Headline */}
        <div className="text-center space-y-1">
          <h2
            className="text-2xl font-light tracking-wide"
            style={{
              color: "var(--bz-white)",
              fontFamily: "var(--font-serif)",
            }}
          >
            Building your{" "}
            <FlickerWord word="Personal" />{" "}
            protocol
          </h2>
          <p className="text-sm" style={{ color: "var(--bz-muted)" }}>
            This usually takes 30–60 seconds
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-0.5 rounded-full overflow-hidden"
          style={{ background: "var(--bz-navy-light)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, var(--bz-blue) 0%, var(--bz-gold) 100%)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Step list */}
        <div className="w-full space-y-3">
          <AnimatePresence initial={false}>
            {STEPS.map((step, i) => {
              const isVisible = visibleSteps.includes(i);
              const isDone = i < currentStep;
              const isActive = i === currentStep;

              if (!isVisible) return null;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3"
                >
                  {/* Status dot */}
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
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--bz-blue)" }}
                      />
                    ) : (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "var(--bz-navy-light)" }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className="text-xs tracking-wide"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: isDone
                        ? "var(--bz-optimal)"
                        : isActive
                        ? "var(--bz-white)"
                        : "var(--bz-muted)",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {isDone ? "✓ " : isActive ? "→ " : "  "}
                    {step}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
