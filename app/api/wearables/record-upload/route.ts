/// app/api/wearables/record-upload/route.ts
// Fire-and-forget endpoint — logs every wearable upload event and updates
// the profile freshness timestamp. Never called with await on the client.

import { NextResponse }      from "next/server";
import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import { getAdminClient }    from "@/lib/supabase/admin";
import { TABLES, COLS }      from "@/lib/db/schema";

interface RecordUploadBody {
  deviceId:      string;
  scenario:      string;
  triggerReason?: string;
  isFirstUpload: boolean;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const body = await req.json() as RecordUploadBody;
  const { deviceId, scenario, triggerReason, isFirstUpload } = body;

  const supabase = getAdminClient();
  const now      = new Date().toISOString();

  // Insert event row
  await supabase.from(TABLES.WEARABLE_UPLOAD_EVENTS).insert({
    [COLS.USER_ID]:         userId,
    device_type:            deviceId,
    [COLS.SCENARIO]:        scenario,
    trigger_reason:         triggerReason ?? null,
    is_first_upload:        isFirstUpload,
    uploaded_at:            now,
  });

  // Update profile freshness + baseline if first upload
  const profileUpdate: Record<string, string | boolean> = {
    [COLS.LAST_WEARABLE_UPLOAD_AT]: now,
  };
  if (isFirstUpload) {
    profileUpdate[COLS.BASELINE_ESTABLISHED_AT] = now;
  }

  await supabase.from(TABLES.PROFILES).update(profileUpdate).eq(COLS.ID, userId);

  return NextResponse.json({ ok: true });
}
