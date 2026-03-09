/// app/onboarding/consent/_inner.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ConsentOnboardingModal } from "@/components/consent/ConsentOnboardingModal";

export default function ConsentInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  function handleComplete() {
    const callbackUrl = searchParams.get("callbackUrl") ?? "";
    const destination = callbackUrl.startsWith("/app") ? callbackUrl : "/app/dashboard";
    router.replace(destination);
  }

  return <ConsentOnboardingModal onComplete={handleComplete} />;
}
