/// app/connect/wearables/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// ── Inner component (uses useSearchParams — must be inside Suspense) ───────────

function ConnectContent() {
  const searchParams = useSearchParams();
  const initialPhase = searchParams.get("connected") === "1" ? "connected" : "idle";

  const [phase,     setPhase]     = useState<"idle" | "connecting" | "connected" | "error">(initialPhase);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);

  async function handleConnect() {
    setPhase("connecting");
    try {
      const res = await fetch("/api/wearables/terra/connect", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const { url } = await res.json() as { url: string };
      setWidgetUrl(url);
      setPhase("idle"); // show the iframe
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Connection failed");
      setPhase("error");
    }
  }

  return (
    <div style={{
      minHeight: "100svh",
      background: "#070710",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "var(--font-ui, 'Inter', sans-serif)",
    }}>

      {/* Gradient background glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(109,40,217,0.12) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, width: "100%", textAlign: "center" }}>

        {/* Watch icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: "0 auto 28px",
          background: "linear-gradient(135deg, #6D28D9, #0891B2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(109,40,217,0.35)",
        }}>
          <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x={5} y={2} width={14} height={20} rx={4} />
            <line x1={5} y1={7} x2={2} y2={7} /><line x1={22} y1={7} x2={19} y2={7} />
            <line x1={5} y1={17} x2={2} y2={17} /><line x1={22} y1={17} x2={19} y2={17} />
            <circle cx={12} cy={12} r={3} />
            <line x1={12} y1={9} x2={12} y2={12} /><line x1={12} y1={12} x2={14} y2={14} />
          </svg>
        </div>

        <h1 style={{
          fontFamily: "var(--font-serif, 'Syne', sans-serif)",
          fontSize: 28, fontWeight: 400, color: "#F1F5F9",
          margin: "0 0 12px", letterSpacing: "-0.3px",
        }}>
          Connect Samsung Galaxy Watch
        </h1>

        <p style={{ color: "#64748B", fontSize: 15, lineHeight: 1.6, margin: "0 0 36px" }}>
          Sync your heart rate, HRV, sleep, and activity data to personalise
          your Blue Zone protocol.
        </p>

        {/* ── Connected state ── */}
        {phase === "connected" && (
          <div style={{
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 16, padding: "28px 24px", marginBottom: 24,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <p style={{ color: "#10B981", fontSize: 16, fontWeight: 500, margin: "0 0 8px" }}>
              Galaxy Watch connected!
            </p>
            <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
              Your data will appear within a few minutes. Protocol generation
              will now include your wearable metrics.
            </p>
            <a
              href="/app/dashboard"
              style={{
                display: "inline-block", marginTop: 20,
                padding: "12px 28px", borderRadius: 10,
                background: "linear-gradient(135deg, #6D28D9, #0891B2)",
                color: "#fff", fontSize: 14, fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go to dashboard →
            </a>
          </div>
        )}

        {/* ── Error state ── */}
        {phase === "error" && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 24, color: "#F87171",
            fontSize: 14, textAlign: "left",
          }}>
            {errorMsg ?? "Something went wrong. Please try again."}
          </div>
        )}

        {/* ── Terra widget iframe ── */}
        {widgetUrl && phase !== "connected" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              borderRadius: 16, overflow: "hidden",
              border: "1px solid rgba(109,40,217,0.3)",
              boxShadow: "0 0 40px rgba(0,0,0,0.5)",
            }}>
              <iframe
                src={widgetUrl}
                width="100%"
                height={520}
                style={{ display: "block", border: "none", background: "#fff" }}
                title="Connect Samsung Galaxy Watch"
                allow="camera; microphone"
              />
            </div>
            <button
              onClick={() => setPhase("connected")}
              style={{
                marginTop: 16, padding: "12px 28px", borderRadius: 10,
                background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
                color: "#10B981", fontFamily: "inherit", fontSize: 14, fontWeight: 500,
                cursor: "pointer",
              }}
            >
              I&apos;ve connected my watch ✓
            </button>
          </div>
        )}

        {/* ── Idle / connecting ── */}
        {!widgetUrl && phase !== "connected" && (
          <>
            <button
              onClick={handleConnect}
              disabled={phase === "connecting"}
              style={{
                width: "100%", padding: "16px 24px", borderRadius: 12,
                background: phase === "connecting"
                  ? "rgba(109,40,217,0.4)"
                  : "linear-gradient(135deg, #6D28D9, #0891B2)",
                border: "none", color: "#fff",
                fontFamily: "inherit", fontSize: 16, fontWeight: 500,
                cursor: phase === "connecting" ? "not-allowed" : "pointer",
                transition: "opacity 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              {phase === "connecting" ? (
                <>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", display: "inline-block",
                    animation: "bz-spin 0.8s linear infinite",
                  }} />
                  Preparing connection…
                </>
              ) : (
                <>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x={5} y={2} width={14} height={20} rx={4} />
                    <circle cx={12} cy={12} r={3} />
                  </svg>
                  Connect Samsung Galaxy Watch
                </>
              )}
            </button>

            {/* Data bullets */}
            <div style={{
              marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 12, textAlign: "left",
            }}>
              {[
                ["❤️", "Heart rate & HRV"],
                ["😴", "Sleep stages & score"],
                ["🏃", "Steps & calories"],
                ["🩸", "Blood oxygen (SpO2)"],
                ["🧠", "Stress score"],
                ["🫁", "VO2 max"],
              ].map(([icon, label]) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255,255,255,0.03)", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "10px 14px",
                }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>{label}</span>
                </div>
              ))}
            </div>

            <p style={{ color: "#334155", fontSize: 12, marginTop: 24 }}>
              Powered by Terra API · Your data is only used to personalise your protocol
            </p>
          </>
        )}
      </div>

      <style>{`@keyframes bz-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Page export (Suspense boundary required for useSearchParams) ───────────────

export default function ConnectWearablesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100svh", background: "#070710", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(109,40,217,.2)", borderTopColor: "#6D28D9", animation: "bz-spin 0.8s linear infinite" }} />
        <style>{`@keyframes bz-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ConnectContent />
    </Suspense>
  );
}
