"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AuthCallbackPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // If user has already set goals, land on their protocol; otherwise start setup
      fetch("/api/user/onboarding")
        .then((r) => r.json())
        .then(({ goals }: { goals: string[] }) => {
          if (goals && goals.length > 0) {
            router.replace("/app/results");   // redirects to latest protocol
          } else {
            router.replace("/app/goals"); // first-time setup flow — goal selection
          }
        })
        .catch(() => router.replace("/app/goals"));
    } else if (status === "unauthenticated") {
      router.replace("/auth/signin");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
