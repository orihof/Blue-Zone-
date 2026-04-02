import { ImageResponse } from "next/og";

export const runtime = "edge";
export const revalidate = 86400; // cache OG image for 24 hours

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#050A1F",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          padding: "60px 80px",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 14,
            color: "#6677AA",
            letterSpacing: "0.2em",
            marginBottom: 24,
            display: "flex",
          }}
        >
          BLUE ZONE
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 72,
            color: "white",
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.05,
            marginBottom: 28,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          What&apos;s dragging your VO₂max?
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#6677AA",
            textAlign: "center",
            marginBottom: 40,
            display: "flex",
          }}
        >
          Your complete biological readout. Every system. Every morning.
        </div>

        {/* Credibility badge */}
        <div
          style={{
            padding: "12px 28px",
            background: "rgba(0,212,255,0.08)",
            border: "1px solid rgba(0,212,255,0.35)",
            borderRadius: 8,
            fontSize: 18,
            color: "#00D4FF",
            display: "flex",
            letterSpacing: "0.04em",
          }}
        >
          Built with 18 world-class longevity scientists
        </div>

        {/* Bottom metric strip */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            display: "flex",
            gap: 48,
            alignItems: "center",
          }}
        >
          {["BIO AGE SCORE", "VO₂MAX", "HRV", "8 DOMAINS"].map((label) => (
            <div
              key={label}
              style={{
                fontSize: 13,
                color: "rgba(0,212,255,0.5)",
                letterSpacing: "0.12em",
                display: "flex",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
