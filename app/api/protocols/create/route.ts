/// app/api/protocols/create/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { generateDemo } from "@/lib/recommendations/generateDemo";
import type { Goal, BudgetTier, Preferences } from "@/lib/recommendations/generate";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { selectedAge, goals, budget, preferences, isDemo } = body ?? {};

  // Validate
  if (
    typeof selectedAge !== "number" ||
    selectedAge < 23 ||
    selectedAge > 60 ||
    !Array.isArray(goals) ||
    goals.length === 0 ||
    !["low", "medium", "high"].includes(budget)
  ) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const payload = generateDemo(
    selectedAge,
    goals as Goal[],
    budget as BudgetTier,
    (preferences ?? {}) as Preferences
  );

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.PROTOCOLS)
    .insert({
      [COLS.USER_ID]: session.user.id,
      [COLS.SELECTED_AGE]: selectedAge,
      [COLS.GOALS]: goals,
      [COLS.BUDGET]: budget,
      [COLS.PREFERENCES]: preferences ?? {},
      [COLS.PAYLOAD]: payload,
      [COLS.MODE]: isDemo ? "demo" : "personal",
    })
    .select(COLS.ID)
    .maybeSingle();

  if (error) {
    console.error("[protocols/create]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ protocolId: data!.id });
}
