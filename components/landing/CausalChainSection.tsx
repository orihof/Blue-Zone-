/// components/landing/CausalChainSection.tsx
"use client";

import { motion } from "framer-motion";

const CHAINS: {
  label: string;
  signals: { name: string; status: string; color: "orange" | "blue" | "neutral" }[];
  conclusion: string;
  protocol: string;
}[] = [
  {
    label: "IRON + TRAINING",
    signals: [
      { name: "Ferritin 62 ng/mL", status: "Low", color: "orange" },
      { name: "Training load ↑ High", status: "This week", color: "blue" },
      { name: "HRV suppressed", status: "4-day trend", color: "orange" },
    ],
    conclusion: "Iron depletion under oxidative stress — not overtraining",
    protocol: "Iron bisglycinate 25mg · Away from training window",
  },
  {
    label: "THYROID + RECOVERY",
    signals: [
      { name: "TSH 2.8 mIU/L", status: "In range", color: "neutral" },
      { name: "Free T3 low-normal", status: "Bottom quartile", color: "orange" },
      { name: "Sleep quality ↓", status: "3 consecutive weeks", color: "orange" },
    ],
    conclusion: "Subclinical T3 suppression — invisible on standard panel review",
    protocol: "Selenium 200mcg · Iodine audit · Retest in 6 weeks",
  },
  {
    label: "CORTISOL + ADAPTATION",
    signals: [
      { name: "Resting HR elevated", status: "+8 BPM baseline", color: "orange" },
      { name: "hs-CRP 1.4 mg/L", status: "Borderline", color: "orange" },
      { name: "Weekly volume ↑ 30%", status: "Ramp rate too fast", color: "blue" },
    ],
    conclusion: "Training-induced inflammatory load blocking adaptation",
    protocol: "Volume reduction 20% · Omega-3 2g · Retest in 3 weeks",
  },
];

const BADGE_STYLES: Record<"orange" | "blue" | "neutral", { bg: string; text: string }> = {
  orange: { bg: "rgba(249,115,22,0.1)", text: "#FB923C" },
  blue: { bg: "rgba(0,138,255,0.1)", text: "var(--ion-blue)" },
  neutral: { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.4)" },
};

export function CausalChainSection() {
  return (
    <div style={{ background: "#0A0A0F", padding: "96px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
        {/* Label */}
        <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 16 }}>
          FOR EXAMPLE
        </div>
        {/* Headline */}
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 700, fontSize: "clamp(26px,4vw,40px)", color: "#FFFFFF", lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 16 }}>
          One signal never tells the whole story.
        </h2>
        {/* Subhead */}
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 64 }}>
          Here&apos;s what Blue Zone catches that your other tools can&apos;t see.
        </p>
        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ maxWidth: 1120, margin: "0 auto" }}>
          {CHAINS.map((chain, i) => (
            <motion.div
              key={chain.label}
              className="hover:border-[rgba(0,138,255,0.3)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              style={{
                background: "#111118",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 24,
                textAlign: "left",
                transition: "border-color 200ms",
              }}
            >
              {/* Label pill */}
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, marginBottom: 16 }}>
                {chain.label}
              </div>
              {/* Signal rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {chain.signals.map((s) => {
                  const badge = BADGE_STYLES[s.color];
                  return (
                    <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{s.name}</span>
                      <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 100, background: badge.bg, color: badge.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 8 }}>{s.status}</span>
                    </div>
                  );
                })}
              </div>
              {/* Divider */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", margin: "16px 0" }} />
              {/* Root cause */}
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--ion-blue)", opacity: 0.6, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, marginBottom: 8 }}>
                ROOT CAUSE
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.45, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
                {chain.conclusion}
              </p>
              {/* Protocol line */}
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", lineHeight: 1.5, margin: 0 }}>
                <span style={{ color: "var(--ion-blue)", marginRight: 6 }}>→</span>
                {chain.protocol}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
