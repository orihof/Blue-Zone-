/// app/api/account/delete/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS, BUCKETS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.error("[account/delete] No session or user.id");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const userId = session.user.id;

  console.log("[account/delete] Starting deletion for user:", userId);

  try {
    // ── 1. Delete Supabase Storage files (not covered by FK cascades) ──
    const { data: files } = await supabase.storage
      .from(BUCKETS.HEALTH_FILES)
      .list(userId);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: storageErr } = await supabase.storage
        .from(BUCKETS.HEALTH_FILES)
        .remove(paths);
      if (storageErr) {
        console.error("[account/delete] Storage cleanup error:", storageErr.message);
        // Non-fatal — continue with DB deletion
      }
      console.log(`[account/delete] Removed ${paths.length} storage files`);
    }

    // ── 2. Nullify consent_audit_log.changed_by (FK lacks ON DELETE CASCADE) ──
    // This FK defaults to NO ACTION and would block the user row delete
    // if any audit log rows reference this user as the changer.
    await supabase
      .from(TABLES.CONSENT_AUDIT_LOG)
      .update({ changed_by: null })
      .eq("changed_by", userId);

    // ── 3. Delete the user row — all other FKs use ON DELETE CASCADE ──
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .delete()
      .eq(COLS.ID, userId)
      .select("id");

    if (error) {
      console.error("[account/delete] DB delete error:", error.message, error.code, error.details);
      return NextResponse.json(
        { error: `Failed to delete account: ${error.message}` },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      console.error("[account/delete] Delete matched 0 rows for user:", userId);
      return NextResponse.json(
        { error: "User record not found — nothing was deleted" },
        { status: 404 },
      );
    }

    console.log("[account/delete] Successfully deleted user:", userId);
    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[account/delete] Unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
