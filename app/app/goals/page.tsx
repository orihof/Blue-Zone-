/// app/app/goals/page.tsx
// Server component — fetches unlock prerequisites, passes to client.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { GoalsClient } from "./_client";

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const userId   = session.user.id;

  const [uploadsRes, uploadsLegacyRes] = await Promise.all([
    supabase.from(TABLES.HEALTH_UPLOADS).select(COLS.ID, { count: "exact", head: true }).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.UPLOADS).select(COLS.ID, { count: "exact", head: true }).eq(COLS.USER_ID, userId),
  ]);

  const hasUploads   = (uploadsRes.count ?? 0) > 0 || (uploadsLegacyRes.count ?? 0) > 0;
  const hasWearables = false;

  return <GoalsClient hasUploads={hasUploads} hasWearables={hasWearables} />;
}
