/// components/InsightCard.tsx
"use client";

import { motion } from "framer-motion";

export function InsightCard() {
  return (
    <div className="card-glow-ring">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        style={{
          width: 272,
          padding: 16,
          background: "#111827",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 20,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(99,102,241,0.08)",
        }}
      >
        {/* Section 1: Data rows */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Ferritin</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, color: "#F1F5F9", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 400 }}>62 ng/mL</span>
            <span style={{ fontSize: 14, color: "#E08A40", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 400 }}>↓ Low</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Training load</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, color: "#F1F5F9", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 400 }}>↑ High</span>
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>this week</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(99,102,241,0.12)", marginBottom: 12 }} />

        {/* Section 2: Insight */}
        <motion.div
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".1em", color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" as const, marginBottom: 6 }}
        >
          ROOT CAUSE
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{ fontSize: 13, color: "#F1F5F9", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.6, marginBottom: 10 }}
        >
          Iron depletion under oxidative training stress
        </motion.div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 2.1 }}
          style={{
            display: "inline-block",
            fontSize: 11,
            color: "#E0E7FF",
            background: "rgba(99,102,241,0.18)",
            padding: "3px 10px",
            borderRadius: 100,
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            fontWeight: 400,
          }}
        >
          Protocol generated
        </motion.span>
      </motion.div>
    </div>
  );
}
