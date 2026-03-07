"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: "#070710", color: "#F1F5F9", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>Something went wrong.</p>
          <button onClick={reset} style={{ fontSize: 13, color: "#6366F1", background: "none", border: "1px solid rgba(99,102,241,.3)", borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
