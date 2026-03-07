import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "var(--void)", color: "var(--stellar)" }}>
      <p style={{ fontSize: 13, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
        Page not found.
      </p>
      <Link href="/" style={{ fontSize: 12, color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
        Go home
      </Link>
    </div>
  );
}
