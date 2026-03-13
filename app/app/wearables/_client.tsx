/// app/app/wearables/_client.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter }                   from "next/navigation";
import { toast }                       from "sonner";
import Link                            from "next/link";
import AppleHealthHelpModal            from "@/components/upload/AppleHealthHelpModal";
import SamsungHealthHelpModal          from "@/components/upload/SamsungHealthHelpModal";
import { UploadProgressBar, DEFAULT_PROGRESS } from "@/components/wearables/UploadProgressBar";
import type { UploadProgress }         from "@/components/wearables/UploadProgressBar";
import { getImportScenario, EVENT_TRIGGERS } from "@/lib/wearables/import-scenarios";
import type { ImportScenario }         from "@/lib/wearables/import-scenarios";
import { friendlyUploadError, formatFileSize, LARGE_FILE_THRESHOLD } from "@/lib/uploads/errors";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT   = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T    = { text: "#F1F5F9", muted: "#64748B" };
const FONT = "var(--font-ui,'Inter',sans-serif)";

// ── Wearable definitions ──────────────────────────────────────────────────────
interface WearableConn { provider: string; connectedAt: string; }

const WEARABLES = [
  {
    id: "whoop",   name: "WHOOP",          icon: "⚡",
    desc: "HRV, recovery score, sleep performance & strain",
    metrics: ["HRV", "Recovery", "Sleep", "Strain"],
    type: "oauth" as const, oauthHref: "/api/oauth/whoop/start",
  },
  {
    id: "oura",    name: "Oura Ring",      icon: "💍",
    desc: "Readiness score, sleep stages, resting heart rate",
    metrics: ["Readiness", "Sleep Stages", "HRV", "Heart Rate"],
    type: "oauth" as const, oauthHref: "/api/oauth/oura/start",
  },
  {
    id: "apple",   name: "Apple Health",   icon: "🍎",
    desc: "Export your Apple Health data (XML or CSV)",
    metrics: ["Steps", "Heart Rate", "Sleep", "Workouts"],
    type: "upload" as const, oauthHref: null,
  },
  {
    id: "samsung", name: "Samsung Health", icon: "⌚",
    desc: "Steps, heart rate, sleep, SpO₂ — export from Samsung Health app",
    metrics: ["Heart Rate", "HRV", "Sleep", "Steps", "SpO₂"],
    type: "upload" as const, oauthHref: null,
  },
  {
    id: "garmin",  name: "Garmin",         icon: "🏃",
    desc: "Steps, VO₂ max, heart rate zones & more",
    metrics: ["VO₂ Max", "Steps", "HR Zones"],
    type: "soon" as const, oauthHref: null,
  },
  {
    id: "strava",  name: "Strava",         icon: "🟠",
    desc: "Activities, pace, power data & heart rate",
    metrics: ["Activities", "Pace", "Power", "Heart Rate"],
    type: "soon" as const, oauthHref: null,
  },
  {
    id: "polar",   name: "Polar",          icon: "❄️",
    desc: "Heart rate, training load, recovery & sleep",
    metrics: ["Heart Rate", "Training Load", "Recovery", "Sleep"],
    type: "soon" as const, oauthHref: null,
  },
  {
    id: "cgm",     name: "CGM",            icon: "🩸",
    desc: "Continuous glucose monitoring from Levels, Nutrisense",
    metrics: ["Glucose", "Metabolic Score"],
    type: "soon" as const, oauthHref: null,
  },
  {
    id: "manual",  name: "Manual Entry",   icon: "✏️",
    desc: "Enter individual measurements directly",
    metrics: ["Any metric"],
    type: "soon" as const, oauthHref: null,
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
export interface WearablesClientProps {
  connected:     WearableConn[];
  isFirstUpload: boolean;
  lastUploadAt:  string | null;
  /** When provided (onboarding mode), "Continue" calls this instead of navigating away. */
  onNext?:       () => void;
}

export function WearablesClient({ connected, isFirstUpload, lastUploadAt, onNext }: WearablesClientProps) {
  const router = useRouter();

  const [appleProgress,   setAppleProgress]   = useState<UploadProgress>(DEFAULT_PROGRESS);
  const [samsungProgress, setSamsungProgress] = useState<UploadProgress>(DEFAULT_PROGRESS);
  const [ahModalOpen,     setAhModalOpen]     = useState(false);
  const [shModalOpen,     setShModalOpen]     = useState(false);
  const [skipped,         setSkipped]         = useState(false);
  const [justUnlocked,    setJustUnlocked]    = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);

  const appleFileRef   = useRef<HTMLInputElement>(null);
  const samsungFileRef = useRef<HTMLInputElement>(null);

  // ── Quarterly reminder: check localStorage on mount ───────────────────────
  useEffect(() => {
    const ts = localStorage.getItem("bz_quarterly_reminder_dismissed");
    if (ts) {
      const daysSince = (Date.now() - parseInt(ts, 10)) / 86_400_000;
      if (daysSince < 14) setReminderDismissed(true);
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const connectedIds    = new Set(connected.map((c) => c.provider));
  const hasLiveWearable = connectedIds.size > 0;

  const daysSinceUpload = lastUploadAt
    ? Math.floor((Date.now() - new Date(lastUploadAt).getTime()) / 86_400_000)
    : null;

  const showQuarterlyReminder =
    !isFirstUpload &&
    daysSinceUpload !== null &&
    daysSinceUpload >= 90 &&
    !hasLiveWearable &&
    !reminderDismissed;

  const canContinue =
    hasLiveWearable ||
    appleProgress.phase   === "complete" ||
    samsungProgress.phase === "complete" ||
    skipped;

  // ── justUnlocked pulse ───────────────────────────────────────────────────
  useEffect(() => {
    if (canContinue) {
      setJustUnlocked(true);
      const t = setTimeout(() => setJustUnlocked(false), 600);
      return () => clearTimeout(t);
    }
  }, [canContinue]);

  // ── Scenario ──────────────────────────────────────────────────────────────
  function currentScenario(): ImportScenario {
    return getImportScenario(isFirstUpload, daysSinceUpload, !isFirstUpload);
  }

  function recordUploadEvent(deviceId: string, scenario: ImportScenario, triggerReason?: string) {
    fetch("/api/wearables/record-upload", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ deviceId, scenario, triggerReason, isFirstUpload }),
    }).catch(() => { /* non-fatal */ });
  }

  // ── Apple Health — XHR for real progress ─────────────────────────────────
  async function handleAppleUpload(file: File) {
    const mimeType = file.type || "application/zip";
    setAppleProgress({ phase: "uploading", percent: 0, fileName: file.name, uploadedAt: null });

    // Large-file info toast (non-blocking)
    if (file.size > LARGE_FILE_THRESHOLD) {
      toast.info(`Large file detected (~${formatFileSize(file.size)}) — upload may take a moment.`);
    }

    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ files: [{ name: file.name, size: file.size, type: mimeType }] }),
      });
      if (!signRes.ok) {
        const body = await signRes.json().catch(() => ({ error: "Failed to get upload URL" }));
        throw new Error(body.error ?? `Server error (${signRes.status})`);
      }
      const { files: signed } = await signRes.json() as { files: { signedUrl: string; storagePath: string }[] };
      const { signedUrl, storagePath } = signed[0];

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setAppleProgress((p) => ({ ...p, percent: Math.round((e.loaded / e.total) * 100) }));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(friendlyUploadError(xhr.responseText || `Upload failed (HTTP ${xhr.status})`)));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error — check your connection and try again.")));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", mimeType);
        xhr.send(file);
      });

      setAppleProgress((p) => ({ ...p, phase: "parsing", percent: 100 }));

      const commitRes = await fetch("/api/uploads/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ files: [{ storagePath, fileName: file.name, fileSize: file.size, mimeType }] }),
      });
      if (!commitRes.ok) throw new Error("Failed to save upload");

      // Register a wearable_connections row so the upload persists across page loads
      await fetch("/api/wearables/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "apple_health" }),
      }).catch(() => { /* non-fatal */ });

      setAppleProgress({ phase: "complete", percent: 100, fileName: file.name, uploadedAt: new Date() });
      recordUploadEvent("apple_health", currentScenario(), selectedTrigger ?? undefined);
      toast.success("Apple Health data uploaded!");
    } catch (err: unknown) {
      setAppleProgress((p) => ({ ...p, phase: "error" }));
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  // ── Samsung Health ────────────────────────────────────────────────────────
  async function handleSamsungUpload(file: File) {
    setSamsungProgress({ phase: "uploading", percent: 60, fileName: file.name, uploadedAt: null });
    try {
      const { parseSamsungHealthZip } = await import("@/lib/wearables/samsung-health-parser");
      const summary = await parseSamsungHealthZip(file);
      setSamsungProgress((p) => ({ ...p, phase: "parsing", percent: 100 }));

      const res = await fetch("/api/wearables/samsung/ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify(summary),
      });
      if (!res.ok) throw new Error("Failed to save Samsung Health data");

      // Register a wearable_connections row so the upload persists across page loads
      await fetch("/api/wearables/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "samsung_health" }),
      }).catch(() => { /* non-fatal */ });

      setSamsungProgress({ phase: "complete", percent: 100, fileName: file.name, uploadedAt: new Date() });
      recordUploadEvent("samsung_health", currentScenario(), selectedTrigger ?? undefined);
      toast.success("Samsung Health data imported!");
    } catch (err: unknown) {
      setSamsungProgress((p) => ({ ...p, phase: "error" }));
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (samsungFileRef.current) samsungFileRef.current.value = "";
    }
  }

  // ── Freshness indicator label ─────────────────────────────────────────────
  const freshness = (() => {
    if (!lastUploadAt || isFirstUpload) return null;
    const d   = daysSinceUpload ?? 0;
    const rel = new Date(lastUploadAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (d < 30) return { dot: "#2DD4BF", text: `Health data current · Last updated ${rel}` };
    if (d < 90) return { dot: "#F59E0B", text: `Health data aging · Last updated ${rel} — consider refreshing` };
    return       { dot: "#EF4444", text: `Health data stale · Last updated ${rel} — refresh recommended` };
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Data freshness */}
      {freshness && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: freshness.dot, flexShrink: 0 }} />
          <p style={{ color: T.muted, fontSize: 12, fontFamily: FONT, margin: 0 }}>{freshness.text}</p>
        </div>
      )}

      {/* Onboarding baseline banner */}
      {isFirstUpload && (
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 18, padding: "18px 20px", marginBottom: 20 }}>
          <p style={{ color: "#A5B4FC", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", fontFamily: FONT, margin: "0 0 6px" }}>
            ⚡ One-time setup
          </p>
          <h3 style={{ color: T.text, fontSize: 15, fontWeight: 500, fontFamily: FONT, margin: "0 0 6px" }}>
            Seed your Biological Age baseline
          </h3>
          <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.6, fontFamily: FONT, margin: 0 }}>
            Your first health data upload establishes the biological baseline Blue Zone uses to calculate your true age and generate your first protocol. This is your starting point — everything improves from here.
          </p>
        </div>
      )}

      {/* Quarterly refresh reminder */}
      {showQuarterlyReminder && (
        <div style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 18, padding: "18px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>🔄</span>
              <div>
                <p style={{ color: T.text, fontSize: 14, fontWeight: 500, fontFamily: FONT, margin: "0 0 4px" }}>
                  Your 90-day protocol cycle is complete
                </p>
                <p style={{ color: T.muted, fontSize: 12, lineHeight: 1.6, fontFamily: FONT, margin: 0 }}>
                  Upload your latest health export to generate an updated protocol based on how your body has changed over the last 3 months.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setReminderDismissed(true); localStorage.setItem("bz_quarterly_reminder_dismissed", Date.now().toString()); }}
              style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", flexShrink: 0, fontSize: 20, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => appleFileRef.current?.click()}
              style={{ fontSize: 12, background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.25)", color: "#2DD4BF", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontFamily: FONT }}
            >
              Upload now →
            </button>
            <button
              onClick={() => { setReminderDismissed(true); localStorage.setItem("bz_quarterly_reminder_dismissed", Date.now().toString()); }}
              style={{ fontSize: 12, background: "none", border: "none", color: T.muted, padding: "8px 16px", cursor: "pointer", fontFamily: FONT }}
            >
              Remind me later
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        {!onNext && (
          <Link href="/app/biomarkers" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.muted, textDecoration: "none", fontFamily: FONT, marginBottom: 20 }}>
            ← Back to Biomarkers
          </Link>
        )}
        <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: FONT, textTransform: "uppercase", marginBottom: 8 }}>Wearable Devices</div>
        <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3vw,34px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 8 }}>
          <span style={GT}>Connect your</span>{" "}<span style={{ color: T.text }}>devices.</span>
        </h1>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: FONT, lineHeight: 1.7 }}>
          The more real-time data you share, the more precisely your protocol adapts over time.
        </p>
      </div>

      {/* Connected summary */}
      {connected.length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✓</div>
          <div>
            <div style={{ fontSize: 13, color: "#34D399", fontFamily: FONT, fontWeight: 400, marginBottom: 2 }}>
              {connected.length} device{connected.length !== 1 ? "s" : ""} connected
            </div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: FONT }}>{connected.map((c) => c.provider).join(", ")}</div>
          </div>
        </div>
      )}

      {/* Device cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {WEARABLES.map((w) => {
          const isConnected = connectedIds.has(w.id);
          const connInfo    = connected.find((c) => c.provider === w.id);
          const prog        = w.id === "apple" ? appleProgress : w.id === "samsung" ? samsungProgress : DEFAULT_PROGRESS;
          const uploaded    = prog.phase === "complete";

          return (
            <div key={w.id} className="card" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: isConnected || uploaded ? "rgba(16,185,129,.12)" : "rgba(99,102,241,.08)",
                  border: `1px solid ${isConnected || uploaded ? "rgba(16,185,129,.3)" : "rgba(99,102,241,.18)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>
                  {w.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: T.text }}>{w.name}</span>
                    {(isConnected || uploaded) && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "rgba(16,185,129,.12)", color: "#34D399", border: "1px solid rgba(16,185,129,.3)", fontFamily: FONT }}>
                        {isConnected ? "Connected" : "Uploaded"}
                      </span>
                    )}
                    {w.type === "soon" && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,.05)", color: T.muted, fontFamily: FONT }}>Coming soon</span>
                    )}
                  </div>

                  <p style={{ fontSize: 12, color: T.muted, fontFamily: FONT, marginBottom: 10, lineHeight: 1.5 }}>{w.desc}</p>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {(w.metrics as readonly string[]).map((m) => (
                      <span key={m} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(99,102,241,.08)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,.15)", fontFamily: FONT }}>{m}</span>
                    ))}
                  </div>

                  {/* OAuth */}
                  {w.type === "oauth" && (
                    isConnected ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, color: "#34D399", fontFamily: FONT }}>
                          ✓ Connected {connInfo ? new Date(connInfo.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </span>
                        <a href={w.oauthHref} style={{ fontSize: 11, color: "#6366F1", textDecoration: "none", fontFamily: FONT }}>Reconnect</a>
                      </div>
                    ) : (
                      <a href={w.oauthHref}><button className="cta cta-sm" style={{ fontSize: 12 }}>Connect {w.name}</button></a>
                    )
                  )}

                  {/* Apple Health upload / progress */}
                  {w.type === "upload" && w.id === "apple" && (
                    prog.phase !== "idle" ? (
                      <UploadProgressBar progress={prog} onRetry={() => { setAppleProgress(DEFAULT_PROGRESS); appleFileRef.current?.click(); }} />
                    ) : (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <button className="cta cta-sm" style={{ fontSize: 12 }} onClick={() => appleFileRef.current?.click()}>
                            Upload Health Export
                          </button>
                          <button onClick={() => setAhModalOpen(true)} style={{ background: "none", border: "none", fontSize: 12, color: "#6366F1", cursor: "pointer", padding: 0, fontFamily: FONT, textDecoration: "underline", textUnderlineOffset: 3 }}>
                            Need Help?
                          </button>
                        </div>
                        <p style={{ fontSize: 10, color: T.muted, marginTop: 6, fontFamily: FONT }}>On iPhone: Health → Profile → Export All Health Data → share export.zip</p>
                      </div>
                    )
                  )}

                  {/* Samsung Health upload / progress */}
                  {w.type === "upload" && w.id === "samsung" && (
                    prog.phase !== "idle" ? (
                      <UploadProgressBar progress={prog} onRetry={() => { setSamsungProgress(DEFAULT_PROGRESS); samsungFileRef.current?.click(); }} />
                    ) : (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <button className="cta cta-sm" style={{ fontSize: 12 }} onClick={() => samsungFileRef.current?.click()}>
                            Import Health Data
                          </button>
                          <button onClick={() => setShModalOpen(true)} style={{ background: "none", border: "none", fontSize: 12, color: "#6366F1", cursor: "pointer", padding: 0, fontFamily: FONT, textDecoration: "underline", textUnderlineOffset: 3 }}>
                            Need Help?
                          </button>
                        </div>
                        <p style={{ fontSize: 10, color: T.muted, marginTop: 6, fontFamily: FONT }}>Samsung Health → ⋮ Menu → Settings → Download personal data</p>
                      </div>
                    )
                  )}

                  {w.type === "soon" && <span style={{ fontSize: 11, color: T.muted, fontFamily: FONT }}>Integration coming soon</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User-triggered refresh (returning users) */}
      {!isFirstUpload && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: ".1em", fontFamily: FONT, margin: "0 0 12px" }}>📤 Refresh your data</p>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, fontFamily: FONT, margin: "0 0 16px" }}>
            Starting something new? Upload a fresh health export to update your protocol with your current biological state.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
            {EVENT_TRIGGERS.map((trigger) => {
              const active = selectedTrigger === trigger.id;
              return (
                <button
                  key={trigger.id}
                  onClick={() => setSelectedTrigger(active ? null : trigger.id)}
                  style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 12, fontFamily: FONT, cursor: "pointer", transition: "all .18s",
                    border:     active ? "1px solid rgba(99,102,241,.45)" : "1px solid rgba(255,255,255,0.07)",
                    background: active ? "rgba(99,102,241,.12)" : "rgba(255,255,255,0.02)",
                    color:      active ? "#A5B4FC" : T.muted,
                  }}
                >
                  <span style={{ display: "block", fontSize: 16, marginBottom: 3 }}>{trigger.icon}</span>
                  <span style={{ fontSize: 11 }}>{trigger.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => appleFileRef.current?.click()}
            disabled={!selectedTrigger}
            style={{
              width: "100%", padding: 12, borderRadius: 12, border: "none", fontFamily: FONT, fontSize: 13, transition: "all .18s",
              background: selectedTrigger ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
              color:      selectedTrigger ? T.text : T.muted,
              cursor:     selectedTrigger ? "pointer" : "not-allowed",
            }}
          >
            Upload new health data →
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={appleFileRef}   type="file" accept=".zip"      style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { e.target.value = ""; handleAppleUpload(f); } }} />
      <input ref={samsungFileRef} type="file" accept=".zip,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { e.target.value = ""; handleSamsungUpload(f); } }} />

      {/* Help modals */}
      <AppleHealthHelpModal   open={ahModalOpen} onClose={() => setAhModalOpen(false)} onRequestUpload={() => appleFileRef.current?.click()} />
      <SamsungHealthHelpModal open={shModalOpen} onClose={() => setShModalOpen(false)} onRequestUpload={() => samsungFileRef.current?.click()} />

      {/* Fixed bottom: Continue to Goals */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 20px 28px", background: "linear-gradient(to top,#0A0A0F 60%,transparent)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 40 }}>
        <button
          onClick={() => canContinue && (onNext ? onNext() : router.push("/app/onboarding/event-fork"))}
          style={{
            width: "100%", maxWidth: 520, padding: "15px 20px", borderRadius: 16, border: "none",
            background:  canContinue ? GRAD : "rgba(255,255,255,0.06)",
            color:       canContinue ? "#fff" : T.muted,
            fontFamily:  FONT, fontSize: 14, fontWeight: 500,
            cursor:      canContinue ? "pointer" : "not-allowed",
            boxShadow:   canContinue ? "0 0 32px rgba(124,58,237,.3)" : "none",
            transition:  "all .5s",
            transform:   justUnlocked ? "scale(1.02)" : "scale(1)",
          }}
        >
          {onNext ? "Continue →" : "Continue to Goals →"}
        </button>

        {!canContinue && (
          <p style={{ color: "#374151", fontSize: 11, fontFamily: FONT, margin: 0, textAlign: "center" }}>
            Connect a device, upload data, or skip to continue
          </p>
        )}
        {!canContinue && (
          <button
            onClick={() => setSkipped(true)}
            style={{ background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: FONT, textDecoration: "underline", textUnderlineOffset: 3 }}
          >
            Skip for now
          </button>
        )}
      </div>
    </>
  );
}
