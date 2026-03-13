/// app/api/uploads/sign/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { BUCKETS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "text/plain",
  "text/xml",
  "application/xml",
  "application/json",
  // Apple Health & Samsung Health exports
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "application/octet-stream", // fallback: some browsers report ZIP as generic binary
]);

const EXT_TO_MIME: Record<string, string> = {
  pdf:  "application/pdf",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  csv:  "text/csv",
  txt:  "text/plain",
  xml:  "application/xml",
  json: "application/json",
  zip:  "application/zip",
};

function resolveType(file: { name: string; type: string }): string {
  if (file.type && ALLOWED_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? file.type ?? "";
}

// ── Ensure Supabase Storage bucket accepts large files (once per cold start) ──
let _bucketConfigured = false;

async function ensureBucketLimit() {
  if (_bucketConfigured) return;
  try {
    const supabase = getAdminClient();
    await supabase.storage.updateBucket(BUCKETS.HEALTH_FILES, {
      public: false,
      fileSizeLimit: MAX_FILE_BYTES,
    });
    console.log(`[uploads/sign] Bucket "${BUCKETS.HEALTH_FILES}" file size limit set to ${MAX_FILE_BYTES} bytes`);
  } catch (err: unknown) {
    // Non-fatal — bucket may already be configured or plan may not support it
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[uploads/sign] Could not update bucket limit:", msg);
  }
  _bucketConfigured = true; // Don't retry every request regardless of success
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure the bucket accepts files up to MAX_FILE_BYTES (lazy one-time call)
  await ensureBucketLimit();

  const body = await req.json().catch(() => null);
  const files: { name: string; size: number; type: string }[] = body?.files ?? [];

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > 10) {
    return NextResponse.json({ error: "Maximum 10 files allowed" }, { status: 400 });
  }

  for (const f of files) {
    const resolved = resolveType(f);
    if (!ALLOWED_TYPES.has(resolved)) {
      return NextResponse.json({ error: `File type not supported: ${f.type}` }, { status: 400 });
    }
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File too large (${formatBytes(f.size)}). Maximum allowed: ${formatBytes(MAX_FILE_BYTES)}.` },
        { status: 413 },
      );
    }
  }

  const supabase = getAdminClient();
  const results = await Promise.all(
    files.map(async (f) => {
      const ext = f.name.split(".").pop() ?? "bin";
      const storagePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from(BUCKETS.HEALTH_FILES)
        .createSignedUploadUrl(storagePath, { upsert: true });
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}
