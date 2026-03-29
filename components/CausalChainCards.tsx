/// components/CausalChainCards.tsx
"use client";

import { motion } from "framer-motion";
import { FileText, Microscope, ClipboardList, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fadeUp, staggerContainerSlow, EASE_OUT_EXPO } from "@/lib/animations";

const T = { text: "#F1F5F9", muted: "#64748B" };

const CARDS: { n: string; icon: LucideIcon; title: string; desc: string }[] = [
  {
    n: "01",
    icon: FileText,
    title: "Bring all your data",
    desc: "Upload your blood panel from any lab \u2014 InsideTracker, Function Health, LabCorp, Quest, or a PDF from your doctor. Connect WHOOP, Oura, Garmin, or Apple Health. Add your training log.",
  },
  {
    n: "02",
    icon: Microscope,
    title: "We find the root cause",
    desc: "Blue Zone reads your biomarkers and your training load together. Not separately. We identify what\u2019s blocking your adaptation \u2014 the biological root cause your other tools can\u2019t see because they only have half the picture.",
  },
  {
    n: "03",
    icon: ClipboardList,
    title: "You get a precise protocol",
    desc: "Not a dashboard. Not a list of out-of-range markers. A specific, sequenced intervention plan \u2014 training modifications, supplementation timing, recovery changes \u2014 with a clear explanation of why each step is there and what you should see change first.",
  },
  {
    n: "04",
    icon: RefreshCw,
    title: "It adapts as you do",
    desc: "Every blood retest shows you exactly what moved, why it moved, and what to adjust next. Your protocol evolves with your biology \u2014 not against it. Every blood retest recalibrates your protocol with new inputs \u2014 the 12\u2011week version is built on completely different data than day one.",
  },
];

function CardContent({ card }: { card: (typeof CARDS)[number] }) {
  const Icon = card.icon;
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: ".1em", color: "rgba(99,102,241,.5)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", marginBottom: 12 }}>{card.n}</div>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(0,138,255,0.15)" }} aria-hidden="true">
        <Icon className="w-5 h-5 text-[--ion-blue]" strokeWidth={1.5} />
      </div>
      <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 16, color: T.text, marginBottom: 8 }}>{card.title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65 }}>{card.desc}</div>
    </>
  );
}

function Connector() {
  return (
    <div
      className="hidden md:flex"
      style={{ width: 40, flexShrink: 0, alignItems: "center", justifyContent: "center", paddingTop: 60 }}
    >
      <div style={{ width: "100%", height: 1, backgroundColor: "rgba(99, 102, 241, 0.4)" }} />
    </div>
  );
}

export function CausalChainCards() {
  return (
    <>
      {/* Desktop: flexbox row with connectors */}
      <motion.div
        className="hidden md:flex"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainerSlow}
        style={{ flexDirection: "row", alignItems: "stretch", gap: 0, width: "100%" }}
      >
        {CARDS.map((card, i) => (
          <motion.div
            key={card.n}
            variants={fadeUp}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            style={{ flex: 1, display: "flex", flexDirection: "row", alignItems: "stretch" }}
          >
            {i > 0 && <Connector />}
            <div className="card" style={{ padding: 24, flex: 1 }}>
              <CardContent card={card} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Mobile: vertical stack — all 4 cards visible */}
      <motion.div
        className="flex flex-col gap-4 md:hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={staggerContainerSlow}
      >
        {CARDS.map((card) => (
          <motion.div
            key={card.n}
            variants={fadeUp}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <div className="card" style={{ padding: 24 }}>
              <CardContent card={card} />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
