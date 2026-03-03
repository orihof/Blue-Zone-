/// app/api/uploads/sign/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { BUCKETS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "text/xml",
  "application/xml",
]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const files: { name: string; size: number; type: string }[] = body?.files ?? [];

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > 10) {
    return NextResponse.json({ error: "Maximum 10 files allowed" }, { status: 400 });
  }

  for (const f of files) {
    if (!ALLOWED_TYPES.has(f.type)) {
      return NextResponse.json({ error: `File type not supported: ${f.type}` }, { status: 400 });
    }
    if (f.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: `File too large: ${f.name}` }, { status: 400 });
    }
  }

  const supabase = getAdminClient();
  const results = await Promise.all(
    files.map(async (f) => {
      const ext = f.name.split(".").pop() ?? "bin";
      const storagePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from(BUCKETS.HEALTH_FILES)
        .createSignedUploadUrl(storagePath);
      if (error) throw new Error(`Supabase sign error: ${error.message}`);
      return {
        storagePath,
        signedUrl: data.signedUrl,
        token: data.token,
      };
    })
  );

  return NextResponse.json({ files: results });
}
