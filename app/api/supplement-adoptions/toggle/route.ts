/// app/api/supplement-adoptions/toggle/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

// POST /api/supplement-adoptions/toggle
// Body: { supplementName: string; protocolType?: string }
// Returns: { adopted: boolean }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { supplementName, protocolType } = (await req.json()) as {
    supplementName: string;
    protocolType?: string;
  };
  if (!supplementName?.trim()) return new Response("Missing supplementName", { status: 400 });

  const supabase = getAdminClient();

  // Check whether the row already exists
  const { data: existing } = await supabase
    .from(TABLES.USER_SUPPLEMENT_ADOPTIONS)
    .select(COLS.ID)
    .eq(COLS.USER_ID, session.user.id)
    .eq(COLS.SUPPLEMENT_NAME, supplementName)
    .maybeSingle();

  if (existing) {
    await supabase
      .from(TABLES.USER_SUPPLEMENT_ADOPTIONS)
      .delete()
      .eq(COLS.ID, existing.id);
    return Response.json({ adopted: false });
  }

  await supabase
    .from(TABLES.USER_SUPPLEMENT_ADOPTIONS)
    .insert({
      [COLS.USER_ID]:         session.user.id,
      [COLS.SUPPLEMENT_NAME]: supplementName,
      [COLS.PROTOCOL_TYPE]:   protocolType ?? null,
    });

  return Response.json({ adopted: true });
}
