/// app/auth/signin/page.tsx
import { Suspense } from "react";
import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
  const hasGoogle = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  return (
    <Suspense>
      <SignInForm hasGoogle={hasGoogle} />
    </Suspense>
  );
}
