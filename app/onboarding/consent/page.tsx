/// app/onboarding/consent/page.tsx
import { Suspense } from "react";
import ConsentInner from "./_inner";

// ConsentInner uses useSearchParams() — must be in its own Suspense boundary
// so Next.js can hydrate the modal independently and attach all event handlers.
export default function ConsentOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#06090D]">
      <Suspense>
        <ConsentInner />
      </Suspense>
    </div>
  );
}
