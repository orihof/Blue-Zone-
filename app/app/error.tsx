"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
      <p style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
        {error.message || "Something went wrong."}
      </p>
      <button
        onClick={reset}
        style={{ fontSize: 12, color: "#6366F1", background: "none", border: "1px solid rgba(99,102,241,.3)", borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
      >
        Try again
      </button>
    </div>
  );
}
