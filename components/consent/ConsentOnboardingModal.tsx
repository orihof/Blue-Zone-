/// components/consent/ConsentOnboardingModal.tsx
"use client";

import { useState } from "react";
import { useConsentOnboarding } from "@/hooks/useConsentOnboarding";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onComplete?: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        on ? "bg-[#00E5A0]" : "bg-white/10"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────

const TIER2_BULLETS = [
  "Your identity is never attached to research data",
  "Opt out anytime — your data is removed within 24 hours",
  "Earn 500 credits toward premium protocol features",
] as const;

const TIER3_BULLETS = [
  "You choose each partner — no blanket approvals",
  "Full data transparency before you agree to anything",
  "Unlock member-only offers: lab discounts, gear upgrades, and more",
] as const;

const DATA_TABLE_ROWS = [
  ["Age range (not DOB)",    "Your name"],
  ["Sport type",             "Email or contact info"],
  ["Biomarker trends",       "Exact lab values"],
  ["Protocol category",      "Your location"],
  ["Training load range",    "Device identifiers"],
  ["Outcome changes",        "Financial information"],
] as const;

// ── Main component ────────────────────────────────────────────────────────────

export function ConsentOnboardingModal({ onComplete }: Props) {
  const { selections, isSubmitting, error, toggleTier2, toggleTier3, submitConsent } =
    useConsentOnboarding();
  const [tableOpen, setTableOpen] = useState(false);

  async function handleContinue() {
    const result = await submitConsent();
    if (result.success) onComplete?.();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#06090D]">
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-3">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-semibold leading-snug text-white">
              Your data, your terms
            </h1>
            <p className="text-sm text-white/40">
              Nothing is shared without your explicit choice. You can change this at any time.
            </p>
          </div>

          {/* ── Section 1: Service Data (always on) ──────────────────────── */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden>🔒</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Service Data</span>
                  <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
                    Required
                  </span>
                </div>
                <p className="mb-1 text-sm text-white/50">
                  Used to power your protocols. Never shared. Required.
                </p>
                <p className="text-xs text-white/30">
                  Wearables, bloodwork analysis, protocol generation
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 2: Longevity Research (toggle) ────────────────────── */}
          <div
            className={`rounded-2xl border p-5 transition-colors duration-200 ${
              selections.tier2_research
                ? "border-[#7EB8F7]/25 bg-[#7EB8F7]/[0.04]"
                : "border-white/[0.08] bg-white/[0.03]"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden>🔬</span>
              <div className="min-w-0 flex-1">

                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">Longevity Research</span>
                  <Toggle on={selections.tier2_research} onToggle={toggleTier2} />
                </div>

                <ul className="mb-4 space-y-2">
                  {TIER2_BULLETS.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="mt-0.5 shrink-0 text-[#00E5A0]">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>

                {/* Expandable data table */}
                <button
                  type="button"
                  onClick={() => setTableOpen((v) => !v)}
                  className="text-xs text-[#7EB8F7] transition-opacity hover:opacity-70"
                >
                  {tableOpen ? "Hide details ↑" : "Learn exactly what's shared →"}
                </button>

                {tableOpen && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
                    {/* Table header */}
                    <div className="grid grid-cols-2 bg-white/[0.05]">
                      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                        What we share
                      </div>
                      <div className="border-l border-white/[0.07] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                        What we never share
                      </div>
                    </div>

                    {/* Table rows */}
                    {DATA_TABLE_ROWS.map(([share, never], i) => (
                      <div
                        key={share}
                        className={`grid grid-cols-2 border-t border-white/[0.05] ${
                          i % 2 === 0 ? "bg-white/[0.02]" : ""
                        }`}
                      >
                        <div className="px-3 py-2 text-xs text-white/60">{share}</div>
                        <div className="border-l border-white/[0.05] px-3 py-2 text-xs text-white/40">
                          {never}
                        </div>
                      </div>
                    ))}

                    {/* Table footer */}
                    <div className="border-t border-white/[0.07] px-3 py-3 text-[11px] leading-relaxed text-white/30">
                      Data is processed through HIPAA Safe Harbor de-identification before any
                      research use.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 3: Partner Benefits (toggle) ─────────────────────── */}
          <div
            className={`rounded-2xl border p-5 transition-colors duration-200 ${
              selections.tier3_commercial
                ? "border-[#7EB8F7]/25 bg-[#7EB8F7]/[0.04]"
                : "border-white/[0.08] bg-white/[0.03]"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-2xl" aria-hidden>🤝</span>
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">Partner Benefits</span>
                  <Toggle on={selections.tier3_commercial} onToggle={toggleTier3} />
                </div>
                <ul className="space-y-2">
                  {TIER3_BULLETS.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="mt-0.5 shrink-0 text-[#00E5A0]">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div className="pt-2 pb-4">
            {error && (
              <p className="mb-3 text-center text-sm text-red-400">{error}</p>
            )}
            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#7EB8F7] py-3.5 text-sm font-semibold text-[#06090D] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save my preferences →"}
            </button>
            <p className="mt-3 text-center text-xs text-white/30">
              You can change these anytime in Settings
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
