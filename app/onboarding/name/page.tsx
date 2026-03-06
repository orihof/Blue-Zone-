/// app/onboarding/name/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NameClient } from "./_client";

export default async function NamePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  // Extract first name from OAuth provider (Google pre-fill)
  const googleName = session.user.name?.split(" ")[0] ?? null;

  return <NameClient googleName={googleName} />;
}
