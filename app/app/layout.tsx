/// app/(app)/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/nav/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav user={session.user} />
      <main className="pt-16">{children}</main>
    </div>
  );
}
