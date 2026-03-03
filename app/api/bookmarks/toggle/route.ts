/// app/api/bookmarks/toggle/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { itemType, itemId, protocolId } = body ?? {};

  if (!itemType || !itemId) {
    return NextResponse.json({ error: "itemType and itemId required" }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from(TABLES.BOOKMARKS)
    .select(COLS.ID)
    .eq(COLS.USER_ID, session.user.id)
    .eq(COLS.CATEGORY, itemType)
    .eq(COLS.ITEM_ID, itemId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from(TABLES.BOOKMARKS)
      .delete()
      .eq(COLS.ID, existing.id);
    return NextResponse.json({ bookmarked: false });
  }

  const { error } = await supabase.from(TABLES.BOOKMARKS).insert({
    [COLS.USER_ID]: session.user.id,
    [COLS.CATEGORY]: itemType,
    [COLS.ITEM_ID]: itemId,
    [COLS.PROTOCOL_ID]: protocolId ?? null,
  });

  if (error) {
    console.error("[bookmarks/toggle]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ bookmarked: true });
}
