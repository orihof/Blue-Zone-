/// app/founding-cohort/WaitlistForm.tsx
"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "founding-cohort" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div style={{ padding: "32px 0", textAlign: "center" }}>
        <div style={{ fontSize: 15, color: "#34D399", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 400, marginBottom: 8 }}>
          ✓ You&apos;re on the list.
        </div>
        <div style={{ fontSize: 14, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
          We&apos;ll be in touch before April 1st.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 420 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            flex: 1,
            minWidth: 200,
            padding: "14px 18px",
            borderRadius: 100,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#F1F5F9",
            fontSize: 14,
            fontFamily: "var(--font-ui,'Inter',sans-serif)",
            fontWeight: 300,
            outline: "none",
          }}
        />
        <button
          type="submit"
          className="cta"
          disabled={status === "submitting"}
          style={{ opacity: status === "submitting" ? 0.7 : 1, whiteSpace: "nowrap" }}
        >
          {status === "submitting" ? "Submitting…" : "Apply for founding access"}
        </button>
      </div>

      {status === "error" && (
        <div style={{ fontSize: 13, color: "#EF4444", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
          {errorMsg}
        </div>
      )}

      <p style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, marginTop: 4 }}>
        No spam. One email when your spot is confirmed.
      </p>
    </form>
  );
}
