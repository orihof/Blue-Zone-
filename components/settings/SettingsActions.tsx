/// components/settings/SettingsActions.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Trash2, ChevronLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { signOut } from "next-auth/react";

const CONFIRM_PHRASE = "delete my account";

/* ── Deletion stages shown during progress ── */
const DELETION_STAGES = [
  { label: "Preparing account deletion…",          durationMs: 800  },
  { label: "Deleting health uploads & files…",      durationMs: 1200 },
  { label: "Removing biomarker & wearable data…",   durationMs: 1000 },
  { label: "Deleting protocols & history…",          durationMs: 1000 },
  { label: "Clearing consent & audit records…",      durationMs: 800  },
  { label: "Removing account credentials…",          durationMs: 600  },
];

type DeletionPhase = "idle" | "deleting" | "done" | "error";

export function SettingsActions() {
  const [exporting,   setExporting]   = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [step,        setStep]        = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");

  // Deletion progress state
  const [phase,        setPhase]        = useState<DeletionPhase>("idle");
  const [stageIdx,     setStageIdx]     = useState(0);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [showLongWait, setShowLongWait] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canConfirm = confirmText.toLowerCase() === CONFIRM_PHRASE;
  const deleting   = phase === "deleting";

  function openModal()  { setShowModal(true);  setStep(1); setConfirmText(""); setPhase("idle"); setStageIdx(0); setErrorMsg(""); setShowLongWait(false); }
  function closeModal() { if (!deleting && phase !== "done") { setShowModal(false); setStep(1); setConfirmText(""); setPhase("idle"); setStageIdx(0); setErrorMsg(""); setShowLongWait(false); } }

  // Advance animated stages while the real API call is in flight
  useEffect(() => {
    if (phase !== "deleting") return;
    if (stageIdx >= DELETION_STAGES.length - 1) return; // hold on last stage until API responds

    timerRef.current = setTimeout(() => {
      setStageIdx((i) => Math.min(i + 1, DELETION_STAGES.length - 1));
    }, DELETION_STAGES[stageIdx].durationMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, stageIdx]);

  // Show reassurance message after 10 seconds
  useEffect(() => {
    if (phase !== "deleting") return;
    longWaitRef.current = setTimeout(() => setShowLongWait(true), 10_000);
    return () => { if (longWaitRef.current) clearTimeout(longWaitRef.current); };
  }, [phase]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `bluezone-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!canConfirm || deleting) return;
    setPhase("deleting");
    setStageIdx(0);
    setErrorMsg("");
    setShowLongWait(false);

    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? `Server error (${res.status})`);
      }

      // API confirmed deletion — show completion state
      setStageIdx(DELETION_STAGES.length - 1);
      setPhase("done");

      // Brief pause to show "Done" state, then sign out
      setTimeout(() => {
        signOut({ callbackUrl: "/goodbye" });
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPhase("error");
      setErrorMsg(msg);
    }
  }

  /* ── Progress bar percentage ── */
  const progressPct =
    phase === "done" ? 100 :
    phase === "deleting" ? Math.round(((stageIdx + 1) / DELETION_STAGES.length) * 90) :
    0;

  return (
    <>
      <div className="space-y-4">
        {/* Export */}
        <Card style={{ background: "#111827", border: "1px solid rgba(99,102,241,0.12)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#F1F5F9" }}>
              <Download className="w-4 h-4" style={{ color: "#6366F1" }} /> Export your data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs" style={{ color: "#64748B" }}>
              Download all your data — uploads, protocols, bookmarks, and check-in responses — as a JSON file.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#A5B4FC", background: "none", border: "1px solid rgba(99,102,241,.25)", borderRadius: 8, padding: "7px 14px", cursor: exporting ? "wait" : "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", opacity: exporting ? 0.6 : 1 }}
            >
              <Download style={{ width: 13, height: 13 }} />
              {exporting ? "Exporting…" : "Download my data"}
            </button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card style={{ background: "#111827", border: "1px solid rgba(239,68,68,0.15)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs" style={{ color: "#475569", letterSpacing: ".08em", textTransform: "uppercase" as const, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={openModal}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "#64748B", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", padding: 0, transition: "color .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
              Delete my account
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ── Deletion modal ── */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(2,6,23,.88)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ width: "100%", maxWidth: 440, background: "#0D1117", border: `1px solid ${phase === "error" ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.18)"}`, borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.7)" }}>

            {/* ── Phase: deleting / done / error ── */}
            {(phase === "deleting" || phase === "done" || phase === "error") ? (
              <div style={{ padding: 28 }}>

                {/* Icon */}
                <div style={{ width: 48, height: 48, borderRadius: 14, background: phase === "done" ? "rgba(34,197,94,.08)" : phase === "error" ? "rgba(239,68,68,.08)" : "rgba(99,102,241,.08)", border: `1px solid ${phase === "done" ? "rgba(34,197,94,.2)" : phase === "error" ? "rgba(239,68,68,.2)" : "rgba(99,102,241,.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, transition: "all .3s" }}>
                  {phase === "done" ? (
                    <Check style={{ width: 20, height: 20, color: "#22C55E" }} />
                  ) : phase === "error" ? (
                    <AlertCircle style={{ width: 20, height: 20, color: "#F87171" }} />
                  ) : (
                    <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: "#818CF8" }} />
                  )}
                </div>

                {/* Title */}
                <h2 style={{ fontSize: 18, fontWeight: 500, color: "#F1F5F9", fontFamily: "var(--font-serif,'Syne',sans-serif)", marginBottom: 8, letterSpacing: "-.01em" }}>
                  {phase === "done" ? "Account deleted" : phase === "error" ? "Deletion failed" : "Deleting your account…"}
                </h2>

                {/* Subtitle */}
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65, marginBottom: 24, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  {phase === "done"
                    ? "Your data has been permanently removed. Redirecting…"
                    : phase === "error"
                    ? "Something went wrong. Your account was not deleted."
                    : "Please don\u2019t close this page."}
                </p>

                {/* ── Progress bar ── */}
                {phase !== "error" && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          background: phase === "done"
                            ? "linear-gradient(90deg,#22C55E,#16A34A)"
                            : "linear-gradient(90deg,#6366F1,#8B5CF6)",
                          width: `${progressPct}%`,
                          transition: "width .6s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Stage steps ── */}
                {phase !== "error" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: showLongWait && phase === "deleting" ? 20 : 0 }}>
                    {DELETION_STAGES.map((s, i) => {
                      const isActive  = phase === "deleting" && i === stageIdx;
                      const isDone    = phase === "done" || i < stageIdx;
                      const isPending = !isDone && !isActive;

                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, transition: "opacity .3s", opacity: isPending ? 0.3 : 1 }}>
                          {/* Step indicator */}
                          <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "rgba(34,197,94,.12)" : isActive ? "rgba(99,102,241,.12)" : "rgba(255,255,255,.04)", border: `1px solid ${isDone ? "rgba(34,197,94,.25)" : isActive ? "rgba(99,102,241,.3)" : "rgba(255,255,255,.08)"}`, transition: "all .3s" }}>
                            {isDone ? (
                              <Check style={{ width: 10, height: 10, color: "#22C55E" }} />
                            ) : isActive ? (
                              <Loader2 className="animate-spin" style={{ width: 10, height: 10, color: "#818CF8" }} />
                            ) : (
                              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,.15)" }} />
                            )}
                          </div>
                          <span style={{ fontSize: 12, color: isDone ? "#94A3B8" : isActive ? "#E0E7FF" : "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "color .3s" }}>
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Long wait reassurance ── */}
                {showLongWait && phase === "deleting" && (
                  <p style={{ fontSize: 11, color: "#475569", fontFamily: "var(--font-ui,'Inter',sans-serif)", textAlign: "center", marginTop: 16, fontStyle: "italic" }}>
                    This may take a moment — please don&apos;t close the page.
                  </p>
                )}

                {/* ── Error details + retry ── */}
                {phase === "error" && (
                  <>
                    <div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
                      <p style={{ fontSize: 11, color: "#F87171", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", lineHeight: 1.5, wordBreak: "break-word" }}>
                        {errorMsg}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={closeModal}
                        style={{ flex: 1, padding: "12px 0", border: "1px solid rgba(255,255,255,.1)", color: "#94A3B8", borderRadius: 12, fontSize: 13, cursor: "pointer", background: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
                      >
                        Close
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        style={{ flex: 1, padding: "12px 0", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.22)", color: "#F87171", borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
                      >
                        Retry
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : step === 1 ? (
              /* ── Step 1: consequences ── */
              <div style={{ padding: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Trash2 style={{ width: 20, height: 20, color: "#F87171" }} />
                </div>

                <h2 style={{ fontSize: 18, fontWeight: 500, color: "#F1F5F9", fontFamily: "var(--font-serif,'Syne',sans-serif)", marginBottom: 8, letterSpacing: "-.01em" }}>
                  Delete your account?
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65, marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  This will permanently delete everything associated with your Blue Zone account. This action cannot be undone.
                </p>

                <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 16, marginBottom: 24 }}>
                  <p style={{ fontSize: 10, color: "#475569", letterSpacing: ".1em", textTransform: "uppercase", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 12 }}>
                    What will be deleted
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      "Your profile and personal information",
                      "All generated protocols",
                      "Blood test uploads and biomarker data",
                      "Wearable connections and health data",
                      "Check-in history and streaks",
                      "Supplement adoption history",
                    ].map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(239,68,68,.5)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={closeModal}
                    style={{ flex: 1, padding: "12px 0", border: "1px solid rgba(255,255,255,.1)", color: "#94A3B8", borderRadius: 12, fontSize: 13, cursor: "pointer", background: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "border-color .15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.1)")}
                  >
                    Keep my account
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    style={{ flex: 1, padding: "12px 0", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.22)", color: "#F87171", borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "background .15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,.18)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,.1)")}
                  >
                    Yes, delete everything
                  </button>
                </div>
              </div>
            ) : (
              /* ── Step 2: type to confirm ── */
              <div style={{ padding: 28 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", padding: 0, marginBottom: 20 }}
                >
                  <ChevronLeft style={{ width: 12, height: 12 }} />
                  Back
                </button>

                <h2 style={{ fontSize: 18, fontWeight: 500, color: "#F1F5F9", fontFamily: "var(--font-serif,'Syne',sans-serif)", marginBottom: 8, letterSpacing: "-.01em" }}>
                  Confirm deletion
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65, marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                  Type{" "}
                  <code style={{ fontSize: 11, color: "#F87171", background: "rgba(239,68,68,.1)", padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(239,68,68,.2)", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
                    delete my account
                  </code>{" "}
                  to confirm.
                </p>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="delete my account"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  style={{ width: "100%", background: "rgba(255,255,255,.04)", border: `1px solid ${canConfirm ? "rgba(239,68,68,.4)" : "rgba(255,255,255,.1)"}`, color: "#F1F5F9", fontSize: 13, padding: "12px 14px", borderRadius: 12, outline: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", boxSizing: "border-box", marginBottom: 20, transition: "border-color .15s" }}
                />

                <button
                  onClick={handleDeleteAccount}
                  disabled={!canConfirm || deleting}
                  style={{ width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 13, fontWeight: 500, fontFamily: "var(--font-ui,'Inter',sans-serif)", cursor: canConfirm && !deleting ? "pointer" : "not-allowed", background: canConfirm && !deleting ? "#EF4444" : "rgba(255,255,255,.05)", color: canConfirm && !deleting ? "#fff" : "#475569", border: "none", transition: "background .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  onMouseEnter={(e) => { if (canConfirm && !deleting) e.currentTarget.style.background = "#DC2626"; }}
                  onMouseLeave={(e) => { if (canConfirm && !deleting) e.currentTarget.style.background = "#EF4444"; }}
                >
                  Permanently delete my account
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
