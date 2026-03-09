/// app/api/adverse-events/prompts/route.ts
// GET /api/adverse-events/prompts?productId= — fetch follow-up prompt entries.

import { getServerSession }        from "next-auth";
import { authOptions }             from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getAdverseEventPrompts }  from "@/lib/adverse-events";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId query parameter is required" }, { status: 400 });
  }

  try {
    const prompts = await getAdverseEventPrompts(productId, session.user.id);
    return NextResponse.json({ prompts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[adverse-events/prompts]", msg);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }
}
