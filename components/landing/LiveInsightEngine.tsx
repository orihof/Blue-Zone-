/// components/landing/LiveInsightEngine.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { EASE_OUT_EXPO } from "@/lib/animations";
import { InsightForm } from "./InsightForm";
import type { InsightFormData } from "./InsightForm";
import { InsightResult } from "./InsightResult";
import type { InsightResultData } from "./InsightResult";

type ViewState = "form" | "loading" | "result" | "error";

const LOADING_STEPS = [
  "Reading your signals...",
  "Applying athletic reference ranges...",
  "Identifying cross-signal patterns...",
  "Generating your protocol...",
];

const transition = { duration: 0.4, ease: EASE_OUT_EXPO };

function LoadingState() {
  const [step, setStep] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    interval.current = setInterval(() => {
      setStep((s) => (s + 1 < LOADING_STEPS.length ? s + 1 : s));
    }, 1800);
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  return (
    <div style={{ maxWidth: 384, margin: "0 auto", paddingTop: 64, paddingBottom: 64, textAlign: "center" }}>
      {/* Pulse node */}
      <motion.div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "1px solid rgba(99,102,241,0.3)",
          margin: "0 auto 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 32px rgba(99,102,241,0.2)",
        }}
        animate={{
          scale: [1, 1.08, 1],
          borderColor: [
            "rgba(99,102,241,0.3)",
            "rgba(99,102,241,0.7)",
            "rgba(99,102,241,0.3)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "var(--ion-blue)",
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Current step text */}
      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "var(--font-ui,'Inter',sans-serif)",
        }}
      >
        {LOADING_STEPS[step]}
      </p>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor:
                i < step
                  ? "var(--ion-blue)"
                  : i === step
                    ? "rgba(99,102,241,0.5)"
                    : "rgba(255,255,255,0.1)",
              animation: i === step ? "pulse 1.5s ease-in-out infinite" : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function LiveInsightEngine() {
  const sectionRef = useRef<HTMLElement>(null);
  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<InsightResultData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (data: InsightFormData) => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setViewState("loading");

    try {
      const response = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.status === 429) {
        setErrorMessage(
          "You've used your 3 free analyses for this hour. " +
          "Apply for full access to unlock unlimited protocols."
        );
        setViewState("error");
        return;
      }

      if (!response.ok) {
        throw new Error("API error");
      }

      const json = await response.json();

      if (json.error) {
        throw new Error(json.error);
      }

      setResult(json as InsightResultData);
      setViewState("result");
    } catch {
      setErrorMessage("Analysis unavailable right now. Please try again.");
      setViewState("error");
    }
  };

  const handleReset = () => {
    setResult(null);
    setErrorMessage("");
    setViewState("form");
  };

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 relative overflow-hidden scroll-mt-20"
      style={{
        background: `
          radial-gradient(
            ellipse 50% 60% at 50% 100%,
            rgba(99,102,241,0.07) 0%,
            transparent 70%
          ),
          #0A0A0F
        `,
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(99,102,241,0.5)",
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          TRY IT NOW
        </p>
        <h2
          style={{
            fontFamily: "var(--font-serif,'Syne',sans-serif)",
            fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Enter your numbers. See what Blue Zone finds.
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          Real analysis on your actual data. Takes 45 seconds.
        </p>

        {/* Content area with transitions */}
        <AnimatePresence mode="wait">
          {viewState === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transition}
            >
              <InsightForm onSubmit={handleSubmit} isLoading={false} />
            </motion.div>
          )}

          {viewState === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transition}
            >
              <LoadingState />
            </motion.div>
          )}

          {viewState === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transition}
            >
              <InsightResult result={result} onReset={handleReset} />
            </motion.div>
          )}

          {viewState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transition}
            >
              <div style={{ maxWidth: 384, margin: "0 auto", paddingTop: 48, paddingBottom: 48, textAlign: "center" }}>
                <AlertCircle size={24} style={{ color: "#fb923c", margin: "0 auto 16px" }} />
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    marginBottom: 8,
                    fontFamily: "var(--font-ui,'Inter',sans-serif)",
                  }}
                >
                  Analysis unavailable
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-ui,'Inter',sans-serif)",
                    marginBottom: 24,
                  }}
                >
                  {errorMessage || "Something went wrong. Please try again."}
                </p>
                <button
                  type="button"
                  onClick={() => setViewState("form")}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.6)",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    fontFamily: "var(--font-ui,'Inter',sans-serif)",
                    transition: "all 200ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                  }}
                >
                  Try again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
