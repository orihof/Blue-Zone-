/// app/api/supplement-adoptions/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

// GET /api/supplement-adoptions — fetch all adopted supplements for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.USER_SUPPLEMENT_ADOPTIONS)
    .select(`${COLS.SUPPLEMENT_NAME}, ${COLS.ADOPTED_AT}`)
    .eq(COLS.USER_ID, session.user.id)
    .order(COLS.ADOPTED_AT, { ascending: true });

  if (error) return new Response("DB error", { status: 500 });
  return Response.json(data ?? []);
}
