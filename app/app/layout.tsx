/// app/app/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/nav/AppNav";
import { ConsentUpdateBanner } from "@/components/consent/ConsentUpdateBanner";

// All onboarding and consent guards have been moved to middleware.ts.
// The layout only enforces authentication — everything else is handled
// before the request even reaches Next.js rendering.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return (
    <div className="min-h-screen" style={{ background: "var(--bz-midnight)" }}>
      <ConsentUpdateBanner />
      <AppNav user={session.user} />
      <main className="md:pl-[210px] pt-14 pb-14 md:pt-0 md:pb-0 min-h-screen overflow-x-hidden">
        {children}
        <div className="scroll-fade" aria-hidden="true" />
      </main>
    </div>
  );
}
