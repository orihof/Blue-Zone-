/// app/api/research/test/route.ts
import { requireConsent } from "@/lib/middleware/requireConsent";
import { NextResponse } from "next/server";

export const GET = requireConsent(2)(async () => {
  return NextResponse.json({ message: "Access granted" });
});
