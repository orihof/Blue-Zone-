/// app/app/settings/privacy/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// Inline type definition — avoids importing from server-only ConsentService module
// which can cause silent client bundler failures in Next.js 14.
interface ConsentRecord {
  id:                   string;
  user_id:              string;
  tier1_service:        boolean;
  tier2_research:       boolean;
  tier2_research_types: string[];
  tier3_commercial:     boolean;
  tier3_partners:       { partnerId: string; partnerName: string; consentedAt: string }[];
  consent_version:      string;
  ip_address:           string | null;
  user_agent:           string | null;
  consent_method:       string;
  is_current:           boolean;
  created_at:           string;
  policy_version:       string;
  terms_version:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
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

// ── Confirm Modal ─────────────────────────────────────────────────────────────

interface ModalProps {
  title:       string;
  body:        string;
  warning?:    string;
  confirmText: string;
  cancelText:  string;
  loading?:    boolean;
  onConfirm:   () => void;
  onCancel:    () => void;
}

function ConfirmModal({ title, body, warning, confirmText, cancelText, loading, onConfirm, onCancel }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0D1117] p-6">
        <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
        <p className="mb-3 text-sm leading-relaxed text-white/60">{body}</p>
        {warning && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2.5">
            <p className="text-sm text-amber-400">{warning}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-500/15 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            {loading ? "Please wait…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[72px] rounded-2xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type ModalType = "tier2" | "tier3" | "delete" | null;

export default function PrivacyPage() {
  const [consent,      setConsent]      = useState<ConsentRecord | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [activeModal,  setActiveModal]  = useState<ModalType>(null);
  const [saving,       setSaving]       = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);

  // ── Fetch current consent ─────────────────────────────────────────────────
  const fetchConsent = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/consent/status");
      if (!res.ok) throw new Error("Failed to load consent preferences");
      const data = await res.json() as ConsentRecord | { consent: null };
      setConsent(
        "consent" in data && data.consent === null ? null : (data as ConsentRecord),
      );
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConsent();
  }, [fetchConsent]);

  // ── Apply consent change ──────────────────────────────────────────────────
  async function applyChange(field: "tier2_research" | "tier3_commercial", value: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/consent/record", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [field]: value, method: "settings_page" }),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      setConsent((prev) => prev ? { ...prev, [field]: value } : prev);
      toast.success("Preferences updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
      setActiveModal(null);
    }
  }

  // ── Toggle handlers ───────────────────────────────────────────────────────
  function handleTier2Toggle() {
    // turning OFF → show confirm first; turning ON → apply immediately
    if (consent?.tier2_research) {
      setActiveModal("tier2");
    } else {
      void applyChange("tier2_research", true);
    }
  }

  function handleTier3Toggle() {
    if (consent?.tier3_commercial) {
      setActiveModal("tier3");
    } else {
      void applyChange("tier3_commercial", true);
    }
  }

  // ── Data export ───────────────────────────────────────────────────────────
  async function handleDataExport() {
    try {
      await fetch("/api/user/data-export", { method: "POST" });
      toast.success("Request received — we'll email your data export within 24 hours.");
    } catch {
      toast.error("Request failed. Please try again.");
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────
  async function handleDeleteConfirm() {
    setSaving(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      window.location.href = "/";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
      setActiveModal(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-[#06090D] px-4 py-12">
        <div className="mx-auto max-w-lg space-y-8">

          {/* Header */}
          <div>
            <h1 className="mb-1 text-xl font-semibold text-white">Privacy &amp; Data</h1>
            <p className="text-sm text-white/40">Control how your data is used and access your rights.</p>
          </div>

          {/* Loading skeleton */}
          {loading && <Skeleton />}

          {/* Error state */}
          {!loading && fetchError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
              <p className="mb-2 text-sm text-red-400">{fetchError}</p>
              <button
                type="button"
                onClick={() => void fetchConsent()}
                className="text-xs text-red-400 underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !fetchError && (
            <>
              {/* ── Section 1: My Data Controls ──────────────────────────── */}
              <section>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  My Data Controls
                </p>
                <div className="space-y-2">

                  {/* Row 1 — Service Operations (always on, no toggle) */}
                  <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-sm font-medium text-white">Service Operations</span>
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">
                          Required
                        </span>
                      </div>
                      <p className="text-xs text-white/40">Wearable sync, protocol AI — Always active</p>
                    </div>
                    {/* Static locked-on indicator */}
                    <div className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#00E5A0]/25 cursor-not-allowed">
                      <span className="translate-x-6 inline-block h-4 w-4 rounded-full bg-[#00E5A0]/60" />
                    </div>
                  </div>

                  {/* Row 2 — Longevity Research */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Longevity Research</span>
                      <Toggle on={consent?.tier2_research ?? false} onToggle={handleTier2Toggle} disabled={saving} />
                    </div>
                    <p className="mb-2.5 text-xs text-white/40">
                      {consent?.created_at ? `Last updated: ${fmtDate(consent.created_at)}` : "Not yet configured"}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowHistory(true)}
                        className="text-xs text-[#7EB8F7] transition-opacity hover:opacity-70"
                      >
                        View what&apos;s been shared
                      </button>
                      <span className="text-white/20">·</span>
                      <button
                        type="button"
                        onClick={() => setActiveModal("tier2")}
                        className="text-xs text-white/40 transition-colors hover:text-white/60"
                      >
                        Withdraw from all studies
                      </button>
                    </div>
                  </div>

                  {/* Row 3 — Partner Benefits */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Partner Benefits</span>
                      <Toggle on={consent?.tier3_commercial ?? false} onToggle={handleTier3Toggle} disabled={saving} />
                    </div>
                    {consent?.created_at && (
                      <p className="text-xs text-white/40">Last updated: {fmtDate(consent.created_at)}</p>
                    )}
                  </div>

                </div>
              </section>

              {/* ── Section 2: My Data Rights ─────────────────────────────── */}
              <section>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  My Data Rights
                </p>
                <div className="space-y-2">

                  <button
                    type="button"
                    onClick={() => void handleDataExport()}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Download all my data</p>
                      <p className="text-xs text-white/40">Get a full export of your health data and protocols</p>
                    </div>
                    <span className="ml-3 text-white/30">↓</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">View my consent history</p>
                      <p className="text-xs text-white/40">Timeline of your data consent decisions</p>
                    </div>
                    <span className="ml-3 text-white/30">{showHistory ? "↑" : "→"}</span>
                  </button>

                  {/* Consent history timeline */}
                  {showHistory && (
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                      {consent ? (
                        <div className="flex items-start gap-3">
                          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00E5A0]" />
                          <div>
                            <p className="text-xs font-medium text-white/70">
                              Consent recorded — {fmtDate(consent.created_at)}
                            </p>
                            <p className="mt-0.5 text-xs text-white/40">
                              Research: {consent.tier2_research ? "opted in" : "opted out"} ·{" "}
                              Partners: {consent.tier3_commercial ? "opted in" : "opted out"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/25">
                              Method: {consent.consent_method} · Version: {consent.consent_version}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-white/40">No consent history found.</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveModal("delete")}
                    className="flex w-full items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-4 py-4 text-left transition-colors hover:bg-red-500/[0.07]"
                  >
                    <div>
                      <p className="text-sm font-medium text-red-400">Delete my account</p>
                      <p className="text-xs text-red-400/60">Permanently remove your account and all data</p>
                    </div>
                    <span className="ml-3 text-red-400/40">→</span>
                  </button>

                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* ── Confirmation modals ───────────────────────────────────────────────── */}

      {activeModal === "tier2" && (
        <ConfirmModal
          title="Withdraw from Longevity Research?"
          body="Your data will be excluded from all future research studies immediately. Data already included in completed studies cannot be retroactively removed."
          warning="You'll also lose your active research credits."
          confirmText="Yes, Withdraw"
          cancelText="Keep Research Consent"
          loading={saving}
          onCancel={() => setActiveModal(null)}
          onConfirm={() => void applyChange("tier2_research", false)}
        />
      )}

      {activeModal === "tier3" && (
        <ConfirmModal
          title="Withdraw from Partner Benefits?"
          body="You'll no longer receive offers from our vetted partners and your profile will be excluded from partner data sharing immediately."
          confirmText="Yes, Withdraw"
          cancelText="Keep Partner Benefits"
          loading={saving}
          onCancel={() => setActiveModal(null)}
          onConfirm={() => void applyChange("tier3_commercial", false)}
        />
      )}

      {activeModal === "delete" && (
        <ConfirmModal
          title="Delete your account?"
          body="This will permanently delete your account, all health data, protocols, and history. This action cannot be undone."
          warning="All your data will be erased immediately."
          confirmText="Yes, Delete Account"
          cancelText="Cancel"
          loading={saving}
          onCancel={() => setActiveModal(null)}
          onConfirm={() => void handleDeleteConfirm()}
        />
      )}
    </>
  );
}
