/// app/app/biomarkers/_setup.tsx  (underscore = not a route)
"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import SamsungHealthHelpModal from "@/components/upload/SamsungHealthHelpModal";
import AppleHealthHelpModal from "@/components/upload/AppleHealthHelpModal";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT   = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T    = { text: "#F1F5F9", muted: "#64748B", card: "#111827" };

// ── Progress bar ───────────────────────────────────────────────────────────────
function SetupProgress({ step1Done, step2Done }: { step1Done: boolean; step2Done: boolean }) {
  const steps = [
    { label: "Upload Blood Test", done: step1Done },
    { label: "Connect Wearables", done: step2Done },
  ];
  const pct = steps.filter((s) => s.done).length / steps.length * 100;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase" }}>
          Setup Progress
        </div>
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          {steps.filter((s) => s.done).length} of {steps.length} complete
        </div>
      </div>

      {/* Bar */}
      <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ height: "100%", background: GRAD, borderRadius: 99, width: `${pct}%`, transition: "width .6s cubic-bezier(.16,1,.3,1)" }} />
      </div>

      {/* Step pills */}
      <div style={{ display: "flex", gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 100,
            background: s.done ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.04)",
            border: `1px solid ${s.done ? "rgba(16,185,129,.3)" : "rgba(255,255,255,.08)"}`,
            fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)",
            color: s.done ? "#34D399" : T.muted,
            transition: "all .3s",
          }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0, background: s.done ? "#10B981" : "rgba(255,255,255,.08)", color: "#fff", fontWeight: 700 }}>
              {s.done ? "✓" : i + 1}
            </div>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Upload section ─────────────────────────────────────────────────────────────
const UPLOAD_STATUSES = ["Reading file…", "Extracting biomarkers…", "Normalizing values…", "Preparing analysis…"];

function UploadSection({ initialDone, onDone }: { initialDone: boolean; onDone: () => void }) {
  const [drag, setDrag]           = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [pct,  setPct]            = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]           = useState(initialDone);
  const [skipped, setSkipped]     = useState(false);

  const statusText = pct < 30 ? UPLOAD_STATUSES[0] : pct < 60 ? UPLOAD_STATUSES[1] : pct < 85 ? UPLOAD_STATUSES[2] : UPLOAD_STATUSES[3];

  const startUpload = useCallback(async (f: File) => {
    setFile(f); setUploading(true); setPct(0);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: f.name, size: f.size, type: f.type }] }),
      });
      if (!signRes.ok) {
        const e = await signRes.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to get upload URL");
      }
      const { files: signed } = await signRes.json();
      if (!signed?.[0]) throw new Error("No signed URL returned");
      const { signedUrl, storagePath } = signed[0] as { signedUrl: string; storagePath: string };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 85)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
        xhr.send(f);
      });

      setPct(95);
      const commitRes = await fetch("/api/uploads/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: f.name, fileSize: f.size, mimeType: f.type }] }),
      });
      if (!commitRes.ok) throw new Error("Failed to save upload");
      setPct(100);
      setTimeout(() => { setDone(true); setUploading(false); onDone(); toast.success("Blood test uploaded!"); }, 500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setUploading(false); setPct(0); setFile(null);
    }
  }, [onDone]);

  if (done || skipped) {
    return (
      <div className="card" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: skipped ? "rgba(99,102,241,.1)" : "rgba(16,185,129,.12)", border: `1px solid ${skipped ? "rgba(99,102,241,.25)" : "rgba(16,185,129,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {skipped ? "📄" : "✓"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: skipped ? T.muted : "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>
            {skipped ? "Skipped — no blood test yet" : "Blood test uploaded"}
          </div>
          {!skipped && file && (
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>{file.name}</div>
          )}
        </div>
        {skipped && (
          <button onClick={() => setSkipped(false)} style={{ fontSize: 11, color: "#6366F1", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Upload now
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 8 }}>
      {!uploading ? (
        <div
          className={`upload-zone${drag ? " drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) startUpload(f); }}
          onClick={() => document.getElementById("bz-bio-file")?.click()}
        >
          <input id="bz-bio-file" type="file" accept=".pdf,.csv,.json,.xml" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) startUpload(f); }} />
          <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 17, color: T.text, marginBottom: 5 }}>
            Drop your blood test here
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 18, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            PDF, CSV, JSON, XML · Blood tests, hormones, DEXA, VO₂ max
          </div>
          <button className="cta cta-sm" style={{ pointerEvents: "none" }}>Browse Files</button>
        </div>
      ) : (
        <div style={{ padding: "32px 28px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 13, color: T.text, marginBottom: 4 }}>{file?.name}</div>
          <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: T.muted, marginBottom: 14 }}>
            {pct < 100 ? statusText : "✓ Upload complete"}
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
            <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div style={{ fontSize: 10, color: "#334155", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", textAlign: "right" }}>
            {Math.round(Math.min(pct, 100))}%
          </div>
        </div>
      )}
      <div style={{ padding: "8px 0 4px", textAlign: "center" }}>
        <button onClick={() => { setSkipped(true); onDone(); }}
          style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "underline" }}>
          Skip — I&apos;ll upload later
        </button>
      </div>
    </div>
  );
}

// ── Wearables section ──────────────────────────────────────────────────────────
const WEARABLE_CARDS = [
  { id: "whoop",   name: "WHOOP",          icon: "⚡", desc: "HRV, recovery, sleep strain",      oauthHref: "/api/oauth/whoop/start" },
  { id: "oura",    name: "Oura Ring",      icon: "💍", desc: "Readiness, sleep, heart rate",     oauthHref: "/api/oauth/oura/start"  },
  { id: "apple",   name: "Apple Health",   icon: "🍎", desc: "Export from Health app",           oauthHref: null },
  { id: "samsung", name: "Samsung Health", icon: "📱", desc: "Steps, sleep, heart rate (CSV)",   oauthHref: null },
  { id: "garmin",  name: "Garmin",         icon: "🏃", desc: "Steps, VO₂ max, HR zones",        oauthHref: null, soon: true },
  { id: "cgm",     name: "CGM",            icon: "🩸", desc: "Continuous glucose monitoring",    oauthHref: null, soon: true },
  { id: "manual",  name: "Manual Entry",   icon: "✏️", desc: "Enter measurements by hand",      oauthHref: null, soon: true },
];

function WearablesSection({
  initialConnected,
  initialDone,
  onDone,
}: {
  initialConnected: string[];
  initialDone: boolean;
  onDone: () => void;
}) {
  const [done, setDone]         = useState(initialDone || initialConnected.length > 0);
  const [skipped, setSkip]      = useState(false);
  const [shModalOpen, setShModal]     = useState(false);
  const [ahModalOpen, setAhModal]     = useState(false);
  const [samsungBusy, setSamsungBusy] = useState(false);
  const [appleBusy,   setAppleBusy]   = useState(false);
  const samsungFileRef = useRef<HTMLInputElement>(null);
  const appleFileRef   = useRef<HTMLInputElement>(null);

  async function handleSamsungUpload(file: File) {
    setSamsungBusy(true);
    try {
      const { parseSamsungHealthZip } = await import("@/lib/wearables/samsung-health-parser");
      const summary = await parseSamsungHealthZip(file);
      const res = await fetch("/api/wearables/samsung/ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
      if (!res.ok) throw new Error("Failed to save Samsung Health data");
      toast.success("Samsung Health data imported!");
      setShModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSamsungBusy(false);
      if (samsungFileRef.current) samsungFileRef.current.value = "";
    }
  }

  async function handleAppleUpload(file: File) {
    setAppleBusy(true);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: file.name, size: file.size, type: file.type }] }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload URL");
      const { files: signed } = await signRes.json();
      const { signedUrl, storagePath } = signed[0] as { signedUrl: string; storagePath: string };
      await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await fetch("/api/uploads/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: file.name, fileSize: file.size, mimeType: file.type }] }),
      });
      toast.success("Apple Health data uploaded!");
      setAhModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAppleBusy(false);
      if (appleFileRef.current) appleFileRef.current.value = "";
    }
  }

  function handleSkip() {
    setSkip(true);
    setDone(true);
    onDone();
    fetch("/api/user/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wearableDone: true }),
    }).catch(() => {});
  }

  if (done) {
    return (
      <div className="card" style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: skipped ? "rgba(99,102,241,.1)" : "rgba(16,185,129,.12)", border: `1px solid ${skipped ? "rgba(99,102,241,.25)" : "rgba(16,185,129,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {skipped ? "📡" : "✓"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: skipped ? T.muted : "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            {skipped ? "Skipped — no wearable connected" : `${initialConnected.join(", ")} connected`}
          </div>
        </div>
        <Link href="/app/wearables" style={{ fontSize: 11, color: "#6366F1", textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Manage →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 8 }}>
        {WEARABLE_CARDS.map((w) => {
          const connected = initialConnected.includes(w.id);
          return (
            <div key={w.id} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: connected ? "rgba(16,185,129,.12)" : "rgba(99,102,241,.08)", border: `1px solid ${connected ? "rgba(16,185,129,.3)" : "rgba(99,102,241,.16)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>
                {w.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.text, fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, marginBottom: 2 }}>{w.name}</div>
                <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{w.desc}</div>
              </div>
              {connected ? (
                <span style={{ fontSize: 11, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>✓ On</span>
              ) : w.soon ? (
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(255,255,255,.04)", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", whiteSpace: "nowrap" }}>Soon</span>
              ) : w.oauthHref ? (
                <a href={w.oauthHref}>
                  <button className="cta cta-sm" style={{ fontSize: 11, whiteSpace: "nowrap" }}>Connect</button>
                </a>
              ) : w.id === "samsung" ? (
                <button
                  className="cta cta-sm"
                  style={{ fontSize: 11, whiteSpace: "nowrap", opacity: samsungBusy ? 0.6 : 1, cursor: samsungBusy ? "wait" : "pointer" }}
                  disabled={samsungBusy}
                  onClick={() => setShModal(true)}
                >
                  {samsungBusy ? "Importing…" : "Upload"}
                </button>
              ) : w.id === "apple" ? (
                <button
                  className="cta cta-sm"
                  style={{ fontSize: 11, whiteSpace: "nowrap", opacity: appleBusy ? 0.6 : 1, cursor: appleBusy ? "wait" : "pointer" }}
                  disabled={appleBusy}
                  onClick={() => setAhModal(true)}
                >
                  {appleBusy ? "Uploading…" : "Upload"}
                </button>
              ) : (
                <Link href="/app/wearables">
                  <button className="cta cta-sm" style={{ fontSize: 11 }}>Upload</button>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
        <Link href="/app/wearables" style={{ fontSize: 12, color: "#6366F1", textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Manage all wearables →
        </Link>
        <button onClick={handleSkip}
          style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "underline" }}>
          Skip for now
        </button>
      </div>

      <input
        ref={appleFileRef}
        type="file" accept=".zip" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAppleUpload(f); }}
        disabled={appleBusy}
      />
      <input
        ref={samsungFileRef}
        type="file" accept=".zip,.csv" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSamsungUpload(f); }}
        disabled={samsungBusy}
      />
      <AppleHealthHelpModal
        open={ahModalOpen}
        onClose={() => setAhModal(false)}
        onRequestUpload={() => appleFileRef.current?.click()}
      />
      <SamsungHealthHelpModal
        open={shModalOpen}
        onClose={() => setShModal(false)}
        onRequestUpload={() => samsungFileRef.current?.click()}
      />
    </div>
  );
}

// ── Setup flow orchestrator ────────────────────────────────────────────────────
function SetupInner({
  initialHasUpload,
  initialConnectedProviders,
  initialWearableDone,
  oauthReturn,
}: {
  initialHasUpload: boolean;
  initialConnectedProviders: string[];
  initialWearableDone: boolean;
  oauthReturn: { provider: string; status: "connected" | "error" } | null;
}) {
  const router = useRouter();
  const [step1Done, setStep1Done] = useState(initialHasUpload);
  const [step2Done, setStep2Done] = useState(initialWearableDone || initialConnectedProviders.length > 0);

  // OAuth return toasts
  useEffect(() => {
    if (!oauthReturn) return;
    if (oauthReturn.status === "connected") toast.success(`${oauthReturn.provider} connected!`);
    if (oauthReturn.status === "error")     toast.error(`${oauthReturn.provider} connection failed.`);
  }, [oauthReturn]);

  const bothDone = step1Done && step2Done;

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "32px 0 60px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
          ⬡ Blue Zone Setup
        </div>
        <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(24px,3.5vw,38px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 10 }}>
          <span style={GT}>Connect your biology.</span><br />
          <span style={{ color: T.text }}>Get your protocol.</span>
        </h1>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.7 }}>
          Upload your blood test and connect a wearable so we can build a protocol grounded in your data.
        </p>
      </div>

      <SetupProgress step1Done={step1Done} step2Done={step2Done} />

      {/* Step 1 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: step1Done ? "#10B981" : GRAD, color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 700, flexShrink: 0 }}>
            {step1Done ? "✓" : "1"}
          </div>
          <span style={{ fontSize: 13, color: step1Done ? "#34D399" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>
            Upload Blood Test
          </span>
        </div>
        <UploadSection initialDone={initialHasUpload} onDone={() => setStep1Done(true)} />
      </div>

      {/* Step 2 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: step2Done ? "#10B981" : step1Done ? GRAD : "rgba(255,255,255,.08)", color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 700, flexShrink: 0, transition: "background .3s" }}>
            {step2Done ? "✓" : "2"}
          </div>
          <span style={{ fontSize: 13, color: step2Done ? "#34D399" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400 }}>
            Connect Wearables
          </span>
        </div>
        <WearablesSection
          initialConnected={initialConnectedProviders}
          initialDone={initialWearableDone}
          onDone={() => setStep2Done(true)}
        />
      </div>

      {/* Continue CTA */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <button
          className="cta"
          style={{ width: "100%", maxWidth: 400, opacity: bothDone ? 1 : 0.45, cursor: bothDone ? "pointer" : "default" }}
          disabled={!bothDone}
          onClick={() => bothDone && router.push("/app/goals")}
        >
          Continue to Goals →
        </button>
        {!bothDone && (
          <p style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Complete or skip both steps above to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ── Wrap in Suspense for useSearchParams ───────────────────────────────────────
function SetupWithParams(props: Omit<Parameters<typeof SetupInner>[0], "oauthReturn">) {
  const searchParams = useSearchParams();

  const whoop = searchParams.get("whoop") as "connected" | "error" | null;
  const oura  = searchParams.get("oura")  as "connected" | "error" | null;

  const oauthReturn = whoop
    ? { provider: "WHOOP",     status: whoop }
    : oura
    ? { provider: "Oura Ring", status: oura }
    : null;

  return <SetupInner {...props} oauthReturn={oauthReturn} />;
}

export function BiomarkersSetup(props: Omit<Parameters<typeof SetupInner>[0], "oauthReturn">) {
  return (
    <Suspense>
      <SetupWithParams {...props} />
    </Suspense>
  );
}
