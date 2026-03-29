/// app/og/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #0A0A0F 0%, #0D0D1A 100%)",
          }}
        />
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 20%, rgba(99,102,241,0.15), transparent 60%)",
          }}
        />

        {/* Content layer */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Left column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "80px",
              width: "55%",
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 18,
                fontWeight: 500,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#6366F1",
                }}
              />
              Blue Zone
            </div>

            {/* Headline */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 48,
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              <span style={{ color: "rgba(139,92,246,0.9)" }}>
                You have the data.
              </span>
              <span style={{ color: "rgba(139,92,246,0.9)" }}>
                You still don&apos;t
              </span>
              <span style={{ color: "#FFFFFF" }}>have the answer.</span>
            </div>

            {/* Subtext */}
            <div
              style={{
                marginTop: 32,
                fontSize: 20,
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Blood + training intelligence for serious athletes.
            </div>
          </div>

          {/* Right column */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "45%",
            }}
          >
            {/* Protocol card mockup */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 340,
                padding: 24,
                background: "rgba(17,17,24,0.9)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
              }}
            >
              {/* Signal rows */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  Ferritin
                </span>
                <span style={{ fontSize: 13, color: "#FB923C" }}>
                  62 ng/mL ↓ Low
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  Training load
                </span>
                <span style={{ fontSize: 13, color: "#6366F1" }}>
                  ↑ High this week
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  Sleep quality
                </span>
                <span style={{ fontSize: 13, color: "#FB923C" }}>
                  ↓ Low · 3 nights
                </span>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                  margin: "12px 0",
                }}
              />

              {/* Protocol output */}
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.15em",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase" as const,
                }}
              >
                YOUR PROTOCOL
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  marginTop: 4,
                }}
              >
                Iron bisglycinate
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#6366F1",
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                25 mg
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(99,102,241,0.6)",
                  marginTop: 8,
                }}
              >
                ↑ Derived from 3 signals
              </div>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            padding: "24px 80px",
          }}
        >
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>
            bluezone.ai
          </span>
          <span style={{ fontSize: 14, color: "rgba(99,102,241,0.5)" }}>
            Free founding cohort — 50 spots
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
