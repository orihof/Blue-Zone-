/// app/api/oauth/whoop/start/route.ts
// Initiates WHOOP OAuth 2.0 flow.
// Env vars required: WHOOP_CLIENT_ID, NEXTAUTH_URL
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.WHOOP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "WHOOP integration not configured" }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/whoop/callback`;
  // State encodes user ID for CSRF protection
  const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read:recovery read:sleep read:body_measurement read:workout offline",
    state,
  });

  return NextResponse.redirect(`${WHOOP_AUTH_URL}?${params.toString()}`);
}
