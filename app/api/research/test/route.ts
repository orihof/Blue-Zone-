/// app/api/research/test/route.ts
import { requireConsent } from "@/middleware/requireConsent";
import { NextResponse } from "next/server";

export const GET = requireConsent(2)(async (_req) => {
  return NextResponse.json({ message: "Access granted" });
});
