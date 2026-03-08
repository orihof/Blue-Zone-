/// middleware/requireConsent.ts
// Usage: export const GET = requireConsent(2)(async (req) => { ... })
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConsentService } from "@/lib/consent/ConsentService";
import type { ConsentTier } from "@/lib/consent/ConsentService";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Handler = (req: NextRequest) => Promise<Response> | Response;

export function requireConsent(tier: ConsentTier) {
  return function wrap(handler: Handler): Handler {
    return async function protected_handler(req: NextRequest): Promise<Response> {
      // 1. Auth
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;

      // 2. Consent check
      const ok = await ConsentService.hasConsent(userId, tier);

      if (!ok) {
        // 3a. Audit — blocked access (non-fatal if insert fails)
        const { error: auditErr } = await getAdminClient()
          .from("consent_audit_log")
          .insert({
            user_id:      userId,
            event_type:   "access_blocked_no_consent",
            new_state:    { route: req.nextUrl.pathname, required_tier: tier },
            triggered_by: "system",
          });

        if (auditErr) {
          console.error("[requireConsent] audit insert failed", auditErr.message);
        }

        // 3b. 403
        return NextResponse.json(
          { error: "Consent required", required_tier: tier, consent_url: "/settings/privacy" },
          { status: 403 },
        );
      }

      // 4. Consent present — delegate to the wrapped handler
      return handler(req);
    };
  };
}
