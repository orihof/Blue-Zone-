/// app/api/consent/record/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConsentService } from "@/lib/consent/ConsentService";
import type { ConsentMethod, PartnerConsent } from "@/lib/consent/ConsentService";
import { NextResponse } from "next/server";

const VALID_METHODS = new Set<ConsentMethod>(["onboarding_modal", "settings_page", "api", "policy_update_acknowledgment"]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const { tier2_research, tier2_research_types, tier3_commercial, tier3_partners, method } = body;

  if (typeof method !== "string" || !VALID_METHODS.has(method as ConsentMethod)) {
    return NextResponse.json({ success: false, error: "Invalid method" }, { status: 400 });
  }

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;

  let result: Awaited<ReturnType<typeof ConsentService.recordConsent>>;
  try {
    result = await ConsentService.recordConsent(
      session.user.id,
      {
        tier2_research:       typeof tier2_research === "boolean" ? tier2_research : undefined,
        tier2_research_types: Array.isArray(tier2_research_types)  ? tier2_research_types as string[] : undefined,
        tier3_commercial:     typeof tier3_commercial === "boolean" ? tier3_commercial : undefined,
        tier3_partners:       Array.isArray(tier3_partners)         ? tier3_partners  as PartnerConsent[] : undefined,
      },
      method as ConsentMethod,
      ipAddress,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[consent/record] Unhandled exception:", message, err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  if (!result.success) {
    console.error("[consent/record] recordConsent failed:", result.error);
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, consentId: result.consentId });
}
