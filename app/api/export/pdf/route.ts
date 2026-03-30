/// app/api/export/pdf/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent } from "@/lib/middleware/requireConsent";
import {
  buildProtocolPDFContent,
  generatePDFBuffer,
  savePDFToStorage,
  type ProtocolPDFData,
  type BiomarkerRow,
  type ProtocolRecommendation,
} from "@/lib/pdf-templates";
import { getBaselineContext } from "@/lib/personal-baselines";
import type { CompetitionResult, TimingSlot } from "@/lib/nutrient-competition";

export const runtime     = "nodejs";
export const maxDuration = 60;

// ----------------------------------------------------------------
// POST /api/export/pdf
// Body: { protocol_snapshot_id: string }
// ----------------------------------------------------------------

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const body   = await req.json().catch(() => null);
  const snapshotId: string | undefined = body?.protocol_snapshot_id;

  if (!snapshotId || typeof snapshotId !== "string") {
    return NextResponse.json({ error: "protocol_snapshot_id is required" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // ── 1. Load protocol snapshot, verify ownership ──────────────────────────
  const { data: snapshot, error: snapErr } = await supabase
    .from(TABLES.PROTOCOL_OUTPUTS)
    .select("id, user_id, parsed_output, created_at")
    .eq(COLS.ID, snapshotId)
    .maybeSingle();

  if (snapErr || !snapshot) {
    return NextResponse.json({ error: "Protocol snapshot not found" }, { status: 404 });
  }

  if ((snapshot.user_id as string) !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Load supporting data in parallel ──────────────────────────────────
  const [biomarkersRes, profileRes] = await Promise.all([
    supabase
      .from(TABLES.BIOMARKERS)
      .select("name, value, unit, status")
      .eq(COLS.USER_ID, userId)
      .order(COLS.CREATED_AT, { ascending: false })
      .limit(30),
    supabase
      .from(TABLES.PROFILES)
      .select("biological_age, name")
      .eq(COLS.USER_ID, userId)
      .maybeSingle(),
  ]);

  const biomarkerRows: BiomarkerRow[] = (biomarkersRes.data ?? []).map((b) => ({
    name:   String(b.name),
    value:  Number(b.value),
    unit:   String(b.unit   ?? ""),
    status: String(b.status ?? "normal"),
  }));

  // Baseline context (non-fatal)
  const markerNames = biomarkerRows.map((b) => b.name);
  if (markerNames.length > 0) {
    try { await getBaselineContext(userId, markerNames); } catch { /* non-fatal */ }
  }

  // ── 3. Build ProtocolPDFData ─────────────────────────────────────────────
  const parsedOutput = ((snapshot.parsed_output ?? {}) as Record<string, unknown>);

  const recommendations: ProtocolRecommendation[] = (() => {
    const schedule = Array.isArray(parsedOutput.supplementSchedule)
      ? parsedOutput.supplementSchedule
      : Array.isArray(parsedOutput.recommendations)
      ? parsedOutput.recommendations
      : [];
    return (schedule as Array<Record<string, unknown>>)
      .map((item) => ({
        product:        String(item.supplement ?? item.product ?? item.name ?? ""),
        dose:           item.dose_mg != null
                          ? `${item.dose_mg}mg`
                          : typeof item.dose === "string"
                          ? item.dose
                          : "",
        timing:         String(item.timing ?? item.time ?? ""),
        reason:         String(item.reason ?? item.rationale ?? ""),
        evidence_grade: item.evidence_grade != null ? String(item.evidence_grade) : undefined,
      }))
      .filter((r) => !!r.product);
  })();

  const timingSchedule: TimingSlot[] = Array.isArray(parsedOutput.timing_schedule)
    ? (parsedOutput.timing_schedule as TimingSlot[])
    : [];

  const competitionResults: CompetitionResult[] = Array.isArray(parsedOutput.competition_conflicts)
    ? (parsedOutput.competition_conflicts as CompetitionResult[])
    : [];

  type ProfileRow = { biological_age: number | null; name: string | null } | null;
  const profile = profileRes.data as ProfileRow;

  const pdfData: ProtocolPDFData = {
    userName:          profile?.name ?? session.user.name ?? session.user.email ?? "User",
    generatedDate:     new Date(snapshot.created_at as string).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    }),
    biologicalAge:     profile?.biological_age ?? undefined,
    biomarkers:        biomarkerRows,
    recommendations,
    timingSchedule,
    competitionResults,
    exportType:        "summary",
  };

  // ── 4–5. Build PDF content + buffer ──────────────────────────────────────
  let buffer: Buffer;
  try {
    const content = buildProtocolPDFContent(pdfData);
    buffer        = await generatePDFBuffer(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[export/pdf] PDF generation error:", msg);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }

  // ── 6. Save to storage (also inserts protocol_pdf_exports row) ────────────
  let pdfUrl: string;
  try {
    pdfUrl = await savePDFToStorage(userId, buffer, snapshotId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[export/pdf] Storage save error:", msg);
    return NextResponse.json({ error: "Failed to save PDF" }, { status: 500 });
  }

  // Retrieve the export_id just inserted
  const { data: exportRow } = await supabase
    .from(TABLES.PROTOCOL_PDF_EXPORTS)
    .select("id, pdf_url")
    .eq(COLS.USER_ID, userId)
    .eq("snapshot_id", snapshotId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── 7. Generate signed URL valid for 1 hour ───────────────────────────────
  // Extract the storage path from the public URL (everything after "/pdf-exports/")
  const BUCKET_MARKER = "/pdf-exports/";
  const rawUrl        = (exportRow?.pdf_url ?? pdfUrl) as string;
  const storagePath   = rawUrl.includes(BUCKET_MARKER)
    ? rawUrl.split(BUCKET_MARKER)[1]
    : rawUrl;

  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  let downloadUrl = pdfUrl;

  const { data: signedData } = await supabase.storage
    .from("pdf-exports")
    .createSignedUrl(storagePath, 3600);

  if (signedData?.signedUrl) {
    downloadUrl = signedData.signedUrl;
  }

  // ── 8. Return ─────────────────────────────────────────────────────────────
  return NextResponse.json({
    download_url: downloadUrl,
    expires_at:   expiresAt,
    export_id:    exportRow?.id ?? null,
  });
});
