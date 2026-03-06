/// app/api/og/bio-age/route.tsx
// Dynamic OG image for bio age share cards.
// Usage: /api/og/bio-age?score=38.5&chrono=42&delta=-3.5
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const score  = parseFloat(searchParams.get("score")  ?? "0") || 0;
  const chrono = parseFloat(searchParams.get("chrono") ?? "0") || 0;
  const delta  = score - chrono;

  const accentColor =
    delta <= -5  ? "#10B981" :
    delta <= 0   ? "#3B82F6" :
    delta <= 5   ? "#F59E0B" :
                   "#EF4444";

  const headline =
    delta <= -5  ? "Aging younger than your years." :
    delta <= 0   ? "Ahead of the biological curve." :
    delta <= 5   ? "Room to optimize your biology." :
                   "Your biology needs attention.";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 628,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #080810 0%, #0F0F1A 100%)",
          fontFamily: "'Inter', sans-serif",
          position: "relative",
        }}
      >
        {/* BZ mark */}
        <div style={{ position: "absolute", top: 48, left: 64, fontSize: 28, fontWeight: 700, color: "#6366F1", display: "flex" }}>BZ</div>

        {/* Score */}
        <div style={{ fontSize: 120, fontWeight: 300, lineHeight: 1, color: accentColor, display: "flex", marginBottom: 8 }}>
          {score.toFixed(1)}
        </div>
        <div style={{ fontSize: 22, fontWeight: 400, letterSpacing: ".2em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", display: "flex", marginBottom: 24 }}>
          Biological Age
        </div>

        {/* Delta badge */}
        <div style={{
          padding: "10px 28px", borderRadius: 100,
          background: delta <= 0 ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
          border: `1px solid ${delta <= 0 ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.3)"}`,
          fontSize: 24, fontWeight: 300, color: delta <= 0 ? "#34D399" : "#F87171",
          display: "flex", marginBottom: 32,
        }}>
          {delta <= 0 ? "−" : "+"}{Math.abs(delta).toFixed(1)} years {delta <= 0 ? "younger" : "older"}
        </div>

        <div style={{ fontSize: 18, color: "rgba(255,255,255,.5)", display: "flex" }}>{headline}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.25)", marginTop: 8, display: "flex" }}>Chrono age: {chrono}  ·  bluezone.app</div>
      </div>
    ),
    { width: 1200, height: 628 }
  );
}
