/// app/api/consent/status/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConsentService } from "@/lib/consent/ConsentService";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const consent = await ConsentService.getCurrentConsent(session.user.id);

  return NextResponse.json(consent !== null ? consent : { consent: null });
}
