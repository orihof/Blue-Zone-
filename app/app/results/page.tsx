/// app/app/results/page.tsx
// Redirect to the user's latest ready protocol, or to onboarding if none exists.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

export default async function ResultsRedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const db = getAdminClient();
  const { data: protocol } = await db
    .from(TABLES.PROTOCOLS)
    .select("id, status")
    .eq(COLS.USER_ID, session.user.id)
    .eq(COLS.STATUS, "ready")
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (protocol?.id) {
    redirect(`/app/results/${protocol.id}`);
  }

  // No ready protocol — send user to onboarding
  redirect("/app/onboarding");
}
