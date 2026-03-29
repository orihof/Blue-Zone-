/// components/InsightCard.tsx
"use client";

import { motion } from "framer-motion";
import { GitMerge } from "lucide-react";

export function InsightCard() {
  return (
    <div style={{ position: "relative" }}>
      {/* Atmospheric glow — desktop only */}
      <div
        className="absolute inset-0 -z-10 opacity-0 md:opacity-100 aurora-pulse"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,138,255,0.12) 0%, transparent 68%)",
          transform: "scale(1.3)",
          borderRadius: 20,
        }}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
      >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="md:min-w-[420px] md:max-w-[480px] md:p-7"
        style={{
          padding: 16,
          background: "#111827",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 20,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(99,102,241,0.08)",
        }}
      >
        {/* ZONE 1 — Input rows */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontFamily: "var(--font-ui, Inter, sans-serif)" }}>Ferritin</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono, JetBrains Mono, monospace)", fontWeight: 500, color: "#FB923C" }}>62 ng/mL ↓ Low</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontFamily: "var(--font-ui, Inter, sans-serif)" }}>Training load</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono, JetBrains Mono, monospace)", fontWeight: 500, color: "rgba(255,255,255,0.70)" }}>↑ High this week</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, paddingBottom: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", fontFamily: "var(--font-ui, Inter, sans-serif)" }}>Sleep quality</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono, JetBrains Mono, monospace)", fontWeight: 500, color: "#FB923C" }}>↓ Low · 3 nights</span>
        </div>

        {/* ZONE 2 — Separator */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", marginTop: 16, marginBottom: 16 }}>
          <div style={{ height: 1, width: "100%", background: "linear-gradient(90deg, transparent 0%, var(--ion-blue) 50%, transparent 100%)", opacity: 0.6 }} />
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 6, height: 6, background: "var(--ion-blue)", zIndex: 1 }} aria-hidden="true" />
        </div>

        {/* ZONE 3 — Output */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.40)", fontFamily: "var(--font-ui, Inter, sans-serif)", margin: 0 }}>
            YOUR PROTOCOL
          </p>
          <p style={{ fontSize: 12, fontStyle: "italic", color: "rgba(255,255,255,0.40)", fontFamily: "var(--font-ui, Inter, sans-serif)", lineHeight: 1.4, marginTop: 4, marginBottom: 0 }}>
            Iron depletion under oxidative training stress
          </p>
          <p style={{ fontSize: 20, fontFamily: "var(--font-serif)", color: "#FFFFFF", lineHeight: 1.2, marginTop: 12, marginBottom: 0 }}>
            Iron bisglycinate
          </p>
          <p style={{ fontSize: 36, fontFamily: "var(--font-mono, JetBrains Mono, monospace)", fontWeight: 600, color: "var(--ion-blue)", lineHeight: 1, marginTop: 4, marginBottom: 0 }}>
            25 mg
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", fontFamily: "var(--font-ui, Inter, sans-serif)", marginTop: 8, lineHeight: 1.5, marginBottom: 0 }}>
            With Vitamin C · Away from training window
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, color: "var(--ion-blue)", opacity: 0.6, fontSize: 10, fontFamily: "var(--font-ui, Inter, sans-serif)" }}>
            <GitMerge size={10} aria-hidden="true" style={{ flexShrink: 0 }} />
            Derived from 3 signals · Personalized to your training phase
          </div>
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
}
