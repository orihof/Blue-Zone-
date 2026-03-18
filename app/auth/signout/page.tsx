/// app/auth/signout/page.tsx

import { Suspense } from "react";
import SignOutCard from "./_components/SignOutCard";

export const metadata = {
  title: "Sign out — Blue Zone",
};

export default function SignOutPage() {
  return (
    <Suspense>
      <SignOutCard />
    </Suspense>
  );
}
