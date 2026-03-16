/// components/auth/SignInForm.tsx
"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T = { text: "#F1F5F9", muted: "#64748B" };

export default function SignInForm({ hasGoogle }: { hasGoogle: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/app/dashboard";
      // Use replace so this page is removed from history
      router.replace(callbackUrl);
    }
  }, [status, router, searchParams]);

  // Show nothing while redirecting authenticated users
  if (status === "authenticated") return null;

  async function handleGoogle() {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/app/dashboard" });
    } catch {
      setLoading(false);
      toast.error("Google sign-in failed. Please try again.");
    }
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
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            style={{ width: "100%", padding: "11px 16px", background: loading ? "rgba(255,255,255,0.85)" : "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, color: "#1F2937", fontSize: 14, cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, transition: "all .18s", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#F9FAFB"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#fff"; }}>
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {loading ? "Signing in…" : "Continue with Google"}
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
          <span
            onClick={() => router.push("/app/onboarding")}
            style={{ color: "#A5B4FC", cursor: "pointer" }}
          >
            Get started free
          </span>
        </p>
      </div>
    </div>
  );
}
