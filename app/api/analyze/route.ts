import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { requireConsent } from "@/middleware/requireConsent";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { analyzeHealthData } from "@/lib/openai";
import { buildIHerbUrl, buildAmazonUrl } from "@/lib/affiliate";
import type {
  ApiResponse,
  AnalyzeResponse,
  HealthSnapshot,
  Biomarker,
} from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { snapshot_id } = body as { snapshot_id: string };

  if (!snapshot_id) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "snapshot_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  // Verify the snapshot belongs to the current user
  const { data: snapshot, error: snapshotError } = await supabase
    .from("health_snapshots")
    .select("*")
    .eq("id", snapshot_id)
    .eq("user_id", session.user.id)
    .single();

  if (snapshotError || !snapshot) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Snapshot not found" },
      { status: 404 }
    );
  }

  const typedSnapshot = snapshot as HealthSnapshot;

  // Fetch existing biomarkers for this snapshot
  const { data: biomarkers } = await supabase
    .from("biomarkers")
    .select("*")
    .eq("snapshot_id", snapshot_id);

  const typedBiomarkers = (biomarkers ?? []) as Biomarker[];

  // Build the data payload for AI — re-attach biomarkers into parsed_data
  const healthData = {
    ...typedSnapshot.parsed_data,
    biomarkers: typedSnapshot.parsed_data?.biomarkers ?? [],
  };

  // Run AI analysis
  let aiResult;
  try {
    aiResult = await analyzeHealthData(healthData);
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json<ApiResponse<never>>(
      { error: "AI analysis failed" },
      { status: 500 }
    );
  }

  // Persist AI summary back to the snapshot
  await supabase
    .from("health_snapshots")
    .update({ ai_summary: aiResult.summary })
    .eq("id", snapshot_id);

  // Build recommendation rows
  const productRecs = aiResult.product_recommendations.map((p) => ({
    user_id: session.user.id,
    snapshot_id,
    type: "product" as const,
    title: p.product_name,
    description: p.reason,
    url: buildIHerbUrl(p.search_query_iherb),
    source: "iherb" as const,
    reason: p.reason,
  }));

  // Duplicate each product rec with an Amazon link
  const amazonRecs = aiResult.product_recommendations.map((p) => ({
    user_id: session.user.id,
    snapshot_id,
    type: "product" as const,
    title: p.product_name,
    description: p.reason,
    url: buildAmazonUrl(p.search_query_amazon),
    source: "amazon" as const,
    reason: p.reason,
  }));

  const clinicRecs = aiResult.clinic_recommendations.map((c) => ({
    user_id: session.user.id,
    snapshot_id,
    type: "clinic" as const,
    title: c.clinic_type,
    description: c.reason,
    url: "",
    source: "google_places" as const,
    reason: c.reason,
  }));

  const allRecs = [...productRecs, ...amazonRecs, ...clinicRecs];

  const { data: insertedRecs } = await supabase
    .from("recommendations")
    .insert(allRecs)
    .select();

  return NextResponse.json<ApiResponse<AnalyzeResponse>>({
    data: {
      snapshot_id,
      summary: aiResult.summary,
      biomarkers: typedBiomarkers,
      recommendations: insertedRecs ?? [],
    },
  });
});
