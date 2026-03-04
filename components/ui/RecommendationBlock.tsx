/// components/ui/RecommendationBlock.tsx
// Explainable intelligence unit — the most important component.
// Based on RecItem from lib/db/payload.ts.
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical, Activity, Search, Leaf, ShieldAlert,
  CheckCircle2, BookOpen, BarChart2, AlertTriangle,
} from "lucide-react";
import { EASE_BZ, PRIORITY_BG, PRIORITY_BORDER, PRIORITY_COLOR, C, GLASS } from "./tokens";
import type { Priority } from "./tokens";
import type { RecItem } from "@/lib/db/payload";

// ── Category → Priority mapping (derived from position/category) ───────────
const CATEGORY_PRIORITY: Record<RecItem["category"], Priority> = {
  supplement: "high",
  nutrition:  "medium",
  home:       "low",
};

const CATEGORY_LABEL: Record<RecItem["category"], string> = {
  supplement: "Supplement",
  nutrition:  "Nutrition",
  home:       "Lifestyle",
};

const CATEGORY_ICON: Record<RecItem["category"], React.ReactNode> = {
  supplement: <FlaskConical className="w-3 h-3" />,
  nutrition:  <Leaf className="w-3 h-3" />,
  home:       <Activity className="w-3 h-3" />,
};

// ── Priority left border ───────────────────────────────────────────────────

function PriorityBorder({ priority }: { priority: Priority }) {
  return (
    <div
      className="absolute left-0 top-5 bottom-5 w-1 rounded-full"
      style={{
        background: priority === "high" ? "var(--gradient-aurora)" : PRIORITY_COLOR[priority],
        boxShadow: priority === "high"
          ? "0 0 12px rgba(91,33,255,0.8), 0 0 24px rgba(0,138,255,0.4)"
          : `0 0 8px ${PRIORITY_COLOR[priority]}60`,
      }}
    />
  );
}

// ── Section block ──────────────────────────────────────────────────────────

interface SectionBlockProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function SectionBlock({ icon, label, children }: SectionBlockProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: C.ionBlue }}>{icon}</span>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: C.ionBlue, fontFamily: "var(--font-ui, var(--font-sans))" }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: C.dust, fontFamily: "var(--font-ui, var(--font-sans))" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── "Mark Adopted" button with fill animation ─────────────────────────────

function AdoptButton({ onAdopt }: { onAdopt: () => void }) {
  const [adopted, setAdopted] = useState(false);

  function handle() {
    setAdopted(true);
    onAdopt();
  }

  return (
    <motion.button
      onClick={handle}
      disabled={adopted}
      className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
      style={{
        borderColor: adopted ? C.biolum : PRIORITY_BORDER["low"],
        color: adopted ? C.biolum : C.cerulean,
        background: "transparent",
        fontFamily: "var(--font-ui, var(--font-sans))",
      }}
      whileTap={{ scale: 0.97 }}
    >
      {adopted && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: EASE_BZ }}
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,255,179,0.10)",
            transformOrigin: "left",
          }}
        />
      )}
      <motion.span
        animate={adopted ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3 }}
        className="relative z-10"
      >
        {adopted ? <CheckCircle2 className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3 opacity-60" />}
      </motion.span>
      <span className="relative z-10">{adopted ? "Adopted" : "Mark Adopted"}</span>
    </motion.button>
  );
}

// ── SAFE_AVOID_PHRASES ─────────────────────────────────────────────────────

const SAFE_AVOID = new Set([
  "None established — low risk profile",
  "None established at typical doses",
  "No contraindications at dietary doses",
  "No known contraindications at dietary doses",
  "No contraindications",
  "Avocado allergy",
]);

// ── Main component ─────────────────────────────────────────────────────────

interface RecommendationBlockProps {
  item: RecItem;
  protocolId: string;
  priority?: Priority;
  index?: number;
  onViewProducts?: (query: string) => void;
}

export function RecommendationBlock({
  item,
  priority: priorityProp,
  index = 0,
}: RecommendationBlockProps) {
  const priority = priorityProp ?? CATEGORY_PRIORITY[item.category];
  const avoidNote = item.whenToAvoid.find((w) => !SAFE_AVOID.has(w));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_BZ, delay: index * 0.05 }}
      className="relative rounded-2xl overflow-hidden"
      style={{ ...GLASS.base, paddingLeft: 28 /* room for border */ }}
    >
      {/* Aurora left border */}
      <PriorityBorder priority={priority} />

      <div className="p-8 pl-6 space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority badge */}
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium border uppercase tracking-wide"
              style={{
                background:   PRIORITY_BG[priority],
                borderColor:  PRIORITY_BORDER[priority],
                color:        PRIORITY_COLOR[priority],
                fontFamily:   "var(--font-mono)",
              }}
            >
              {priority}
            </span>
            {/* Category badge */}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border"
              style={{
                background:  "rgba(0,138,255,0.08)",
                borderColor: "rgba(0,138,255,0.25)",
                color:       C.cerulean,
              }}
            >
              {CATEGORY_ICON[item.category]}
              {CATEGORY_LABEL[item.category]}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className="font-light leading-snug"
          style={{
            fontSize: 22,
            color: C.stellar,
            fontFamily: "var(--font-serif)",
          }}
        >
          {item.title}
        </h3>

        {/* Rationale */}
        <SectionBlock icon={<BookOpen className="w-3.5 h-3.5" />} label="Why this works">
          <ul className="space-y-1.5">
            {item.rationaleBullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: C.ionBlue, flexShrink: 0 }}>·</span>
                {b}
              </li>
            ))}
          </ul>
        </SectionBlock>

        <hr className="sep-aurora" />

        {/* How to use */}
        <SectionBlock icon={<Search className="w-3.5 h-3.5" />} label="How to use">
          {item.howToUse}
        </SectionBlock>

        {/* What to track */}
        {item.whatToTrack.length > 0 && (
          <>
            <hr className="sep-aurora" />
            <SectionBlock icon={<BarChart2 className="w-3.5 h-3.5" />} label="Track">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {item.whatToTrack.map((t, i) => (
                  <span key={i} className="chip-biomarker">{t}</span>
                ))}
              </div>
            </SectionBlock>
          </>
        )}

        {/* When to avoid */}
        {avoidNote && (
          <>
            <hr className="sep-aurora" />
            <SectionBlock icon={<AlertTriangle className="w-3.5 h-3.5" />} label="When to avoid">
              {avoidNote}
            </SectionBlock>
          </>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                style={{
                  background:  "rgba(255,255,255,0.04)",
                  border:      "1px solid rgba(255,255,255,0.08)",
                  color:        C.nebula,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          {/* Buy links */}
          {item.links.iherb && (
            <a
              href={item.links.iherb}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors"
              style={{
                borderColor: "rgba(0,138,255,0.30)",
                color: C.cerulean,
                fontFamily: "var(--font-ui, var(--font-sans))",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.ionBlue;
                e.currentTarget.style.background = "rgba(0,138,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,138,255,0.30)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              View on iHerb →
            </a>
          )}
          {item.links.amazon && (
            <a
              href={item.links.amazon}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors"
              style={{
                borderColor: "rgba(0,138,255,0.30)",
                color: C.cerulean,
                fontFamily: "var(--font-ui, var(--font-sans))",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.ionBlue;
                e.currentTarget.style.background = "rgba(0,138,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,138,255,0.30)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              View on Amazon →
            </a>
          )}

          <AdoptButton onAdopt={() => {}} />

          {/* Disclaimer */}
          <div className="flex items-start gap-1.5 ml-auto">
            <ShieldAlert className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: C.goldOld }} />
            <span className="text-[10px]" style={{ color: C.nebula }}>
              Educational only. Consult your clinician.
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Clinic variant ─────────────────────────────────────────────────────────

import type { ClinicItem } from "@/lib/db/payload";
import { Globe, Calendar, ExternalLink } from "lucide-react";

export function ClinicBlock({ item, index = 0 }: { item: ClinicItem; index?: number }) {
  const linkUrl = item.bookingUrl ?? item.website;
  const linkLabel = item.bookingUrl ? "Book appointment" : "Visit website";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_BZ, delay: index * 0.05 }}
      className="relative rounded-2xl overflow-hidden"
      style={{ ...GLASS.base, paddingLeft: 28 }}
    >
      <div
        className="absolute left-0 top-5 bottom-5 w-1 rounded-full"
        style={{ background: "var(--gradient-aurora)" }}
      />

      <div className="p-8 pl-6 space-y-3">
        <h3
          className="font-light leading-snug"
          style={{ fontSize: 20, color: C.stellar, fontFamily: "var(--font-serif)" }}
        >
          {item.name}
        </h3>
        <p className="text-xs" style={{ color: C.dust }}>
          {item.specialty.join(" · ")} · {item.city}
        </p>

        {item.whyRelevant.length > 0 && (
          <ul className="space-y-1">
            {item.whyRelevant.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: C.dust }}>
                <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: C.biolum }} />
                {r}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3 pt-1">
          {item.placeId && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}&query_place_id=${item.placeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs"
              style={{ color: C.dust }}
            >
              <Globe className="w-3 h-3" /> Maps
            </a>
          )}
          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5"
              style={{
                borderColor: "rgba(0,138,255,0.30)",
                color: C.cerulean,
              }}
            >
              {item.bookingUrl ? <Calendar className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
              {linkLabel}
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
