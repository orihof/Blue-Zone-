/// app/app/goals/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { redirect }         from "next/navigation";
import { GoalsClient }      from "./_client";

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return <GoalsClient />;
}
