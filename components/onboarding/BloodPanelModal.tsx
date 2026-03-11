// components/onboarding/BloodPanelModal.tsx
"use client";

import { useState, useCallback } from "react";
import { X, ChevronDown, Download, Zap, Heart, Activity, Droplets, Pill, Filter } from "lucide-react";

interface BloodCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  keyCount: number;
  markerCount?: number;
  description?: string;
  priority: "critical" | "key" | "standard";
}

interface BloodPanelModalProps {
  eventName?: string;
  onDownload: () => void;
  onContinue: () => void;
  onSkip: () => void;
  onClose: () => void;
}

const BLOOD_CATEGORIES: BloodCategory[] = [
  {
    id: "metabolic",
    label: "Metabolic Health",
    icon: <Zap className="w-4 h-4 text-yellow-400" />,
    keyCount: 4,
    markerCount: 8,
    description: "Glucose regulation and insulin sensitivity markers critical for endurance output.",
    priority: "critical",
  },
  {
    id: "cardiovascular",
    label: "Cardiovascular Risk",
    icon: <Heart className="w-4 h-4 text-red-400" />,
    keyCount: 2,
    markerCount: 5,
    description: "Lipid panel and inflammatory markers that predict cardiac load under race conditions.",
    priority: "critical",
  },
  {
    id: "hormonal",
    label: "Hormonal Health",
    icon: <Activity className="w-4 h-4 text-purple-400" />,
    keyCount: 1,
    markerCount: 3,
    description: "Cortisol and testosterone ratios affecting recovery capacity and training adaptation.",
    priority: "key",
  },
  {
    id: "micronutrients",
    label: "Micronutrients",
    icon: <Droplets className="w-4 h-4 text-orange-400" />,
    keyCount: 3,
    markerCount: 6,
    description: "Vitamins and minerals that fuel cellular function.",
    priority: "key",
  },
  {
    id: "thyroid",
    label: "Thyroid Function",
    icon: <Filter className="w-4 h-4 text-cyan-400" />,
    keyCount: 1,
    markerCount: 2,
    description: "TSH and T4 regulation affecting energy metabolism and body composition.",
    priority: "key",
  },
  {
    id: "kidney-liver",
    label: "Kidney & Liver",
    icon: <Pill className="w-4 h-4 text-green-400" />,
    keyCount: 2,
    markerCount: 4,
    description: "Organ function markers to ensure safe supplementation and detox capacity.",
    priority: "standard",
  },
];

const PRIORITY_LABEL: Record<BloodCategory["priority"], string> = {
  critical: "critical",
  key: "key",
  standard: "standard",
};

const PRIORITY_BADGE_CLASS: Record<BloodCategory["priority"], string> = {
  critical: "bg-red-500/20 text-red-400 border border-red-500/30",
  key: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  standard: "bg-white/10 text-white/50 border border-white/10",
};

export function BloodPanelModal({
  eventName = "your upcoming event",
  onDownload,
  onContinue,
  onSkip,
  onClose,
}: BloodPanelModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blood-panel-modal-title"
    >
      <div className="relative w-full sm:max-w-[480px] flex flex-col bg-[#0F0F18] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] sm:max-h-[85vh]">

        {/* ── HEADER ── */}
        <div className="flex-shrink-0 flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <div>
            <h2
              id="blood-panel-modal-title"
              className="font-sans text-base font-semibold text-white leading-snug"
            >
              Recommended Blood Panel
            </h2>
            <p className="mt-0.5 text-xs text-white/50 font-sans leading-relaxed">
              Optimised for{" "}
              <span className="text-blue-400 font-medium">{eventName}</span>
              {" "}— {BLOOD_CATEGORIES.reduce((a, c) => a + (c.markerCount ?? 0), 0)} markers across{" "}
              {BLOOD_CATEGORIES.length} categories
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close blood panel modal"
            className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── SCROLLABLE BODY with bottom fade ── */}
        <div className="relative flex-1 overflow-hidden">
          <div className="overflow-y-auto h-full px-3 py-3 space-y-1.5 scroll-smooth"
            style={{ maxHeight: "calc(92dvh - 220px)" }}
          >
            {BLOOD_CATEGORIES.map((cat) => {
              const isOpen = expandedId === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`rounded-xl border transition-all duration-200 ${
                    isOpen
                      ? "bg-white/[0.05] border-white/[0.12]"
                      : "bg-white/[0.03] border-white/[0.07] hover:border-white/[0.10]"
                  }`}
                >
                  <button
                    onClick={() => toggle(cat.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                      {cat.icon}
                    </span>

                    <span className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-white truncate font-sans">
                        {cat.label}
                      </span>
                      <span
                        className={`flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide ${
                          PRIORITY_BADGE_CLASS[cat.priority]
                        }`}
                      >
                        {cat.keyCount} {PRIORITY_LABEL[cat.priority]}
                      </span>
                    </span>

                    <ChevronDown
                      className={`flex-shrink-0 w-4 h-4 text-white/30 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Expanded content */}
                  {isOpen && cat.description && (
                    <div className="px-4 pb-3 pt-0">
                      <div className="h-px bg-white/[0.06] mb-3" />
                      <p className="text-xs text-white/50 font-sans leading-relaxed">
                        {cat.description}
                      </p>
                      <p className="mt-2 text-xs font-mono text-white/30 tabular-nums">
                        {cat.markerCount} markers included
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scroll fade gradient */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0F0F18] to-transparent" />
        </div>

        {/* ── STICKY FOOTER ── */}
        <div className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-white/[0.07] space-y-2">
          {/* Primary CTA */}
          <button
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white
              bg-gradient-to-r from-blue-500 to-violet-500
              hover:from-blue-400 hover:to-violet-400
              active:scale-[0.98] transition-all duration-150 shadow-lg shadow-blue-500/20"
          >
            <Download className="w-4 h-4" />
            Download Recommended Blood Panel
          </button>

          {/* Secondary CTA — ghost */}
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              text-sm font-medium text-white/60
              border border-white/[0.10] bg-transparent
              hover:border-white/20 hover:text-white/80
              active:scale-[0.98] transition-all duration-150"
          >
            Continue and add data later →
          </button>

          {/* Tertiary skip — text link only */}
          <div className="text-center">
            <button
              onClick={onSkip}
              className="text-xs text-white/30 hover:text-white/50 underline underline-offset-2 transition-colors"
            >
              Skip for now
            </button>
          </div>

          <p className="text-center text-[11px] text-white/25 font-sans leading-relaxed">
            Your protocol updates automatically as markers are added.
          </p>
        </div>
      </div>
    </div>
  );
}
