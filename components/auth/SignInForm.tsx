/// components/auth/SignInForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };

export default function SignInForm({ hasGoogle }: { hasGoogle: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/app/dashboard" });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email address"); return; }
    setLoading(true);
    const res = await signIn("email", { email, redirect: false, callbackUrl: "/app/dashboard" });
    setLoading(false);
    if (res?.error) toast.error("Failed to send magic link. Try again.");
    else toast.success("Magic link sent! Check your inbox.");
  }

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div className="card fu" style={{ width: "100%", maxWidth: 420, padding: 36 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {/* Logo */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 18px rgba(99,102,241,0.4)" }}>⬡</div>
            <span style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 18, letterSpacing: "-.02em", background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Blue Zone</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 300, fontSize: 26, color: T.text, marginBottom: 6, letterSpacing: "-.02em" }}>Welcome back</h2>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>Sign in to access your protocol</p>
        </div>

        {hasGoogle && (
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{ width: "100%", padding: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: T.text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300, transition: "all .18s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
            <span>🔵</span> Continue with Google
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        </div>

        <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input
            className="input"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="cta" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
            {loading ? "Sending…" : "Send Magic Link"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 300 }}>
          No account?{" "}
          <a href="/app/onboarding/upload" style={{ color: "#A5B4FC", cursor: "pointer" }}>
            Get started free
          </a>
        </p>
      </div>
    </div>
  );
}
