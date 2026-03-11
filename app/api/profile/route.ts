/// app/api/profile/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";

function computeWeekStreak(weekNumbers: number[]): number {
  if (weekNumbers.length === 0) return 0;
  const unique = Array.from(new Set(weekNumbers)).sort((a, b) => b - a);
  // Current week number since Unix epoch
  const now = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  if (unique[0] < now - 1) return 0; // no recent check-in
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i - 1] - unique[i] === 1) streak++;
    else break;
  }
  return streak;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const userId   = session.user.id;

  const [profileRes, userRes, sportsRes, goalRes, checkinsRes, wearableRes] =
    await Promise.all([
      supabase.from(TABLES.PROFILES)
        .select("name, tagline, location, prs, avatar_url, primary_goal, profile_nudge_dismissed")
        .eq(COLS.ID, userId).maybeSingle(),
      supabase.from(TABLES.USERS)
        .select("email, created_at, onboarding_goals, image")
        .eq(COLS.ID, userId).maybeSingle(),
      supabase.from(TABLES.SPORTS_PROTOCOLS)
        .select("id, competition_type, budget_tier, created_at")
        .eq(COLS.USER_ID, userId).eq(COLS.STATUS, "ready")
        .order(COLS.CREATED_AT, { ascending: false }).limit(8),
      supabase.from(TABLES.GOAL_PROTOCOLS)
        .select("id, category, budget_tier, created_at")
        .eq(COLS.USER_ID, userId).eq(COLS.STATUS, "ready")
        .order(COLS.CREATED_AT, { ascending: false }).limit(8),
      supabase.from(TABLES.CHECKIN_RESPONSES)
        .select("id, week_number, created_at")
        .eq(COLS.USER_ID, userId),
      supabase.from(TABLES.WEARABLE_CONNECTIONS)
        .select("provider")
        .eq(COLS.USER_ID, userId),
    ]);

  const profile = profileRes.data;
  const user    = userRes.data;

  // Merge protocol history and sort by date
  const protocols = [
    ...(sportsRes.data ?? []).map(p => ({
      id: p.id, label: p.competition_type, budgetTier: p.budget_tier as number | null,
      createdAt: p.created_at as string, route: `/app/results/sports/${p.id}`, type: "sports",
    })),
    ...(goalRes.data ?? []).map(p => ({
      id: p.id, label: p.category, budgetTier: p.budget_tier as number | null,
      createdAt: p.created_at as string, route: `/app/results/goal/${p.id}`, type: "goal",
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const checkins    = checkinsRes.data ?? [];
  const weekStreak  = computeWeekStreak(checkins.map(c => c.week_number as number));

  // Combine goals: primary_goal (from profiles) + legacy onboarding_goals (from users)
  const goals: string[] = [];
  if (profile?.primary_goal) goals.push(profile.primary_goal);
  const legacyGoals = (user?.onboarding_goals as string[] | null) ?? [];
  for (const g of legacyGoals) {
    if (!goals.includes(g)) goals.push(g);
  }

  return NextResponse.json({
    name:                   profile?.name ?? session.user.name ?? null,
    tagline:                profile?.tagline ?? null,
    location:               profile?.location ?? null,
    prs:                    (profile?.prs as Record<string, string>) ?? {},
    avatarUrl:              profile?.avatar_url ?? user?.image ?? session.user.image ?? null,
    primaryGoal:            profile?.primary_goal ?? null,
    profileNudgeDismissed:  profile?.profile_nudge_dismissed ?? false,
    email:                  user?.email ?? session.user.email ?? null,
    memberSince:            user?.created_at ?? null,
    goals,
    protocolCount:          protocols.length,
    totalCheckIns:          checkins.length,
    weekStreak,
    protocols,
    connectedDevices:       (wearableRes.data ?? []).map(d => ({ provider: d.provider as string })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: Record<string, unknown> = await req.json();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Existing profile fields
  if (body.name                   !== undefined) update.name                    = body.name;
  if (body.tagline                !== undefined) update.tagline                 = body.tagline;
  if (body.location               !== undefined) update.location                = body.location;
  if (body.prs                    !== undefined) update.prs                     = body.prs;
  if (body.profileNudgeDismissed  !== undefined) update.profile_nudge_dismissed = body.profileNudgeDismissed;

  // Biomarker engine intake fields (migration 014)
  if (body.biologicalSex        !== undefined) update.biological_sex       = body.biologicalSex;
  if (body.heightCm             !== undefined) update.height_cm            = body.heightCm;
  if (body.weightKg             !== undefined) update.weight_kg            = body.weightKg;
  if (body.activityLevel        !== undefined) update.activity_level       = body.activityLevel;
  if (body.athleteArchetype     !== undefined) update.athlete_archetype    = body.athleteArchetype;
  if (body.healthGoals          !== undefined) update.health_goals         = body.healthGoals;
  if (body.currentMedications   !== undefined) update.current_medications  = body.currentMedications;
  if (body.currentSupplements   !== undefined) update.current_supplements  = body.currentSupplements;
  if (body.conditions           !== undefined) update.conditions           = body.conditions;

  const supabase = getAdminClient();
  const { error } = await supabase
    .from(TABLES.PROFILES)
    .upsert({ id: session.user.id, ...update });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
