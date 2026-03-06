"use client";
/// components/bio-age/BioAgeShareSheet.tsx
// 4-platform share sheet with Canvas-based card generation (no html2canvas).

import { useRef, useState } from "react";

interface BioAgeShareSheetProps {
  biologicalAge:    number;
  chronologicalAge: number;
  delta:            number;
  onClose:          () => void;
}

type Platform = "twitter" | "instagram" | "story" | "linkedin";

const PLATFORMS: { id: Platform; label: string; size: string; w: number; h: number }[] = [
  { id: "twitter",   label: "Twitter / X",  size: "1200×628",   w: 1200, h: 628  },
  { id: "instagram", label: "Instagram",     size: "1080×1080",  w: 1080, h: 1080 },
  { id: "story",     label: "Story",         size: "1080×1920",  w: 1080, h: 1920 },
  { id: "linkedin",  label: "LinkedIn",      size: "1200×628",   w: 1200, h: 628  },
];

function generateCard(
  canvas: HTMLCanvasElement,
  platform: Platform,
  biologicalAge: number,
  chronologicalAge: number,
  delta: number,
): void {
  const { w, h } = PLATFORMS.find(p => p.id === platform)!;
  const dpr = 2;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = `${w / 4}px`;
  canvas.style.height = `${h / 4}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const accentColor =
    delta <= -5  ? "#10B981" :
    delta <= 0   ? "#3B82F6" :
    delta <= 5   ? "#F59E0B" :
                   "#EF4444";

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#080810");
  bg.addColorStop(1, "#0F0F1A");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Ambient glow (top center)
  const glow = ctx.createRadialGradient(w / 2, h * .35, 0, w / 2, h * .35, Math.min(w, h) * .45);
  glow.addColorStop(0, accentColor + "22");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Ring
  const cx     = w / 2;
  const cy     = h * (platform === "story" ? .38 : .42);
  const radius = Math.min(w, h) * (platform === "story" ? .18 : .22);
  const lineW  = radius * .09;
  const circumference = 2 * Math.PI * radius;
  const pct    = Math.max(0, Math.min(100, ((20 - delta) / 40) * 100));
  const arcEnd = circumference * (pct / 100);

  ctx.lineCap = "round";

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth   = lineW;
  ctx.stroke();

  // Progress
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (arcEnd / radius));
  ctx.strokeStyle = accentColor;
  ctx.lineWidth   = lineW;
  ctx.shadowColor  = accentColor;
  ctx.shadowBlur   = 18;
  ctx.stroke();
  ctx.shadowBlur   = 0;

  // Center: bio age number
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle    = accentColor;
  ctx.font         = `300 ${radius * .55}px 'Syne', sans-serif`;
  ctx.fillText(biologicalAge.toFixed(1), cx, cy - radius * .08);

  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.font      = `400 ${radius * .16}px 'Inter', sans-serif`;
  ctx.fillText("BIOLOGICAL AGE", cx, cy + radius * .22);

  ctx.fillStyle = delta <= 0 ? "#34D399" : "#F87171";
  ctx.font      = `300 ${radius * .19}px 'JetBrains Mono', monospace`;
  ctx.fillText(`${delta <= 0 ? "−" : "+"}${Math.abs(delta).toFixed(1)}y`, cx, cy + radius * .44);

  // Bottom tagline
  const tagY = platform === "story" ? h * .68 : h * .75;
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.font      = `300 ${Math.min(w, h) * .022}px 'Inter', sans-serif`;
  ctx.fillText(`Chrono age: ${chronologicalAge}  ·  Blue Zone`, cx, tagY);

  // BZ mark (top-left)
  ctx.fillStyle = "#6366F1";
  ctx.font      = `600 ${Math.min(w, h) * .028}px 'Inter', sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("BZ", w * .045, h * .055);
}

export function BioAgeShareSheet({ biologicalAge, chronologicalAge, delta, onClose }: BioAgeShareSheetProps) {
  const [selected, setSelected] = useState<Platform>("twitter");
  const [copying,  setCopying]  = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedPlatform = PLATFORMS.find(p => p.id === selected)!;

  function renderCard(platform: Platform) {
    setSelected(platform);
    requestAnimationFrame(() => {
      if (canvasRef.current) {
        generateCard(canvasRef.current, platform, biologicalAge, chronologicalAge, delta);
      }
    });
  }

  // Render on first paint
  function onCanvasRef(el: HTMLCanvasElement | null) {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
    if (el) generateCard(el, selected, biologicalAge, chronologicalAge, delta);
  }

  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (selected === "twitter") {
      const text  = encodeURIComponent(`My biological age is ${biologicalAge.toFixed(1)}${delta <= 0 ? ` — ${Math.abs(delta).toFixed(1)} years younger than my actual age` : ""}. Track yours with Blue Zone. 🧬`);
      window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
      return;
    }

    // Download for Instagram / Story / LinkedIn
    setCopying(true);
    try {
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href    = url;
        a.download = `bio-age-${selected}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopying(false);
      }, "image/png");
    } catch {
      setCopying(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 520,
        background: "#111118", borderRadius: "16px 16px 0 0",
        padding: "20px 20px 32px",
        animation: "slideUp .3s cubic-bezier(.16,1,.3,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#F1F5F9", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Share your score</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748B", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Platform tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => renderCard(p.id)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, cursor: "pointer",
                fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400,
                background: selected === p.id ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
                border: `1px solid ${selected === p.id ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.08)"}`,
                color: selected === p.id ? "#A5B4FC" : "#64748B",
              }}
            >
              {p.label}
              <div style={{ fontSize: 9, marginTop: 2, opacity: .6 }}>{p.size}</div>
            </button>
          ))}
        </div>

        {/* Canvas preview */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, background: "rgba(255,255,255,.02)", borderRadius: 10, padding: 12 }}>
          <canvas
            ref={onCanvasRef}
            style={{ borderRadius: 8, maxWidth: "100%", display: "block" }}
          />
        </div>

        {/* Action button */}
        <button
          onClick={handleShare}
          disabled={copying}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 8,
            background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
            border: "none", cursor: copying ? "not-allowed" : "pointer",
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            fontSize: 14, fontWeight: 500, color: "#fff", opacity: copying ? .6 : 1,
          }}
        >
          {selected === "twitter" ? "Post to X →" : copying ? "Downloading…" : `Download for ${selectedPlatform.label} →`}
        </button>
      </div>

      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
