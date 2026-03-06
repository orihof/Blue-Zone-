/// app/auth/signin/page.tsx
import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
  // Always show the Google button — NextAuth will return a Configuration error
  // if credentials are not yet set, which is the expected dev-time behaviour.
  const hasGoogle = true;
  return (
    <Suspense>
      <SignInForm hasGoogle={hasGoogle} />
    </Suspense>
  );
}
