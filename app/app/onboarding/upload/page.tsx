/// app/app/onboarding/upload/page.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };
const GT = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent", backgroundClip: "text" as const };

const STATUS_STEPS = [
  "Reading file…",
  "Extracting biomarkers…",
  "Normalizing values…",
  "Preparing analysis…",
];

export default function UploadPage() {
  const router = useRouter();
  const [drag, setDrag]           = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [pct,  setPct]            = useState(0);
  const [uploading, setUploading] = useState(false);

  const statusText = pct < 30 ? STATUS_STEPS[0] : pct < 60 ? STATUS_STEPS[1] : pct < 85 ? STATUS_STEPS[2] : STATUS_STEPS[3];

  const startUpload = useCallback(async (f: File) => {
    setFile(f);
    setUploading(true);
    setPct(0);

    try {
      // 1. Get signed upload URL
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

      // 2. Upload via XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 85));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
        xhr.send(f);
      });

      setPct(95);

      // 3. Commit metadata
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

      {/* Upload card */}
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

      {/* Wearable tiles */}
      <div className="fu5" style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: ".12em", color: "#6366F1", marginBottom: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>OR CONNECT A WEARABLE</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {["WHOOP", "Oura Ring", "Apple Health", "Garmin", "CGM", "Manual Entry"].map((w) => (
            <div key={w} style={{ padding: "11px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, textAlign: "center", cursor: "pointer", transition: "all .18s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,.35)"; e.currentTarget.style.color = "#A5B4FC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; e.currentTarget.style.color = T.muted; }}>
              {w}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
