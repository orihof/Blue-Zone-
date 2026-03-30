/// app/api/protocols/[protocolId]/share/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { track } from "@/lib/analytics";

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ protocolId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.plan !== "pro" && session.user.plan !== "clinic") {
    return NextResponse.json({ error: "Sharing requires a Pro or Clinic plan" }, { status: 403 });
  }

  const supabase = getAdminClient();

  // Verify ownership
  const { data: protocol } = await supabase
    .from(TABLES.PROTOCOLS)
    .select(COLS.ID)
    .eq(COLS.ID, (await params).protocolId)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (!protocol) {
    return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72h

  const { error } = await supabase
    .from(TABLES.PROTOCOLS)
    .update({
      [COLS.SHARE_TOKEN]: token,
      [COLS.SHARE_TOKEN_EXPIRES_AT]: expiresAt,
    })
    .eq(COLS.ID, (await params).protocolId);

  if (error) {
    console.error("[protocols/share]", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const shareUrl = `${base}/share/${token}`;

  track("share_link_created");

  return NextResponse.json({ shareUrl, token, expiresAt });
}
