export default function LeftColumnSkeleton() {
  return (
    <div
      style={{
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Real headline text — this is the LCP element */}
      <div>
        <div className="bz-mono-label" style={{ marginBottom: 8 }}>
          FOUNDING ATHLETE ACCESS
        </div>
        <h1
          style={{
            fontFamily: "var(--font-label)",
            fontSize: 38,
            color: "white",
            lineHeight: 1.15,
            margin: "0 0 12px",
            fontWeight: 400,
          }}
        >
          What&apos;s dragging your VO&#x2082;max?
        </h1>
        <p
          style={{
            fontFamily: "var(--font-label)",
            fontSize: 15,
            color: "var(--bz-muted)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Your complete biological readout. Every system. Every morning. Built
          with{" "}
          <strong style={{ color: "var(--bz-text)" }}>
            18 world-class longevity scientists
          </strong>
          .
        </p>
      </div>

      {/* Ring skeleton */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          margin: "0 auto",
          border: "3px solid rgba(0,212,255,0.12)",
          background:
            "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 9,
              color: "var(--bz-muted)",
              fontFamily: "var(--font-label)",
            }}
          >
            BIO AGE
          </div>
          <div
            style={{
              fontSize: 46,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-data)",
              fontWeight: 700,
            }}
          >
            &mdash;
          </div>
        </div>
      </div>

      {/* Domain card skeletons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 42,
            borderRadius: 6,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(0,212,255,0.08)",
            borderLeft: "3px solid rgba(0,212,255,0.15)",
          }}
        />
      ))}

      {/* CTA skeleton */}
      <div
        style={{
          height: 46,
          borderRadius: 6,
          background: "rgba(0,212,255,0.12)",
        }}
      />
    </div>
  );
}
