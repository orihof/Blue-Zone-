"use client";
import { useState } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function EmailCapture() {
  const { track } = useAnalytics();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "ratelimit"
  >("idle");

  const handleSubmit = async () => {
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing_hero" }),
      });
      if (res.status === 429) {
        setStatus("ratelimit");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      track("waitlist_signup", {
        email_domain: email.split("@")[1],
        source: "landing_hero",
      });
    } catch {
      setStatus("error");
    }
  };

  if (status === "success")
    return (
      <div
        style={{
          padding: "12px 14px",
          background: "rgba(0,255,179,0.06)",
          border: "1px solid rgba(0,255,179,0.3)",
          borderRadius: 6,
          fontFamily: "var(--font-label)",
          fontSize: 11,
          color: "var(--bz-teal)",
          textAlign: "center",
        }}
      >
        &check; You&apos;re on the list. We&apos;ll reach out before May 4th.
      </div>
    );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="athlete@email.com"
          aria-label="Email address for waitlist"
          style={{
            flexGrow: 1,
            minWidth: 180,
            height: 40,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: 6,
            padding: "0 14px",
            fontSize: 12,
            fontFamily: "var(--font-label)",
            color: "white",
            outline: "none",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={status === "loading"}
          aria-label="Join Blue Zone waitlist"
          style={{
            height: 40,
            padding: "0 18px",
            background: "transparent",
            border: "1px solid var(--bz-cyan)",
            borderRadius: 6,
            color: "var(--bz-cyan)",
            fontSize: 11,
            fontFamily: "var(--font-label)",
            cursor: "pointer",
            opacity: status === "loading" ? 0.6 : 1,
            touchAction: "manipulation",
            minHeight: 44,
          }}
        >
          {status === "loading" ? "Joining..." : "Join Waitlist"}
        </button>
      </div>
      {status === "error" && (
        <div
          style={{
            fontSize: 10,
            color: "var(--bz-amber)",
            fontFamily: "var(--font-label)",
            marginTop: 6,
          }}
        >
          Something went wrong. Try again.
        </div>
      )}
      {status === "ratelimit" && (
        <div
          style={{
            fontSize: 10,
            color: "var(--bz-amber)",
            fontFamily: "var(--font-label)",
            marginTop: 6,
          }}
        >
          Too many attempts. Please wait a minute.
        </div>
      )}
    </div>
  );
}
