/// app/app/wearables/_client.tsx
"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import AppleHealthHelpModal from "@/components/upload/AppleHealthHelpModal";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT   = { background: GRAD, WebkitBackgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, backgroundClip: "text" as const };
const T    = { text: "#F1F5F9", muted: "#64748B" };

interface WearableConn { provider: string; connectedAt: string; }

const WEARABLES = [
  {
    id: "whoop",  name: "WHOOP",        icon: "⚡",
    desc: "HRV, recovery score, sleep performance & strain",
    metrics: ["HRV", "Recovery", "Sleep", "Strain"],
    type: "oauth" as const, oauthHref: "/api/oauth/whoop/start",
  },
  {
    id: "oura",   name: "Oura Ring",    icon: "💍",
    desc: "Readiness score, sleep stages, resting heart rate",
    metrics: ["Readiness", "Sleep Stages", "HRV", "Heart Rate"],
    type: "oauth" as const, oauthHref: "/api/oauth/oura/start",
  },
  {
    id: "apple",  name: "Apple Health", icon: "🍎",
    desc: "Export your Apple Health data (XML or CSV)",
    metrics: ["Steps", "Heart Rate", "Sleep", "Workouts"],
    type: "upload" as const, oauthHref: null,
  },
  {
    id: "garmin", name: "Garmin",       icon: "🏃",
    desc: "Steps, VO₂ max, heart rate zones & more",
    metrics: ["VO₂ Max", "Steps", "HR Zones"],
    type: "soon" as const, oauthHref: null,
  },
  {
    id: "cgm",    name: "CGM",          icon: "🩸",
    desc: "Continuous glucose monitoring from Levels, Nutrisense",
    metrics: ["Glucose", "Metabolic Score"],
    type: "soon" as const, oauthHref: null,
  },
  {
    id: "manual", name: "Manual Entry", icon: "✏️",
    desc: "Enter individual measurements directly",
    metrics: ["Any metric"],
    type: "soon" as const, oauthHref: null,
  },
] as const;

export function WearablesClient({ connected }: { connected: WearableConn[] }) {
  const [uploading, setUploading] = useState(false);
  const [ahModalOpen, setAhModalOpen] = useState(false);
  const appleFileRef = useRef<HTMLInputElement>(null);

  const connectedIds = new Set(connected.map((c) => c.provider));

  async function handleAppleUpload(file: File) {
    setUploading(true);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ name: file.name, size: file.size, type: file.type }] }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload URL");
      const { files: signed } = await signRes.json();
      const { signedUrl, storagePath } = signed[0] as { signedUrl: string; storagePath: string };

      await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const commitRes = await fetch("/api/uploads/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [{ storagePath, fileName: file.name, fileSize: file.size, mimeType: file.type }] }),
      });
      if (!commitRes.ok) throw new Error("Failed to save upload");
      toast.success("Apple Health data uploaded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/app/biomarkers" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.muted, textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 20 }}>
          ← Back to Biomarkers
        </Link>
        <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
          Wearable Devices
        </div>
        <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3vw,34px)", letterSpacing: "-.02em", lineHeight: 1.2, marginBottom: 8 }}>
          <span style={GT}>Connect your</span>{" "}
          <span style={{ color: T.text }}>devices.</span>
        </h1>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", lineHeight: 1.7 }}>
          The more real-time data you share, the more precisely your protocol adapts over time.
        </p>
      </div>

      {/* Connected summary */}
      {connected.length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✓</div>
          <div>
            <div style={{ fontSize: 13, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 2 }}>
              {connected.length} device{connected.length !== 1 ? "s" : ""} connected
            </div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
              {connected.map((c) => c.provider).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* Device cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {WEARABLES.map((w) => {
          const isConnected = connectedIds.has(w.id);
          const connInfo    = connected.find((c) => c.provider === w.id);
          return (
            <div key={w.id} className="card" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: isConnected ? "rgba(16,185,129,.12)" : "rgba(99,102,241,.08)", border: `1px solid ${isConnected ? "rgba(16,185,129,.3)" : "rgba(99,102,241,.18)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {w.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 15, color: T.text }}>{w.name}</span>
                    {isConnected && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "rgba(16,185,129,.12)", color: "#34D399", border: "1px solid rgba(16,185,129,.3)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        Connected
                      </span>
                    )}
                    {w.type === "soon" && (
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "rgba(255,255,255,.05)", color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 10, lineHeight: 1.5 }}>{w.desc}</p>

                  {/* Metrics chips */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {(w.metrics as readonly string[]).map((m) => (
                      <span key={m} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 100, background: "rgba(99,102,241,.08)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,.15)", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        {m}
                      </span>
                    ))}
                  </div>

                  {/* Action */}
                  {w.type === "oauth" && (
                    isConnected ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                          ✓ Connected {connInfo ? new Date(connInfo.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </span>
                        <a href={w.oauthHref} style={{ fontSize: 11, color: "#6366F1", textDecoration: "none", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                          Reconnect
                        </a>
                      </div>
                    ) : (
                      <a href={w.oauthHref}>
                        <button className="cta cta-sm" style={{ fontSize: 12 }}>Connect {w.name}</button>
                      </a>
                    )
                  )}

                  {w.type === "upload" && (
                    <div>
                      <input
                        ref={appleFileRef}
                        type="file" accept=".zip" style={{ display: "none" }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAppleUpload(f); }}
                        disabled={uploading}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <button
                          className="cta cta-sm"
                          style={{ fontSize: 12, opacity: uploading ? 0.6 : 1, cursor: uploading ? "wait" : "pointer" }}
                          disabled={uploading}
                          onClick={() => appleFileRef.current?.click()}
                        >
                          {uploading ? "Uploading…" : "Upload Health Export"}
                        </button>
                        <button
                          onClick={() => setAhModalOpen(true)}
                          style={{ background: "none", border: "none", fontSize: 12, color: "#6366F1", cursor: "pointer", padding: 0, fontFamily: "var(--font-ui,'Inter',sans-serif)", textDecoration: "underline", textUnderlineOffset: 3 }}
                        >
                          Need Help?
                        </button>
                      </div>
                      <p style={{ fontSize: 10, color: T.muted, marginTop: 6, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                        On iPhone: Health → Profile → Export All Health Data → share export.zip
                      </p>
                    </div>
                  )}

                  {w.type === "soon" && (
                    <span style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                      Integration coming soon
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AppleHealthHelpModal
        open={ahModalOpen}
        onClose={() => setAhModalOpen(false)}
        onRequestUpload={() => appleFileRef.current?.click()}
      />
    </>
  );
}
