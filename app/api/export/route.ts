/// app/api/export/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const userId = session.user.id;

  const [uploads, protocols, bookmarks, checkins] = await Promise.all([
    supabase.from(TABLES.UPLOADS).select("*").eq(COLS.USER_ID, userId),
    supabase.from(TABLES.PROTOCOLS).select(`${COLS.ID},${COLS.CREATED_AT},${COLS.MODE},${COLS.SELECTED_AGE},${COLS.GOALS},${COLS.BUDGET},${COLS.STATUS}`).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.BOOKMARKS).select("*").eq(COLS.USER_ID, userId),
    supabase.from(TABLES.CHECKIN_RESPONSES).select("*").eq(COLS.USER_ID, userId),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: { id: userId, email: session.user.email, name: session.user.name },
    uploads: uploads.data ?? [],
    protocols: protocols.data ?? [],
    bookmarks: bookmarks.data ?? [],
    checkins: checkins.data ?? [],
  };

  if (session.user.email) {
    sendEmail({ to: session.user.email, template: "export_confirmation" }).catch(() => null);
  }

  track("pdf_exported");

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bluezone-export-${Date.now()}.json"`,
    },
  });
}
