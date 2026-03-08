/// app/onboarding/consent/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ConsentOnboardingModal } from "@/components/consent/ConsentOnboardingModal";

export default function ConsentOnboardingPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  function handleComplete() {
    const callbackUrl = searchParams.get("callbackUrl") ?? "";
    const destination = callbackUrl.startsWith("/app") ? callbackUrl : "/app/dashboard";
    router.replace(destination);
  }

  return (
    <div className="min-h-screen bg-[#06090D]">
      <ConsentOnboardingModal onComplete={handleComplete} />
    </div>
  );
}
