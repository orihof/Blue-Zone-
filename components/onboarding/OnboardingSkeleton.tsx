// Server component — no 'use client'
// Mirrors Step 1 (name) layout: heading + subtitle + name input placeholder

export function OnboardingSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Heading placeholder */}
        <div
          className="animate-shimmer"
          style={{
            height: "2.25rem",
            width: "60%",
            borderRadius: "6px",
            marginBottom: "0.75rem",
            background:
              "linear-gradient(90deg, #0b0c18 0%, #0f1120 50%, #0b0c18 100%)",
            backgroundSize: "200% 100%",
          }}
        />

        {/* Subtitle placeholder */}
        <div
          className="animate-shimmer"
          style={{
            height: "1rem",
            width: "80%",
            borderRadius: "4px",
            marginBottom: "0.5rem",
            background:
              "linear-gradient(90deg, #0b0c18 0%, #0f1120 50%, #0b0c18 100%)",
            backgroundSize: "200% 100%",
          }}
        />
        <div
          className="animate-shimmer"
          style={{
            height: "1rem",
            width: "55%",
            borderRadius: "4px",
            marginBottom: "2rem",
            background:
              "linear-gradient(90deg, #0b0c18 0%, #0f1120 50%, #0b0c18 100%)",
            backgroundSize: "200% 100%",
          }}
        />

        {/* Name input placeholder */}
        <div
          className="animate-shimmer"
          style={{
            height: "3rem",
            width: "100%",
            borderRadius: "8px",
            background:
              "linear-gradient(90deg, #0b0c18 0%, #0f1120 50%, #0b0c18 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    </div>
  );
}
