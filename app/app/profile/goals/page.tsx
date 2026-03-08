/// app/app/profile/goals/page.tsx
// Secondary goal selection — available 30 days after onboarding.
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { redirect }         from "next/navigation";
import { getAdminClient }   from "@/lib/supabase/admin";
import { TABLES, COLS }     from "@/lib/db/schema";
import { GoalPickerClient } from "./_client";

export default async function ProfileGoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getAdminClient();
  const { data } = await supabase
    .from(TABLES.PROFILES)
    .select(`${COLS.PRIMARY_GOAL}, ${COLS.SECONDARY_GOAL}, ${COLS.ONBOARDING_COMPLETED_AT}`)
    .eq(COLS.ID, session.user.id)
    .maybeSingle();

  const primaryGoal           = (data?.primary_goal        as string | null) ?? null;
  const secondaryGoal         = (data?.secondary_goal      as string | null) ?? null;
  const onboardingCompletedAt = (data?.onboarding_completed_at as string | null) ?? null;

  return (
    <GoalPickerClient
      primaryGoal={primaryGoal}
      secondaryGoal={secondaryGoal}
      onboardingCompletedAt={onboardingCompletedAt}
    />
  );
}
