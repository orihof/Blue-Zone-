/// app/api/recommendations/[id]/route.ts
// PATCH /api/recommendations/[id]
// Body: { status: "adopted" | "rejected" | "pending", protocolId: string }
// Stores adoption state in bookmarks table (category = "adopted" | "rejected").

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recId = (await params).id;
  let body: { status?: string; protocolId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status, protocolId } = body;
  if (!status || !["adopted", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getAdminClient();
  const userId = session.user.id;

  // Remove any existing adoption state for this rec
  await db
    .from(TABLES.BOOKMARKS)
    .delete()
    .eq(COLS.USER_ID, userId)
    .eq(COLS.ITEM_ID, recId)
    .in(COLS.CATEGORY, ["adopted", "rejected"]);

  // If not pending, insert new state
  if (status !== "pending") {
    const { error } = await db.from(TABLES.BOOKMARKS).insert({
      [COLS.USER_ID]: userId,
      [COLS.ITEM_ID]: recId,
      [COLS.CATEGORY]: status,
      [COLS.PROTOCOL_ID]: protocolId ?? null,
    });
    if (error) {
      console.error("Bookmark insert error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, status });
}
