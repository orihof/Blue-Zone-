/// app/onboarding/name/_client.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const GT = {
  background: GRAD,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};
const T = { text: "#F1F5F9", muted: "#64748B", border: "rgba(255,255,255,0.1)" };

interface Props {
  googleName: string | null;
}

export function NameClient({ googleName }: Props) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name,    setName]    = useState(googleName ?? "");
  const [loading, setLoading] = useState(false);

  // Auto-focus the input when no Google name (user must type)
  useEffect(() => {
    if (!googleName) {
      inputRef.current?.focus();
    }
  }, [googleName]);

  const trimmed   = name.trim();
  const hasName   = trimmed.length > 0;
  const ctaLabel  = hasName ? `Let's go, ${trimmed} →` : "Let's go →";

  async function handleSubmit() {
    if (!hasName || loading) return;
    setLoading(true);
    await fetch("/api/onboarding/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, onboarding_step: "goal" }),
    });
    router.push("/onboarding/goal");
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && hasName) handleSubmit();
  }

  return (
    <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
      {/* Overline */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 14px", borderRadius: 100,
        background: "rgba(99,102,241,.09)", border: "1px solid rgba(99,102,241,.2)",
        fontSize: 10, fontWeight: 400, letterSpacing: ".1em", color: "#A5B4FC",
        marginBottom: 28, fontFamily: "var(--font-ui,'Inter',sans-serif)",
        textTransform: "uppercase" as const,
      }}>
        STEP 1 OF 2 · Getting started
      </div>

      {/* Heading */}
      <h1 style={{
        fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300,
        fontSize: "clamp(28px,5vw,40px)", lineHeight: 1.15,
        letterSpacing: "-.02em", marginBottom: 10,
      }}>
        {googleName ? (
          <>
            <span style={GT}>Hey, {googleName}.</span>
            <br />
            <span style={{ color: T.text }}>Is that right?</span>
          </>
        ) : (
          <>
            <span style={{ color: T.text }}>What should we</span>
            <br />
            <span style={GT}>call you?</span>
          </>
        )}
      </h1>

      <p style={{
        fontSize: 14, color: T.muted, marginBottom: 36,
        fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, lineHeight: 1.65,
      }}>
        Your protocol will feel personal from day one.
      </p>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Your first name"
        maxLength={50}
        autoComplete="given-name"
        style={{
          width: "100%",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${hasName ? "rgba(99,102,241,.5)" : T.border}`,
          borderRadius: 12,
          fontSize: 17,
          color: T.text,
          fontFamily: "var(--font-ui,'Inter',sans-serif)",
          fontWeight: 300,
          outline: "none",
          marginBottom: 16,
          transition: "border-color .18s",
          boxSizing: "border-box" as const,
          textAlign: "center" as const,
          letterSpacing: ".01em",
        }}
      />

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={!hasName || loading}
        style={{
          width: "100%",
          padding: "15px 24px",
          background: hasName ? GRAD : "rgba(255,255,255,0.05)",
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 500,
          color: hasName ? "#fff" : T.muted,
          fontFamily: "var(--font-ui,'Inter',sans-serif)",
          cursor: hasName ? "pointer" : "default",
          transition: "all .2s",
          letterSpacing: ".01em",
        }}
      >
        {loading ? "Saving…" : ctaLabel}
      </button>

      {/* Skip link */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={async () => {
            await fetch("/api/onboarding/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ onboarding_step: "goal" }),
            });
            router.push("/onboarding/goal");
          }}
          style={{
            background: "none", border: "none",
            fontSize: 13, color: T.muted,
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            fontWeight: 300, cursor: "pointer",
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
