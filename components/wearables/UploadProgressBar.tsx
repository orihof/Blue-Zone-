/// components/wearables/UploadProgressBar.tsx
"use client";

const FONT_UI   = "var(--font-ui,'Inter',sans-serif)";
const FONT_MONO = "var(--font-mono,'JetBrains Mono',monospace)";
const MUTED     = "#64748B";

export interface UploadProgress {
  phase:      "idle" | "uploading" | "parsing" | "complete" | "error";
  percent:    number;
  fileName:   string | null;
  uploadedAt: Date | null;
}

export const DEFAULT_PROGRESS: UploadProgress = {
  phase: "idle", percent: 0, fileName: null, uploadedAt: null,
};

const PHASE_MESSAGES = {
  uploading: "Uploading your health data…",
  parsing:   "Upload complete. Parsing your health data…",
  complete:  "Health data imported successfully.",
  error:     "Upload failed. Please try again.",
} as const;

const PHASE_COLORS = {
  uploading: "linear-gradient(90deg,#7C3AED,#6D28D9)",
  parsing:   "linear-gradient(90deg,#7C3AED,#0D9488)",
  complete:  "linear-gradient(90deg,#059669,#34D399)",
  error:     "linear-gradient(90deg,#DC2626,#EF4444)",
} as const;

interface UploadProgressBarProps {
  progress: UploadProgress;
  onRetry:  () => void;
}

export function UploadProgressBar({ progress, onRetry }: UploadProgressBarProps) {
  const { phase, percent } = progress;
  if (phase === "idle") return null;

  const msgColor = phase === "complete" ? "#34D399" : phase === "error" ? "#EF4444" : MUTED;
  const barColor = PHASE_COLORS[phase as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.uploading;
  const barWidth = phase === "parsing" || phase === "complete" ? "100%" : `${percent}%`;
  const isParsing = phase === "parsing";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Message row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: msgColor, fontSize: 12, fontFamily: FONT_UI, margin: 0, transition: "color .3s" }}>
          {PHASE_MESSAGES[phase as keyof typeof PHASE_MESSAGES]}
        </p>
        {phase === "uploading" && (
          <span style={{ color: MUTED, fontSize: 11, fontFamily: FONT_MONO }}>{percent}%</span>
        )}
        {phase === "complete" && (
          <span style={{ color: "#34D399", fontSize: 13 }}>✓</span>
        )}
      </div>

      {/* Progress track */}
      {phase !== "error" && (
        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height:     "100%",
              width:      barWidth,
              background: barColor,
              borderRadius: 4,
              transition: isParsing ? "none" : "width .4s ease",
              animation:  isParsing ? "parseShimmer 1.5s ease-in-out infinite" : "none",
            }}
          />
        </div>
      )}

      {/* Error retry */}
      {phase === "error" && (
        <button
          onClick={onRetry}
          style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#EF4444", cursor: "pointer", fontFamily: FONT_UI, textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
