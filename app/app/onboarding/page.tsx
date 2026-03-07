/// app/app/onboarding/page.tsx
// Multi-step onboarding orchestrator.
// Steps: 0 Upload → 1 Profile → 2 Connect Wearables → 3 Processing
// Triggers every session until a protocol exists (enforced in layout).
// Handles OAuth redirect-backs via ?step=N&whoop=connected etc.
"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";

// ── Constants ─────────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT   = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T    = { text: "#F1F5F9", muted: "#64748B", card: "#111827" };

const STEP_LABELS = ["Upload", "Profile", "Connect", "Protocol"];

// ── Storage helpers (survive OAuth redirects) ─────────────────────────────────
const SS_KEY = "bz_onboarding_v1";
interface SavedState {
  profile: { age: number; goals: Goal[]; budget: BudgetTier; preferences: Preferences };
  uploadData: { storagePath: string; fileName: string } | null;
}
function loadSaved(): SavedState | null {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "null"); } catch { return null; }
}
function saveSaved(s: SavedState) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Upload step ───────────────────────────────────────────────────────────────
const STATUS_STEPS = ["Reading file…", "Extracting biomarkers…", "Normalizing values…", "Preparing analysis…"];

function UploadStep({ onDone }: { onDone: (data: { storagePath: string; fileName: string }) => void }) {
  const [drag, setDrag]           = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [pct,  setPct]            = useState(0);
  const [uploading, setUploading] = useState(false);

  const statusText = pct < 30 ? STATUS_STEPS[0] : pct < 60 ? STATUS_STEPS[1] : pct < 85 ? STATUS_STEPS[2] : STATUS_STEPS[3];

  const startUpload = useCallback(async (f: File) => {
    setFile(f); setUploading(true); setPct(0);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: f.name, size: f.size, type: f.type }] }),
      });
      if (!signRes.ok) {
        const e = await signRes.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to get upload URL");
      }
      const { files: signedFiles } = await signRes.json();
      if (!signedFiles?.[0]) throw new Error("No signed URL returned");
      const { signedUrl, storagePath } = signedFiles[0] as { signedUrl: string; storagePath: string };

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
      await fetch("/api/uploads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: f.name, fileSize: f.size, mimeType: f.type }] }),
      });
      setPct(100);
      setTimeout(() => onDone({ storagePath, fileName: f.name }), 500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setUploading(false); setPct(0); setFile(null);
    }
  }, [onDone]);

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3.5vw,36px)", ...GT, marginBottom: 10, letterSpacing: "-.02em" }}>
          Upload your health data.
        </h2>
        <p style={{ fontSize: 14, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.7, maxWidth: 400, margin: "0 auto" }}>
          Blood tests, lab reports, or wearable exports. Our AI analyzes every biomarker and builds a protocol grounded in your biology.
        </p>
      </div>

      <div className="card" style={{ padding: 8 }}>
        {!uploading ? (
          <div
            className={`upload-zone${drag ? " drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) startUpload(f); }}
            onClick={() => document.getElementById("bz-file")?.click()}
          >
            <input id="bz-file" type="file" accept=".pdf,.csv,.json,.xml" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) startUpload(f); }} />
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, color: T.text, marginBottom: 6 }}>Drop your lab report here</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              PDF, CSV, JSON, XML · Blood tests, DEXA, hormones, VO₂ max
            </div>
            <button className="cta cta-sm" style={{ pointerEvents: "none" }}>Browse Files</button>
          </div>
        ) : (
          <div style={{ padding: "40px 36px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 14, color: T.text, marginBottom: 5 }}>
              {file?.name ?? "lab-report.pdf"}
            </div>
            <div style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: T.muted, marginBottom: 16 }}>
              {pct < 100 ? statusText : "✓ Upload complete"}
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div style={{ fontSize: 10, color: "#334155", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", textAlign: "right" }}>
              {Math.round(Math.min(pct, 100))}%
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          onClick={() => onDone({ storagePath: "", fileName: "" })}
          style={{ fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "underline" }}
        >
          Skip — I&apos;ll upload later
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24, flexWrap: "wrap" }}>
        {["Grounded in your data", "Updates every check-in", "Clinically referenced"].map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            <span style={{ color: "#6366F1" }}>✓</span>{t}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Profile step ──────────────────────────────────────────────────────────────
const GOAL_OPTIONS: { value: Goal; label: string; icon: string }[] = [
  { value: "energy",    label: "Energy",    icon: "⚡" },
  { value: "sleep",     label: "Sleep",     icon: "🌙" },
  { value: "focus",     label: "Focus",     icon: "🎯" },
  { value: "strength",  label: "Strength",  icon: "💪" },
  { value: "fat_loss",  label: "Fat Loss",  icon: "🔥" },
  { value: "recovery",  label: "Recovery",  icon: "🔄" },
  { value: "hormones",  label: "Hormones",  icon: "◉" },
  { value: "longevity", label: "Longevity", icon: "⬡" },
];
const BUDGETS: { value: BudgetTier; label: string; desc: string }[] = [
  { value: "low",    label: "Essentials",  desc: "High-impact basics only"   },
  { value: "medium", label: "Optimized",   desc: "Broader protocol coverage"  },
  { value: "high",   label: "All-in",      desc: "Full longevity stack"       },
];

interface ProfileValue { age: number; goals: Goal[]; budget: BudgetTier; preferences: Preferences; }
function ProfileStep({ value, onChange, onNext }: { value: ProfileValue; onChange: (v: ProfileValue) => void; onNext: () => void }) {
  const { age, goals, budget, preferences } = value;
  const set = (patch: Partial<ProfileValue>) => onChange({ ...value, ...patch });

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,32px)", ...GT, letterSpacing: "-.02em", marginBottom: 8 }}>
          How young do you want to feel?
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          Used to calibrate your protocol — takes 30 seconds.
        </p>
      </div>

      {/* Age selector */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Target age</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => set({ age: Math.max(23, age - 1) })} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", color: "#A5B4FC", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 48, ...GT, lineHeight: 1 }}>{age}</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginTop: 2 }}>years old</div>
          </div>
          <button onClick={() => set({ age: Math.min(70, age + 1) })} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", color: "#A5B4FC", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
        <input type="range" min={23} max={70} value={age} onChange={(e) => set({ age: +e.target.value })}
          style={{ width: "100%", marginTop: 14, accentColor: "#6366F1" }} />
      </div>

      {/* Goals */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Your goals</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {GOAL_OPTIONS.map((g) => {
            const active = goals.includes(g.value);
            return (
              <button key={g.value} onClick={() => set({ goals: active ? goals.filter((x) => x !== g.value) : [...goals, g.value] })}
                style={{ padding: "10px 4px", borderRadius: 10, textAlign: "center", background: active ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)", border: `1px solid ${active ? "rgba(99,102,241,.45)" : "rgba(255,255,255,.07)"}`, cursor: "pointer", transition: "all .15s" }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{g.icon}</div>
                <div style={{ fontSize: 10, color: active ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{g.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 12 }}>Protocol budget</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {BUDGETS.map((b) => {
            const active = budget === b.value;
            return (
              <button key={b.value} onClick={() => set({ budget: b.value })}
                style={{ padding: "12px 8px", borderRadius: 10, background: active ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)", border: `1px solid ${active ? "rgba(99,102,241,.45)" : "rgba(255,255,255,.07)"}`, cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                <div style={{ fontSize: 12, color: active ? "#A5B4FC" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{b.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferences */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {([ ["vegan", "🌱 Vegan"], ["caffeineFree", "☕ Caffeine-free"], ["noFishOil", "🐟 No fish oil"] ] as [keyof Preferences, string][]).map(([key, label]) => {
          const active = !!preferences[key];
          return (
            <button key={key} onClick={() => set({ preferences: { ...preferences, [key]: !preferences[key] } })}
              className={`chip${active ? " chip-a" : ""}`} style={{ fontSize: 12 }}>
              {label}
            </button>
          );
        })}
      </div>

      <button className="cta" style={{ width: "100%" }} onClick={onNext} disabled={goals.length === 0}>
        Continue →
      </button>
      {goals.length === 0 && <p style={{ fontSize: 11, color: T.muted, textAlign: "center", marginTop: 8, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Select at least one goal</p>}
    </div>
  );
}

// ── Wearable connection step ──────────────────────────────────────────────────
type WearableId = "whoop" | "oura" | "apple" | "samsung" | "garmin" | "lumen";
interface WearableConn { id: WearableId; name: string; icon: string; description: string; type: "oauth" | "upload" | "soon"; oauthHref?: string; accept?: string; }

const WEARABLES: WearableConn[] = [
  { id: "whoop",   name: "WHOOP",          icon: "⚡", description: "HRV, recovery, sleep strain",   type: "oauth",  oauthHref: "/api/oauth/whoop/start" },
  { id: "oura",    name: "Oura Ring",      icon: "💍", description: "Readiness, sleep, heart rate",  type: "oauth",  oauthHref: "/api/oauth/oura/start"  },
  { id: "apple",   name: "Apple Health",   icon: "🍎", description: "Upload your Health export",     type: "upload", accept: ".json,.xml,.csv"            },
  { id: "samsung", name: "Samsung Health", icon: "📱", description: "Upload Samsung Health ZIP/CSV", type: "upload", accept: ".zip,.csv"                  },
  { id: "garmin",  name: "Garmin",         icon: "🏃", description: "Steps, VO₂ max, HR zones",     type: "soon"                                         },
  { id: "lumen",   name: "Lumen",          icon: "🔬", description: "Metabolic flexibility (CSV)",   type: "soon"                                         },
];

function WearableStep({
  connected,
  skipped,
  onToggleSkip,
  onFileUpload,
  onNext,
}: {
  connected: Partial<Record<WearableId, boolean>>;
  skipped: Partial<Record<WearableId, boolean>>;
  onToggleSkip: (id: WearableId) => void;
  onConnect: (id: WearableId) => void;
  onFileUpload: (id: WearableId, file: File) => void;
  onNext: () => void;
}) {
  const anyConnected = Object.values(connected).some(Boolean);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,32px)", ...GT, letterSpacing: "-.02em", marginBottom: 8 }}>
          Connect your wearables.
        </h2>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          The more data you share, the more precise your protocol. Skip any device — connect later from Settings.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {WEARABLES.map((w) => {
          const isConnected = !!connected[w.id];
          const isSkipped   = !!skipped[w.id];

          return (
            <div key={w.id} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, opacity: isSkipped ? 0.5 : 1, transition: "opacity .2s" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: isConnected ? "rgba(16,185,129,.15)" : "rgba(99,102,241,.08)", border: `1px solid ${isConnected ? "rgba(16,185,129,.35)" : "rgba(99,102,241,.18)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {w.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 14, color: T.text, marginBottom: 2 }}>{w.name}</div>
                <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{w.description}</div>
              </div>

              <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                {isConnected ? (
                  <span style={{ fontSize: 11, color: "#10B981", fontFamily: "var(--font-ui,'Inter',sans-serif)", display: "flex", alignItems: "center", gap: 4 }}>✓ Connected</span>
                ) : w.type === "soon" ? (
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(255,255,255,.05)", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Coming soon</span>
                ) : w.type === "oauth" ? (
                  <>
                    <a href={w.oauthHref}>
                      <button className="cta cta-sm" style={{ fontSize: 11 }}>Connect</button>
                    </a>
                    {!isSkipped && (
                      <button onClick={() => onToggleSkip(w.id)} style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        Skip
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept={w.accept ?? ".json,.xml,.csv"} style={{ display: "none" }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileUpload(w.id, f); }} />
                      <span className="cta cta-sm" style={{ fontSize: 11, display: "inline-block" }}>Upload</span>
                    </label>
                    {!isSkipped && (
                      <button onClick={() => onToggleSkip(w.id)} style={{ fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        Skip
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="cta" style={{ width: "100%" }} onClick={onNext}>
          {anyConnected ? "Continue with connected devices →" : "Continue →"}
        </button>
        <button onClick={onNext} style={{ fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)", textAlign: "center", textDecoration: "underline" }}>
          Skip all — generate from blood data only
        </button>
      </div>
    </div>
  );
}

// ── Processing step ───────────────────────────────────────────────────────────
const PROC_STEPS = [
  "Ingesting health data",
  "Parsing uploads & OCR",
  "Normalising wearable metrics",
  "Building biomarker snapshot",
  "Generating personalised protocol",
];
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function FlickerWord({ word }: { word: string }) {
  const [displayed, setDisplayed] = useState(word);
  useEffect(() => {
    let iter = 0;
    const total = word.length * 3;
    const id = setInterval(() => {
      setDisplayed(word.split("").map((ch, i) => (i < Math.floor(iter / 3) ? ch : CHARS[Math.floor(Math.random() * CHARS.length)])).join(""));
      iter++;
      if (iter > total) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);
  return <span style={{ color: "#6366F1", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>{displayed}</span>;
}

function ProcessingStep({ profile, onDone }: { profile: ProfileValue; onDone: (protocolId: string) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0]);
  const [started, setStarted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = Math.round(((currentStep + 1) / PROC_STEPS.length) * 100);

  useEffect(() => { setMounted(true); }, []);

  // Advance steps visually
  useEffect(() => {
    if (!mounted) return;
    function advance() {
      setCurrentStep((s) => {
        const next = s < PROC_STEPS.length - 1 ? s + 1 : s;
        if (next !== s) setVisibleSteps((prev) => prev.includes(next) ? prev : [...prev, next]);
        return next;
      });
    }
    intervalRef.current = setInterval(advance, 3200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [mounted]);

  // Create protocol once
  useEffect(() => {
    if (!mounted || started) return;
    setStarted(true);
    (async () => {
      try {
        const res = await fetch("/api/protocols/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedAge: profile.age, goals: profile.goals, budget: profile.budget, preferences: profile.preferences }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to create protocol");
        }
        const { protocolId } = await res.json() as { protocolId: string };
        // Wait until at least 3 steps are visible for effect
        const wait = () => new Promise((r) => setTimeout(r, 2000));
        await wait();
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCurrentStep(PROC_STEPS.length - 1);
        setVisibleSteps(PROC_STEPS.map((_, i) => i));
        setTimeout(() => onDone(protocolId), 1200);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Protocol generation failed");
      }
    })();
  }, [mounted, started, profile, onDone]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      {/* Radial glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 55% 45% at 50% 40%,rgba(99,102,241,.07) 0%,transparent 70%)" }} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: "100%", maxWidth: 400 }}>
        {/* Logo pulse */}
        <div style={{ width: 56, height: 56, borderRadius: 16, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 0 32px rgba(99,102,241,.4)", animation: "glowPulse 2.4s ease-in-out infinite" }}>⬡</div>

        {/* Headline */}
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(20px,3vw,28px)", color: T.text, marginBottom: 6 }}>
            Building your <FlickerWord word="PERSONAL" /> protocol
          </h2>
          <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>This usually takes 30–60 seconds</p>
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", background: GRAD, borderRadius: 99, width: `${progress}%`, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
        </div>

        {/* Step list */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {PROC_STEPS.map((step, i) => {
            if (!visibleSteps.includes(i)) return null;
            const isDone   = i < currentStep;
            const isActive = i === currentStep;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: isDone ? 0.6 : 1, transition: "opacity .3s" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: isDone ? "#10B981" : isActive ? "#6366F1" : "rgba(255,255,255,.15)", boxShadow: isActive ? "0 0 8px rgba(99,102,241,.6)" : "none", animation: isActive ? "glowPulse 1.2s ease-in-out infinite" : "none" }} />
                <span style={{ fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 11, color: isDone ? "#10B981" : isActive ? T.text : T.muted, textDecoration: isDone ? "line-through" : "none" }}>
                  {isDone ? "✓ " : isActive ? "→ " : "  "}{step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStep = Math.max(0, Math.min(3, parseInt(searchParams.get("step") ?? "0", 10)));
  const whoopStatus = searchParams.get("whoop");
  const ouraStatus  = searchParams.get("oura");

  const [step, setStep] = useState(initialStep);
  const [uploadData, setUploadData] = useState<{ storagePath: string; fileName: string } | null>(null);
  const [profile, setProfile] = useState<ProfileValue>({
    age: 35, goals: ["energy", "sleep"] as Goal[], budget: "medium" as BudgetTier,
    preferences: { vegan: false, caffeineFree: false, noFishOil: false },
  });
  const [connected, setConnected] = useState<Partial<Record<WearableId, boolean>>>({
    whoop: whoopStatus === "connected",
    oura:  ouraStatus  === "connected",
  });
  const [skipped, setSkipped] = useState<Partial<Record<WearableId, boolean>>>({});

  // Restore sessionStorage on mount (survives OAuth redirects)
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setProfile(saved.profile);
      if (saved.uploadData) setUploadData(saved.uploadData);
    }
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    saveSaved({ profile, uploadData });
  }, [profile, uploadData]);

  // Show toast on OAuth result
  useEffect(() => {
    if (whoopStatus === "connected") toast.success("WHOOP connected successfully!");
    if (whoopStatus === "error")     toast.error("WHOOP connection failed — try again.");
    if (ouraStatus  === "connected") toast.success("Oura Ring connected successfully!");
    if (ouraStatus  === "error")     toast.error("Oura connection failed — try again.");
  }, [whoopStatus, ouraStatus]);

  const handleAppleUpload = useCallback(async (file: File) => {
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: file.name, size: file.size, type: file.type }] }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload URL");
      const { files: signedFiles } = await signRes.json();
      const { signedUrl, storagePath } = signedFiles[0] as { signedUrl: string; storagePath: string };

      await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await fetch("/api/uploads/commit", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: file.name, fileSize: file.size, mimeType: file.type }] }) });

      setConnected((prev) => ({ ...prev, apple: true }));
      toast.success(`${file.name} uploaded successfully!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }, []);

  const handleSamsungUpload = useCallback(async (file: File) => {
    try {
      const { parseSamsungHealthZip } = await import("@/lib/wearables/samsung-health-parser");
      const summary = await parseSamsungHealthZip(file);
      const res = await fetch("/api/wearables/samsung/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
      if (!res.ok) throw new Error("Failed to save Samsung Health data");
      setConnected((prev) => ({ ...prev, samsung: true }));
      toast.success("Samsung Health data imported!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }, []);

  const handleFileUpload = useCallback((id: WearableId, file: File) => {
    if (id === "samsung") return handleSamsungUpload(file);
    return handleAppleUpload(file);
  }, [handleAppleUpload, handleSamsungUpload]);

  const progressPct = (step / (STEP_LABELS.length - 1)) * 100;

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Step progress bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(6,8,15,.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            {STEP_LABELS.map((label, i) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, background: i < step ? GRAD : i === step ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.06)", color: i < step ? "#fff" : i === step ? "#A5B4FC" : T.muted, border: i === step ? "1px solid rgba(99,102,241,.4)" : "none", transition: "all .3s" }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 9, color: i === step ? "#A5B4FC" : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", letterSpacing: ".06em", textTransform: "uppercase" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ height: 2, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", background: GRAD, borderRadius: 99, width: `${progressPct}%`, transition: "width .5s cubic-bezier(.16,1,.3,1)" }} />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div style={{ padding: "40px 20px 80px" }}>
        {step === 0 && (
          <UploadStep onDone={(data) => { setUploadData(data); setStep(1); }} />
        )}
        {step === 1 && (
          <ProfileStep value={profile} onChange={setProfile} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <WearableStep
            connected={connected}
            skipped={skipped}
            onToggleSkip={(id) => setSkipped((prev) => ({ ...prev, [id]: !prev[id] }))}
            onConnect={(id) => setConnected((prev) => ({ ...prev, [id]: true }))}
            onFileUpload={handleFileUpload}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ProcessingStep
            profile={profile}
            onDone={(protocolId) => {
              sessionStorage.removeItem(SS_KEY);
              router.push(`/app/results/${protocolId}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}
