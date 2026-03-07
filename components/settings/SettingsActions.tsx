/// components/settings/SettingsActions.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Trash2, ChevronLeft, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";

const CONFIRM_PHRASE = "delete my account";

export function SettingsActions() {
  const [exporting,   setExporting]   = useState(false);
  const [showModal,   setShowModal]   = useState(false);
  const [step,        setStep]        = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [deleting,    setDeleting]    = useState(false);

  const canConfirm = confirmText.toLowerCase() === CONFIRM_PHRASE;

  function openModal()  { setShowModal(true);  setStep(1); setConfirmText(""); }
  function closeModal() { if (!deleting) { setShowModal(false); setStep(1); setConfirmText(""); } }

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
    if (!canConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await signOut({ callbackUrl: "/goodbye" });
    } catch {
      toast.error("Could not delete account. Please try again.");
      setDeleting(false);
    }
  }

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
          <div style={{ width: "100%", maxWidth: 440, background: "#0D1117", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.7)" }}>

            {step === 1 ? (
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
                  {deleting ? (
                    <>
                      <Loader2 className="animate-spin" style={{ width: 15, height: 15 }} />
                      Deleting your account…
                    </>
                  ) : (
                    "Permanently delete my account"
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
