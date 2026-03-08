/// app/app/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppNav } from "@/components/nav/AppNav";
import { ConsentUpdateBanner } from "@/components/consent/ConsentUpdateBanner";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

// Paths where setup-guard redirect should NOT apply
const SETUP_EXCLUDED = [
  "/app/biomarkers",
  "/app/goals",
  "/app/wearables",
  "/app/results",
  "/app/onboarding",
  "/app/consent",
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const pathname = headers().get("x-pathname") ?? "";

  const isExcluded = SETUP_EXCLUDED.some((p) => pathname.startsWith(p));

  if (!isExcluded) {
    const db = getAdminClient();

    const [{ data: userRow }, { data: profile }] = await Promise.all([
      db.from(TABLES.USERS)
        .select(COLS.ONBOARDING_GOALS)
        .eq(COLS.ID, session.user.id)
        .maybeSingle(),
      db.from(TABLES.PROFILES)
        .select(COLS.ONBOARDING_STEP)
        .eq(COLS.ID, session.user.id)
        .maybeSingle(),
    ]);

    const step     = profile?.onboarding_step as string | null;
    const hasGoals = ((userRow?.onboarding_goals as string[] | null) ?? []).length > 0;

    // Resume onboarding if the user hasn't completed name/goal steps
    if (step === "name") redirect("/onboarding/name");
    if (step === "goal") redirect("/onboarding/goal");

    // Brand-new user — no profile row yet, never set goals
    if (!profile && !hasGoals) redirect("/onboarding/name");

    // Existing guard: if goals never selected and not mid-data-upload step
    if (!hasGoals && step !== "data") redirect("/app/biomarkers");

    // Consent guard: redirect to consent onboarding if user has no consent record
    // Only applies to users who have completed the basic onboarding flow
    const onboardingComplete = hasGoals && step !== "name" && step !== "goal";
    if (onboardingComplete) {
      const { data: consentRow } = await db
        .from("consent_records")
        .select("id")
        .eq(COLS.USER_ID, session.user.id)
        .eq("is_current", true)
        .maybeSingle();

      if (!consentRow) redirect("/onboarding/consent");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bz-midnight)" }}>
      <ConsentUpdateBanner />
      <AppNav user={session.user} />
      <main className="md:pl-[210px] pt-14 pb-14 md:pt-0 md:pb-0 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
