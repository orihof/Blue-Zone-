/// app/api/account/delete/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

const USER_SCOPED_TABLES = [
  TABLES.CHECKIN_RESPONSES,
  TABLES.BOOKMARKS,
  TABLES.PROTOCOLS,
  TABLES.BIOMARKERS,
  TABLES.HEALTH_SNAPSHOTS,
  TABLES.UPLOADS,
  TABLES.SESSIONS,
  TABLES.ACCOUNTS,
] as const;

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const userId = session.user.id;

  for (const table of USER_SCOPED_TABLES) {
    const { error } = await supabase.from(table).delete().eq(COLS.USER_ID, userId);
    if (error) console.warn(`[account/delete] Failed to clear ${table}:`, error.message);
  }

  // Delete the user row last (foreign key cascade handles most)
  await supabase.from(TABLES.USERS).delete().eq(COLS.ID, userId);

  return NextResponse.json({ deleted: true });
}
