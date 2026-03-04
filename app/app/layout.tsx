/// app/(app)/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/nav/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return (
    <div className="min-h-screen" style={{ background: "var(--bz-midnight)" }}>
      <AppNav user={session.user} />
      {/* Desktop: offset for 240px sidebar. Mobile: top-14 header + bottom-14 tab bar padding */}
      <main className="lg:pl-60 pt-14 pb-16 lg:pt-0 lg:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
