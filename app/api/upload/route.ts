import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { parseAppleHealth } from "@/lib/apple-health";
import { extractBiomarkersFromFile } from "@/lib/ocr";
import { classifyBiomarkerStatus } from "@/lib/openai";
import type { ApiResponse, UploadResponse, ParsedHealthData } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const source = formData.get("source") as string | null;
  const consent = formData.get("consent") as string | null;

  if (!file || !source) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Missing file or source" },
      { status: 400 }
    );
  }

  // Israeli Privacy Protection Law — explicit consent required for health data
  if (!consent || consent !== "true") {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Consent to health data processing is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  // 1. Upload raw file to Supabase Storage
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filePath = `${session.user.id}/${Date.now()}-${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("health-files")
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from("health-files")
    .getPublicUrl(uploadData.path);
  const fileUrl = urlData.publicUrl;

  // 2. Parse the file based on source type
  let parsedData: ParsedHealthData = {};

  try {
    if (source === "apple_health") {
      const xmlText = fileBuffer.toString("utf-8");
      parsedData = { apple_health: parseAppleHealth(xmlText) };
    } else if (source === "blood_test") {
      const biomarkers = await extractBiomarkersFromFile(fileBuffer, file.type);
      parsedData = { biomarkers };
    }
    // WHOOP data is handled via OAuth, not file upload
  } catch (parseError) {
    console.error("Parse error:", parseError);
    // Continue — we still store the snapshot even if parsing fails
  }

  // 3. Insert health_snapshot record
  const { data: snapshot, error: snapshotError } = await supabase
    .from("health_snapshots")
    .insert({
      user_id: session.user.id,
      source,
      raw_file_url: fileUrl,
      parsed_data: parsedData,
    })
    .select()
    .single();

  if (snapshotError) {
    console.error("Snapshot insert error:", snapshotError);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Failed to save health snapshot" },
      { status: 500 }
    );
  }

  // 4. Insert extracted biomarkers (blood test only)
  if (source === "blood_test" && parsedData.biomarkers?.length) {
    const biomarkerRows = parsedData.biomarkers.map((b) => ({
      snapshot_id: snapshot.id,
      name: b.name,
      value: b.value,
      unit: b.unit,
      reference_min: b.reference_min ?? null,
      reference_max: b.reference_max ?? null,
      status: classifyBiomarkerStatus(
        b.value,
        b.reference_min ?? null,
        b.reference_max ?? null
      ),
    }));

    await supabase.from("biomarkers").insert(biomarkerRows);
  }

  return NextResponse.json<ApiResponse<UploadResponse>>({
    data: {
      snapshot_id: snapshot.id,
      file_url: fileUrl,
      parsed_data: parsedData,
    },
  });
}
