/// app/auth/signin/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app/onboarding/upload";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("email", { email, callbackUrl, redirect: false });
      if (res?.error) {
        toast.error("Could not send magic link. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      toast.error("Sign-in failed. Check your environment variables and restart the dev server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold shadow-lg">
              BZ
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome to Blue Zone</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Choose your sign-in method</CardTitle>
            <CardDescription>No password required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => signIn("google", { callbackUrl })}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or email magic link</span>
              </div>
            </div>

            {/* Email */}
            {sent ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-sky-50 border border-blue-200 p-4 text-center">
                  <Mail className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-blue-800 font-medium">Check your inbox</p>
                  <p className="text-xs text-blue-600 mt-1">
                    We sent a magic link to <strong>{email}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="w-full text-xs text-center text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmail} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send magic link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-center text-muted-foreground px-4">
          By continuing you agree to our{" "}
          <a href="/terms" className="underline">Terms</a> and{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>.
          Blue Zone is not a medical service.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
