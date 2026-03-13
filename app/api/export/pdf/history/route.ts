/// app/api/export/pdf/history/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent } from "@/middleware/requireConsent";

export const runtime = "nodejs";

// ----------------------------------------------------------------
// GET /api/export/pdf/history
// Returns all PDF exports for the authenticated user with fresh signed URLs.
// ----------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireConsent(1)(async (_req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId   = session.user.id as string;
  const supabase = getAdminClient();

  const { data: rows, error } = await supabase
    .from(TABLES.PROTOCOL_PDF_EXPORTS)
    .select("id, created_at, pdf_url, expires_at")
    .eq(COLS.USER_ID, userId)
    .order(COLS.CREATED_AT, { ascending: false });

  if (error) {
    console.error("[export/pdf/history] DB error:", error.message);
    return NextResponse.json({ error: "Failed to fetch export history" }, { status: 500 });
  }

  const BUCKET_MARKER = "/pdf-exports/";

  const exports = await Promise.all(
    (rows ?? []).map(async (row) => {
      const rawUrl      = (row.pdf_url ?? "") as string;
      const storagePath = rawUrl.includes(BUCKET_MARKER)
        ? rawUrl.split(BUCKET_MARKER)[1]
        : rawUrl;
      const expiresAt   = new Date(Date.now() + 3600 * 1000).toISOString();
      let downloadUrl   = rawUrl;

      if (storagePath) {
        const { data: signed } = await supabase.storage
          .from("pdf-exports")
          .createSignedUrl(storagePath, 3600);
        if (signed?.signedUrl) {
          downloadUrl = signed.signedUrl;
        }
      }

      return {
        export_id:    row.id    as string,
        created_at:   row.created_at as string,
        download_url: downloadUrl,
        expires_at:   expiresAt,
      };
    }),
  );

  return NextResponse.json({ exports });
});
