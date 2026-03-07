/// app/api/wearables/terra/connect/route.ts
// POST — generate a Terra widget session URL for Samsung Galaxy Watch onboarding.
// Returns { url: string } pointing to the hosted Terra widget.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const apiKey = process.env.TERRA_API_KEY;
  const devId  = process.env.TERRA_DEV_ID;

  if (!apiKey || !devId) {
    console.error("[terra/connect] Missing TERRA_API_KEY or TERRA_DEV_ID");
    return NextResponse.json({ error: "Terra credentials not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.tryterra.co/v2/auth/generateWidgetSession", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "dev-id":    devId,
    },
    body: JSON.stringify({
      reference_id: session.user.id,   // used to match back to our user on webhook auth event
      providers:    ["SAMSUNG"],
      language:     "en",
      auth_success_redirect_url: `${process.env.NEXTAUTH_URL ?? ""}/connect/wearables?connected=1`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[terra/connect] Terra API error:", res.status, text);
    return NextResponse.json({ error: "Failed to generate widget session" }, { status: 502 });
  }

  const json = (await res.json()) as { status?: string; url?: string; session_id?: string };

  if (!json.url) {
    console.error("[terra/connect] No URL in Terra response:", json);
    return NextResponse.json({ error: "No widget URL returned by Terra" }, { status: 502 });
  }

  return NextResponse.json({ url: json.url });
}
