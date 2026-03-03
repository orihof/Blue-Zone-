/// app/api/uploads/commit/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

interface CommitFile {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const files: CommitFile[] = body?.files ?? [];

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "No files to commit" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const rows = files.map((f) => ({
    [COLS.USER_ID]: session.user.id,
    [COLS.FILE_NAME]: f.fileName,
    [COLS.FILE_SIZE]: f.fileSize,
    [COLS.MIME_TYPE]: f.mimeType,
    [COLS.STORAGE_PATH]: f.storagePath,
    [COLS.STATUS]: "done",
  }));

  const { data, error } = await supabase.from(TABLES.UPLOADS).insert(rows).select(COLS.ID);
  if (error) {
    console.error("[uploads/commit]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ uploadIds: (data ?? []).map((r: { id: string }) => r.id) });
}
