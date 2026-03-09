/// app/api/credits/award/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { amount, reason } = body;

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Append a row to the credit ledger. Non-fatal — if the table doesn't exist
  // yet we log the warning and still return success so the consent flow is
  // never blocked by the credits system.
  const { error } = await supabase
    .from("credit_ledger")
    .insert({
      user_id:    session.user.id,
      amount,
      reason:     typeof reason === "string" ? reason : "unknown",
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.warn("[credits/award] Could not record credit ledger entry:", error.message);
  }

  return NextResponse.json({ success: true, amount });
}
