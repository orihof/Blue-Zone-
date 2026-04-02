"use client";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function BioAgeCardPreview() {
  const { track } = useAnalytics();
  return (
    <div
      style={{
        padding: "12px 14px",
        marginTop: 8,
        background: "rgba(0,212,255,0.02)",
        border: "1px dashed rgba(0,212,255,0.2)",
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--bz-muted)",
          fontFamily: "var(--font-label)",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        YOUR SHAREABLE BIO AGE CARD
      </div>
      <div
        style={{
          background: "#050A1F",
          border: "1px solid rgba(0,212,255,0.3)",
          borderRadius: 6,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 28,
              color: "white",
              fontFamily: "var(--font-data)",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            31
          </div>
          <div
            style={{
              fontSize: 8,
              color: "var(--bz-muted)",
              fontFamily: "var(--font-label)",
            }}
          >
            BIO AGE
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 8,
              color: "var(--bz-teal)",
              fontFamily: "var(--font-label)",
              marginBottom: 3,
            }}
          >
            7 YRS YOUNGER THAN PASSPORT
          </div>
          <div
            style={{
              fontSize: 8,
              color: "var(--bz-muted)",
              fontFamily: "var(--font-label)",
            }}
          >
            Top 12% of athletes my age
          </div>
        </div>
        <div
          style={{
            fontSize: 8,
            color: "var(--bz-cyan)",
            fontFamily: "var(--font-label)",
            flexShrink: 0,
          }}
        >
          BLUE ZONE
        </div>
      </div>
      <button
        onClick={() => {
          track("bio_age_card_preview", {});
          window.location.href = "/onboard";
        }}
        style={{
          marginTop: 6,
          background: "none",
          border: "none",
          padding: 0,
          fontSize: 9,
          color: "var(--bz-cyan)",
          fontFamily: "var(--font-label)",
          cursor: "pointer",
          letterSpacing: "0.06em",
          minHeight: 44,
          touchAction: "manipulation",
        }}
      >
        Get yours &rarr;
      </button>
    </div>
  );
}
