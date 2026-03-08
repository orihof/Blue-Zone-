/// app/api/cron/enroll-cohorts/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runCohortEnrollment } from "@/lib/cohorts/enrollCohorts";

function isAuthorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token  = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
  const key    = process.env.CRON_SECRET ?? "";
  return key.length > 0 && token === key;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCohortEnrollment();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
