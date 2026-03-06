/// app/api/referral/code/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";

function genCode(): string {
  // 7 chars, no visually ambiguous characters (0/O, 1/l/I)
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 7 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const userId   = session.user.id;

  // Return existing code if already generated
  const { data: existing } = await supabase
    .from(TABLES.REFERRAL_LINKS)
    .select("code, clicks, conversions")
    .eq(COLS.USER_ID, userId)
    .single();

  if (existing) return NextResponse.json(existing);

  // Generate a unique code (retry up to 5× on collision)
  let code = genCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase
      .from(TABLES.REFERRAL_LINKS)
      .insert({ user_id: userId, code });
    if (!error) break;
    code = genCode();
  }

  return NextResponse.json({ code, clicks: 0, conversions: 0 });
}
