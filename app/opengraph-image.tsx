import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Blue Zone biological age score: 34 years, 4 years younger than chronological age";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#090d1a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span
            style={{
              color: "#8fa3cc",
              fontSize: 18,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            BLUE ZONE
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                color: "#f0f4ff",
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              Your Biological Age.
            </span>
            <span
              style={{
                color: "#f0f4ff",
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              Optimized for Performance.
            </span>
          </div>
          <span style={{ color: "#06b6d4", fontSize: 20 }}>
            Blood + wearables. One score. One protocol.
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
