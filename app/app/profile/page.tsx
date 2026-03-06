/// app/app/profile/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { ProfileClient } from "./_client";

function computeWeekStreak(weekNumbers: number[]): number {
  if (weekNumbers.length === 0) return 0;
  const unique = Array.from(new Set(weekNumbers)).sort((a, b) => b - a);
  const now = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  if (unique[0] < now - 1) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i - 1] - unique[i] === 1) streak++;
    else break;
  }
  return streak;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const userId   = session.user.id;

  const [profileRes, userRes, sportsRes, goalRes, checkinsRes, wearableRes] =
    await Promise.all([
      supabase.from(TABLES.PROFILES)
        .select("name, tagline, location, prs, avatar_url, primary_goal, profile_nudge_dismissed")
        .eq(COLS.ID, userId).single(),
      supabase.from(TABLES.USERS)
        .select("email, created_at, onboarding_goals, image")
        .eq(COLS.ID, userId).single(),
      supabase.from(TABLES.SPORTS_PROTOCOLS)
        .select("id, competition_type, budget_tier, created_at")
        .eq(COLS.USER_ID, userId).eq(COLS.STATUS, "ready")
        .order(COLS.CREATED_AT, { ascending: false }).limit(8),
      supabase.from(TABLES.GOAL_PROTOCOLS)
        .select("id, category, budget_tier, created_at")
        .eq(COLS.USER_ID, userId).eq(COLS.STATUS, "ready")
        .order(COLS.CREATED_AT, { ascending: false }).limit(8),
      supabase.from(TABLES.CHECKIN_RESPONSES)
        .select("week_number").eq(COLS.USER_ID, userId),
      supabase.from(TABLES.WEARABLE_CONNECTIONS)
        .select("provider").eq(COLS.USER_ID, userId),
    ]);

  const profile  = profileRes.data;
  const user     = userRes.data;
  const checkins = checkinsRes.data ?? [];

  const protocols = [
    ...(sportsRes.data ?? []).map(p => ({
      id: p.id as string, label: p.competition_type as string,
      budgetTier: p.budget_tier as number | null,
      createdAt: p.created_at as string,
      route: `/app/results/sports/${p.id}`, type: "sports",
    })),
    ...(goalRes.data ?? []).map(p => ({
      id: p.id as string, label: p.category as string,
      budgetTier: p.budget_tier as number | null,
      createdAt: p.created_at as string,
      route: `/app/results/goal/${p.id}`, type: "goal",
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const goals: string[] = [];
  if (profile?.primary_goal) goals.push(profile.primary_goal as string);
  for (const g of (user?.onboarding_goals as string[] | null) ?? []) {
    if (!goals.includes(g)) goals.push(g);
  }

  return (
    <ProfileClient
      userId={userId}
      initialProfile={{
        name:                  (profile?.name ?? session.user.name ?? null),
        tagline:               profile?.tagline as string ?? null,
        location:              profile?.location as string ?? null,
        prs:                   (profile?.prs as Record<string, string>) ?? {},
        avatarUrl:             profile?.avatar_url as string ?? user?.image as string ?? session.user.image ?? null,
        primaryGoal:           profile?.primary_goal as string ?? null,
        profileNudgeDismissed: (profile?.profile_nudge_dismissed as boolean) ?? false,
        goals,
      }}
      email={user?.email as string ?? session.user.email ?? ""}
      memberSince={user?.created_at as string ?? null}
      protocolCount={protocols.length}
      totalCheckIns={checkins.length}
      weekStreak={computeWeekStreak(checkins.map(c => c.week_number as number))}
      protocols={protocols}
      connectedDevices={(wearableRes.data ?? []).map(d => ({ provider: d.provider as string }))}
    />
  );
}
