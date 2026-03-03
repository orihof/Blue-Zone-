/// app/api/export/protocol/[protocolId]/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { track } from "@/lib/analytics";

export async function GET(
  _req: Request,
  { params }: { params: { protocolId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.PROTOCOLS)
    .select("*")
    .eq(COLS.ID, params.protocolId)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    protocol: {
      id: data.id,
      createdAt: data.created_at,
      mode: data.mode,
      selectedAge: data.selected_age,
      goals: data.goals,
      budget: data.budget,
      preferences: data.preferences,
      payload: data.payload,
    },
    generatedFor: session.user.email,
    disclaimer: "Blue Zone is not a medical service. All insights are for educational purposes only.",
  };

  track("pdf_exported");

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bluezone-protocol-${params.protocolId}.json"`,
    },
  });
}
