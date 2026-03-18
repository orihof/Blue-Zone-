/// app/auth/signout/_components/SignOutCard.tsx
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function SignOutCard() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sanitise callbackUrl — only allow relative paths to prevent open redirect
  const raw = searchParams.get("callbackUrl") ?? "/auth/signin";
  const callbackUrl = raw.startsWith("/") ? raw : "/auth/signin";

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await signOut({ callbackUrl });
    } catch {
      setIsLoading(false);
      toast.error("Something went wrong. Please try again.");
    }
  }

  function handleCancel() {
    router.push("/app/dashboard");
  }

  return (
    <div
      className="relative overflow-hidden flex items-center justify-center min-h-screen bg-[#0A0A0F]"
    >
      {/* Radial gradient atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 600px 400px at 50% 40%, rgba(56,115,255,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm mx-4 bg-[#111118] border border-white/[0.06] rounded-2xl p-8"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
      >
        {/* Icon lockup */}
        <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
          <LogOut size={20} className="text-white/40" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h1 className="font-syne text-xl font-semibold text-white text-center mb-2">
          Sign out?
        </h1>

        {/* Body copy */}
        <p className="text-sm text-white/50 text-center mb-8 leading-relaxed">
          You&apos;ll need to sign back in to access your protocol and health data.
        </p>

        {/* Button group */}
        <div className="flex flex-col gap-3">
          {/* Primary — Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? "Signing out…" : "Sign out"}
            className={[
              "w-full h-11 rounded-xl text-sm font-medium text-white flex items-center justify-center transition-opacity duration-150",
              isLoading
                ? "opacity-60 cursor-not-allowed"
                : "hover:opacity-90",
            ].join(" ")}
            style={{
              background: "linear-gradient(135deg, #3873FF 0%, #7B5CE8 100%)",
            }}
          >
            {isLoading ? (
              <svg
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  stroke="white"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
                <path
                  d="M7 1.5A5.5 5.5 0 0 1 12.5 7"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <>
                <LogOut size={14} className="mr-2" aria-hidden="true" />
                Sign out
              </>
            )}
          </button>

          {/* Ghost — Cancel */}
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className={[
              "w-full h-11 rounded-xl border border-white/[0.08] text-sm font-medium text-white/60 flex items-center justify-center transition-colors duration-150",
              isLoading
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-white/[0.03]",
            ].join(" ")}
          >
            <ArrowLeft size={14} className="mr-2" aria-hidden="true" />
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
