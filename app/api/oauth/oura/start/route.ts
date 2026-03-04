/// app/api/oauth/oura/start/route.ts
// Initiates Oura Ring OAuth 2.0 flow.
// Env vars required: OURA_CLIENT_ID, NEXTAUTH_URL
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const OURA_AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.OURA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Oura integration not configured" }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/oauth/oura/callback`;
  const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "daily heartrate personal workout tag session",
    state,
  });

  return NextResponse.redirect(`${OURA_AUTH_URL}?${params.toString()}`);
}
