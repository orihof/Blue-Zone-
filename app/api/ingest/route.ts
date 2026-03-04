/// app/api/ingest/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS, BUCKETS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import type { NormalizedBiomarkers } from "@/lib/types/health";

export const runtime = "nodejs";
export const maxDuration = 60;

// ----------------------------------------------------------------
// Lazy-load heavy deps — only imported when needed
// ----------------------------------------------------------------

async function runLabOCR(buffer: Buffer, mimeType: string): Promise<{ text: string }> {
  const { extractTextFromPDF, extractTextFromImage, sanitizeForAI } = await import(
    "@/lib/ocr/textract"
  );
  const raw =
    mimeType === "application/pdf"
      ? await extractTextFromPDF(buffer)
      : await extractTextFromImage(buffer);
  return { text: sanitizeForAI(raw) };
}

async function parseLab(text: string): Promise<NormalizedBiomarkers[]> {
  const { parseLabReport } = await import("@/lib/ocr/textract");
  return parseLabReport(text);
}

// ----------------------------------------------------------------
// Detect file category from MIME type
// ----------------------------------------------------------------

function category(mimeType: string): "pdf" | "image" | "json" | "xml" | "unknown" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/json" || mimeType === "text/json") return "json";
  if (mimeType === "text/xml" || mimeType === "application/xml") return "xml";
  return "unknown";
}

// ----------------------------------------------------------------
// POST /api/ingest
// Body: { storagePath: string; mimeType: string; fileName: string; source?: string }
// ----------------------------------------------------------------

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { storagePath, mimeType, fileName, source } = body ?? {};

  if (typeof storagePath !== "string" || !storagePath) {
    return NextResponse.json({ error: "storagePath is required" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // 1. Create health_upload row (processing)
  const { data: uploadRow, error: insertErr } = await supabase
    .from(TABLES.HEALTH_UPLOADS)
    .insert({
      [COLS.USER_ID]:       session.user.id,
      [COLS.STORAGE_PATH]:  storagePath,
      [COLS.FILE_NAME]:     fileName ?? storagePath.split("/").pop(),
      [COLS.SOURCE]:        source ?? category(mimeType ?? ""),
      [COLS.STATUS]:        "processing",
    })
    .select(COLS.ID)
    .maybeSingle();

  if (insertErr || !uploadRow) {
    console.error("[ingest] insert error:", insertErr?.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const uploadId = uploadRow.id as string;
  const warnings: string[] = [];
  let biomarkers: NormalizedBiomarkers[] = [];
  let wearableInserted = false;

  try {
    // 2. Download file from Supabase Storage
    const { data: blob, error: dlErr } = await supabase.storage
      .from(BUCKETS.HEALTH_FILES)
      .download(storagePath);

    if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message ?? "empty blob"}`);

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileCategory = category(mimeType ?? "");

    // 3. Process by file type
    if (fileCategory === "pdf" || fileCategory === "image") {
      // Lab report via OCR
      try {
        const { text } = await runLabOCR(buffer, mimeType);
        biomarkers = await parseLab(text);

        if (biomarkers.length === 0) {
          warnings.push("No biomarkers detected — check that the file is a standard lab report.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`OCR failed: ${msg}. AWS Textract may not be configured.`);
        // Continue — we'll store with empty biomarkers rather than hard-failing
      }

      // Insert biomarker rows
      if (biomarkers.length > 0) {
        const rows = biomarkers.map((b) => ({
          [COLS.USER_ID]:       session.user.id,
          [COLS.UPLOAD_ID]:     uploadId,
          name:                 b.name,
          value:                b.value,
          unit:                 b.unit,
          reference_min:        b.referenceRange.low,
          reference_max:        b.referenceRange.high,
          [COLS.STATUS]:        b.status,
          [COLS.SOURCE]:        b.source,
          [COLS.DATE]:          b.date,
        }));

        const { error: bioErr } = await supabase.from(TABLES.BIOMARKERS).insert(rows);
        if (bioErr) warnings.push(`Failed to save ${biomarkers.length} biomarkers: ${bioErr.message}`);
      }

      await supabase
        .from(TABLES.HEALTH_UPLOADS)
        .update({
          [COLS.PARSED_DATA]: biomarkers,
          [COLS.WARNINGS]:    warnings,
          [COLS.STATUS]:      "done",
        })
        .eq(COLS.ID, uploadId);

    } else if (fileCategory === "json") {
      // Wearable JSON
      let raw: unknown;
      try {
        raw = JSON.parse(buffer.toString("utf-8"));
      } catch {
        throw new Error("File is not valid JSON");
      }

      const { detectWearableSource, normalizeWearable } = await import("@/lib/wearables/normalizer");
      const detectedSource = source ?? detectWearableSource(raw);

      if (!detectedSource) {
        warnings.push("Could not determine wearable source — is this a WHOOP, Oura, Garmin, or Apple Health export?");
        await supabase
          .from(TABLES.HEALTH_UPLOADS)
          .update({ [COLS.STATUS]: "done", [COLS.WARNINGS]: warnings, [COLS.RAW_DATA]: raw as object })
          .eq(COLS.ID, uploadId);
      } else {
        const normalized = normalizeWearable(detectedSource, raw);

        const { error: wsErr } = await supabase.from(TABLES.WEARABLE_SNAPSHOTS).upsert(
          {
            [COLS.USER_ID]:    session.user.id,
            [COLS.UPLOAD_ID]:  uploadId,
            [COLS.SOURCE]:     normalized.source,
            [COLS.DATE]:       normalized.date,
            hrv:               normalized.hrv,
            resting_hr:        normalized.restingHR,
            sleep_score:       normalized.sleepScore,
            deep_sleep_min:    normalized.deepSleepMinutes,
            rem_sleep_min:     normalized.remSleepMinutes,
            recovery_score:    normalized.recoveryScore,
            strain_score:      normalized.strainScore,
            readiness_score:   normalized.readinessScore,
            steps:             normalized.steps,
            active_calories:   normalized.activeCalories,
            raw_data:          raw as object,
          },
          { onConflict: "user_id,source,date" }
        );

        if (wsErr) warnings.push(`Wearable snapshot save error: ${wsErr.message}`);
        else wearableInserted = true;

        await supabase
          .from(TABLES.HEALTH_UPLOADS)
          .update({
            [COLS.PARSED_DATA]: normalized,
            [COLS.RAW_DATA]:    raw as object,
            [COLS.WARNINGS]:    warnings,
            [COLS.STATUS]:      "done",
            [COLS.SOURCE]:      detectedSource,
          })
          .eq(COLS.ID, uploadId);
      }

    } else {
      // XML (Apple Health) or other — store raw, surface warning
      warnings.push(
        "File type not yet supported for automatic parsing. Upload a PDF lab report or a wearable JSON export."
      );
      await supabase
        .from(TABLES.HEALTH_UPLOADS)
        .update({ [COLS.STATUS]: "done", [COLS.WARNINGS]: warnings })
        .eq(COLS.ID, uploadId);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ingest]", msg);
    await supabase
      .from(TABLES.HEALTH_UPLOADS)
      .update({ [COLS.STATUS]: "failed", [COLS.ERROR_MESSAGE]: msg })
      .eq(COLS.ID, uploadId);
    return NextResponse.json({ error: "Ingestion failed", detail: msg }, { status: 500 });
  }

  return NextResponse.json({
    uploadId,
    normalizedBiomarkers: biomarkers,
    normalizedWearable:   wearableInserted ? true : null,
    warnings,
  });
}
