/// app/app/onboarding/upload/page.tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AppleHealthHelpModal from "@/components/upload/AppleHealthHelpModal";

const GOAL_LABELS: Record<string, string> = {
  sports_prep:   "Competition Prep protocol. Upload your blood test to personalize it.",
  performance:   "strength & energy protocol.",
  sleep:         "sleep optimization protocol.",
  anti_aging:    "longevity protocol.",
  cognition:     "cognitive performance protocol.",
  weight_loss:   "weight loss protocol.",
  hair:          "hair health protocol.",
  mood:          "mood & resilience protocol.",
  sexual_health: "sexual health protocol.",
};

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };
const GT = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent", backgroundClip: "text" as const };

// ── General upload step labels ─────────────────────────────────────────────────
const STATUS_STEPS = [
  "Reading file…",
  "Extracting biomarkers…",
  "Normalizing values…",
  "Preparing analysis…",
];

// ── Apple Health upload state machine ─────────────────────────────────────────
type AHState = "idle" | "uploading" | "processing" | "complete" | "failed";

const PARSING_STEPS = [
  { id: "received",    label: "Upload received" },
  { id: "extracting", label: "Extracting metrics" },
  { id: "normalizing",label: "Normalizing units" },
  { id: "ready",      label: "Ready for protocol" },
];

// ── Apple Health file validation ──────────────────────────────────────────────
function validateAHExport(file: File): { valid: boolean; error?: string; warning?: string } {
  if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip") {
    return { valid: false, error: "Please upload export.zip from Apple Health." };
  }
  if (file.size < 100 * 1024) {
    return { valid: false, error: 'This export looks incomplete. Please export "Export All Health Data" again and retry.' };
  }
  if (file.name !== "export.zip") {
    return { valid: true, warning: "Make sure this is the Apple Health export.zip." };
  }
  return { valid: true };
}

export default function UploadPage() {
  const router = useRouter();

  // ── Personalized header (from onboarding profile) ─────────────────────────
  const [profileName,  setProfileName]  = useState<string | null>(null);
  const [primaryGoal,  setPrimaryGoal]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.onboarding_step === "data") {
          setProfileName(data.name ?? null);
          setPrimaryGoal(data.primary_goal ?? null);
        }
      })
      .catch(() => null);
  }, []);

  // ── General upload state ───────────────────────────────────────────────────
  const [drag, setDrag]           = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [pct,  setPct]            = useState(0);
  const [uploading, setUploading] = useState(false);

  // ── Apple Health state ─────────────────────────────────────────────────────
  const ahInputRef      = useRef<HTMLInputElement>(null);
  const ahRetryCountRef = useRef(0);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [ahState,       setAhState]       = useState<AHState>("idle");
  const [ahFile,        setAhFile]        = useState<File | null>(null);
  const [ahPct,         setAhPct]         = useState(0);
  const [ahParseStep,   setAhParseStep]   = useState(0); // 0 = not started, 1–4 = step index
  const [ahError,       setAhError]       = useState<string | null>(null);
  const [ahWarning,     setAhWarning]     = useState<string | null>(null);

  const statusText = pct < 30 ? STATUS_STEPS[0] : pct < 60 ? STATUS_STEPS[1] : pct < 85 ? STATUS_STEPS[2] : STATUS_STEPS[3];

  // ── General upload ─────────────────────────────────────────────────────────
  const startUpload = useCallback(async (f: File) => {
    setFile(f);
    setUploading(true);
    setPct(0);

    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: f.name, size: f.size, type: f.type }] }),
      });
      if (!signRes.ok) {
        const errBody = await signRes.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Failed to get upload URL");
      }
      const { files: signedFiles } = await signRes.json();
      if (!signedFiles?.[0]) throw new Error("No signed URL returned");
      const { signedUrl, storagePath } = signedFiles[0] as { signedUrl: string; storagePath: string };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 85));
        };
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
        xhr.send(f);
      });

      setPct(95);

      const commitRes = await fetch("/api/uploads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: f.name, fileSize: f.size, mimeType: f.type }] }),
      });
      if (!commitRes.ok) throw new Error("Failed to commit upload");

      setPct(100);
      setTimeout(() => router.push("/app/onboarding/dial"), 400);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
      setPct(0);
      setFile(null);
    }
  }, [router]);

  // ── Apple Health upload ────────────────────────────────────────────────────
  const startAHUpload = useCallback(async (f: File) => {
    setAhFile(f);
    setAhError(null);
    setAhWarning(null);
    setAhState("uploading");
    setAhPct(0);
    setAhParseStep(0);
    console.log("[analytics] apple_health_upload_started", { fileSize: f.size, fileName: f.name });

    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: f.name, size: f.size, type: f.type || "application/zip" }] }),
      });
      if (!signRes.ok) {
        const errBody = await signRes.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Failed to get upload URL");
      }
      const { files: signedFiles } = await signRes.json();
      if (!signedFiles?.[0]) throw new Error("No signed URL returned");
      const { signedUrl, storagePath } = signedFiles[0] as { signedUrl: string; storagePath: string };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setAhPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", "application/zip");
        xhr.send(f);
      });

      const commitRes = await fetch("/api/uploads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: f.name, fileSize: f.size, mimeType: "application/zip" }] }),
      });
      if (!commitRes.ok) throw new Error("Failed to commit upload");

      console.log("[analytics] apple_health_upload_completed", { fileSize: f.size });

      // Transition to parsing state with time-based step advancement
      setAhState("processing");
      setAhParseStep(1); // received — immediately
      setTimeout(() => setAhParseStep(2), 2000);  // extracting
      setTimeout(() => setAhParseStep(3), 8000);  // normalizing
      setTimeout(() => {
        setAhParseStep(4);
        setAhState("complete");
        console.log("[analytics] apple_health_parsing_complete");
      }, 14000); // ready
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setAhState("failed");
      setAhError(msg);
      console.log("[analytics] apple_health_upload_failed", { retryCount: ahRetryCountRef.current, error: msg });
    }
  }, []);

  function handleAHFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // Reset input so same file can be re-selected on retry
    e.target.value = "";
    const result = validateAHExport(f);
    if (!result.valid) {
      setAhError(result.error ?? "Invalid file");
      setAhWarning(null);
      console.log("[analytics] apple_health_upload_validation_failed", { reason: result.error });
      return;
    }
    setAhError(null);
    setAhWarning(result.warning ?? null);
    startAHUpload(f);
  }

  function handleAHRetry() {
    if (!ahFile) { ahInputRef.current?.click(); return; }
    ahRetryCountRef.current += 1;
    startAHUpload(ahFile);
  }

  // ── General upload handlers ────────────────────────────────────────────────
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) startUpload(f);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) startUpload(f);
  }

  function openFilePicker() {
    document.getElementById("file-input")?.click();
  }

  return (
    <div style={{ position: "relative", zIndex: 1, maxWidth: 660, margin: "0 auto", padding: "60px 24px" }}>

      {/* Personalized greeting — shown only on first visit after goal selection */}
      {profileName && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{
            fontSize: 14, color: "#64748B",
            fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300,
          }}>
            Hey {profileName} 👋
            {primaryGoal && GOAL_LABELS[primaryGoal]
              ? ` — let's build your ${GOAL_LABELS[primaryGoal]}`
              : " — let's get your protocol started."}
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 100, background: "rgba(99,102,241,.09)", border: "1px solid rgba(99,102,241,.2)", fontSize: 10, fontWeight: 400, letterSpacing: ".1em", color: "#A5B4FC", marginBottom: 22, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          ⬡ STEP 1 OF 3
        </div>
        <h1 className="fu1" style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: "clamp(30px,5vw,48px)", lineHeight: 1.15, marginBottom: 14, letterSpacing: "-.02em" }}>
          <span style={GT}>Upload your data.</span><br />
          <span style={{ color: T.text }}>Get your protocol.</span>
        </h1>
        <p className="fu2" style={{ fontSize: 15, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
          Blood tests, lab reports, or wearable exports. Our AI analyzes every biomarker and builds a protocol grounded in your biology.
        </p>
      </div>

      {/* General upload card */}
      <div className="card fu3" style={{ padding: 8 }}>
        {!uploading ? (
          <div
            className={`upload-zone${drag ? " drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={openFilePicker}
          >
            <input id="file-input" type="file" accept=".pdf,.csv,.json" style={{ display: "none" }} onChange={onFileInput} />
            <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 20, color: T.text, marginBottom: 8 }}>Drop your lab report here</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
              PDF, CSV, or JSON · Blood tests, DEXA, VO₂ max, hormone panels
            </div>
            <button className="cta cta-sm" style={{ pointerEvents: "none" }}>Browse Files</button>
          </div>
        ) : (
          <div style={{ padding: "44px 40px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 15, color: T.text, marginBottom: 6 }}>
              {file?.name ?? "lab-report.pdf"}
            </div>
            <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, color: T.muted, marginBottom: 18, fontWeight: 300 }}>
              {statusText}
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div style={{ fontSize: 11, color: "#334155", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", textAlign: "right", fontWeight: 300 }}>
              {Math.round(Math.min(pct, 100))}%
            </div>
          </div>
        )}
      </div>

      {/* Trust signals */}
      <div className="fu4" style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 28, flexWrap: "wrap" }}>
        {["Grounded in your data", "Updates every check-in", "Clinically referenced"].map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
            <span style={{ color: "#6366F1", fontWeight: 400 }}>✓</span>{t}
          </div>
        ))}
      </div>

      {/* Wearables section */}
      <div className="fu5" style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>OR CONNECT A WEARABLE</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {["WHOOP", "Oura Ring", "Garmin", "CGM", "Manual Entry"].map((w) => (
            <div key={w} style={{ padding: "11px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textAlign: "center", cursor: "pointer", transition: "all .18s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,.35)"; e.currentTarget.style.color = "#A5B4FC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; e.currentTarget.style.color = T.muted; }}>
              {w}
            </div>
          ))}
        </div>
      </div>

      {/* ── Apple Health section ──────────────────────────────────────────────── */}
      <div className="fu6" style={{ marginTop: 20, borderRadius: 14, border: "1px solid rgba(99,102,241,0.18)", background: "rgba(99,102,241,0.04)", padding: "20px 20px" }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 24 }}>🍎</div>
          <div>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: T.text }}>Apple Health</div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Upload your health export for full biomarker analysis</div>
          </div>
        </div>

        {/* Hidden file input — accept .zip only */}
        <input
          ref={ahInputRef}
          type="file"
          accept=".zip"
          style={{ display: "none" }}
          onChange={handleAHFileInput}
        />

        {/* Idle / failed: show upload + help buttons */}
        {(ahState === "idle" || (ahState === "failed" && !ahFile)) && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => ahInputRef.current?.click()}
                className="cta cta-sm"
                style={{ whiteSpace: "nowrap" }}
              >
                Upload Health Export
              </button>
              <button
                onClick={() => setHelpModalOpen(true)}
                style={{ padding: "8px 16px", background: "none", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 8, color: "#A5B4FC", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, whiteSpace: "nowrap", transition: "all .18s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                Need Help?
              </button>
            </div>
            <p style={{ fontSize: 12, color: T.muted, marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
              Tip: You can usually find export.zip in Files → Recents or Downloads.
            </p>
            {ahError && (
              <p style={{ fontSize: 13, color: "#EF4444", marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{ahError}</p>
            )}
            {ahWarning && (
              <p style={{ fontSize: 13, color: "#F59E0B", marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>⚠ {ahWarning}</p>
            )}
          </>
        )}

        {/* Uploading: show progress bar */}
        {ahState === "uploading" && (
          <div>
            <div style={{ fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 13, color: T.text, marginBottom: 10 }}>
              {ahFile?.name ?? "export.zip"}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted, marginBottom: 4, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>
              <span>Uploading…</span>
              <span>{ahPct}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${ahPct}%`, background: GRAD, borderRadius: 4, transition: "width 0.3s ease" }} />
            </div>
          </div>
        )}

        {/* Failed with file: show retry */}
        {ahState === "failed" && ahFile && (
          <div>
            {ahError && (
              <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 10, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{ahError}</p>
            )}
            <p style={{ fontSize: 13, color: T.muted, marginBottom: 10, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
              Your file is still selected — tap retry to try again.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleAHRetry}
                style={{ padding: "8px 18px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 8, color: T.text, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}
              >
                Retry Upload
              </button>
              <button
                onClick={() => setHelpModalOpen(true)}
                style={{ padding: "8px 16px", background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}
              >
                Need Help?
              </button>
            </div>
          </div>
        )}

        {/* Processing / complete: parsing steps */}
        {(ahState === "processing" || ahState === "complete") && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PARSING_STEPS.map((step, i) => {
                const stepNum  = i + 1;
                const isDone   = ahState === "complete" || ahParseStep > stepNum;
                const isActive = ahParseStep === stepNum && ahState !== "complete";
                return (
                  <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 16, fontSize: 13, flexShrink: 0,
                      color: isDone ? "#10B981" : isActive ? "#fff" : T.muted,
                      animation: isActive ? "glowPulse 1.2s ease-in-out infinite" : "none",
                    }}>
                      {isDone ? "✓" : isActive ? "→" : "●"}
                    </span>
                    <span style={{
                      fontSize: 13, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)",
                      color: isDone ? "#10B981" : isActive ? T.text : T.muted,
                      fontWeight: 300,
                    }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {ahState === "complete" && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => router.push("/app/onboarding/dial")}
                  className="cta cta-sm"
                >
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apple Health Help Modal */}
      <AppleHealthHelpModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        onRequestUpload={() => ahInputRef.current?.click()}
      />
    </div>
  );
}
