/// app/onboarding/consent/page.tsx
// Server component page — ConsentInner is the "use client" boundary.
// Suspense is required here because ConsentInner calls useSearchParams().
import { Suspense } from "react";
import ConsentInner from "./_inner";

export default function ConsentOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#06090D]">
      <Suspense fallback={<div className="fixed inset-0 bg-[#06090D]" />}>
        <ConsentInner />
      </Suspense>
    </div>
  );
}
