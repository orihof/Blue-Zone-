/// lib/consent/ConsentService.ts
// Server-only — never import from client components
import { createHash } from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendConsentConfirmationEmail } from "./sendConsentConfirmationEmail";

// ── Exported types ────────────────────────────────────────────────────────────

export type ConsentTier = 1 | 2 | 3;

export type ConsentMethod =
  | "explicit_checkbox"
  | "onboarding_flow"
  | "onboarding_modal"
  | "settings_page"
  | "api"
  | "import"
  | "policy_update_acknowledgment";

export interface PartnerConsent {
  partnerId:   string;
  partnerName: string;
  consentedAt: string;
}

export interface ConsentRecord {
  id:                   string;
  user_id:              string;
  tier1_service:        boolean;
  tier2_research:       boolean;
  tier2_research_types: string[];
  tier3_commercial:     boolean;
  tier3_partners:       PartnerConsent[];
  consent_version:      string;
  ip_address:           string | null;
  user_agent:           string | null;
  consent_method:       ConsentMethod;
  is_current:           boolean;
  created_at:           string;
  policy_version:       string;
  terms_version:        string;
}

type ConsentUpdates = Partial<Pick<
  ConsentRecord,
  "tier1_service" | "tier2_research" | "tier2_research_types" | "tier3_commercial" | "tier3_partners"
>>;

// ── Internal helpers ──────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(salt + ip).digest("hex");
}

// ── ConsentService ────────────────────────────────────────────────────────────

export class ConsentService {
  // ── 1. getCurrentConsent ─────────────────────────────────────────────────
  static async getCurrentConsent(userId: string): Promise<ConsentRecord | null> {
    const { data, error } = await getAdminClient()
      .from("consent_records")
      .select("*")
      .eq("user_id", userId)
      .eq("is_current", true)
      .maybeSingle();

    if (error) {
      console.error("[ConsentService] getCurrentConsent", error.message);
      return null;
    }
    return data as ConsentRecord | null;
  }

  // ── 2. hasConsent ────────────────────────────────────────────────────────
  static async hasConsent(userId: string, tier: ConsentTier): Promise<boolean> {
    const record = await ConsentService.getCurrentConsent(userId);

    switch (tier) {
      case 1: return record?.tier1_service  ?? true;  // default: granted (core service)
      case 2: return record?.tier2_research  ?? false;
      case 3: return record?.tier3_commercial ?? false;
    }
  }

  // ── 3. recordConsent ─────────────────────────────────────────────────────
  static async recordConsent(
    userId:     string,
    updates:    ConsentUpdates,
    method:     ConsentMethod,
    ipAddress?: string,
  ): Promise<{ success: boolean; consentId?: string; error?: string }> {
    const supabase = getAdminClient();

    // Snapshot previous state before any mutation
    const previous = await ConsentService.getCurrentConsent(userId);

    // Mark existing current record(s) as no longer current
    if (previous) {
      const { error: markErr } = await supabase
        .from("consent_records")
        .update({ is_current: false })
        .eq("user_id", userId)
        .eq("is_current", true);

      if (markErr) {
        console.error("[ConsentService] recordConsent mark-old", markErr.message);
        return { success: false, error: markErr.message };
      }
    }

    // Carry forward unchanged fields; apply caller-supplied updates on top
    const newRecord = {
      user_id:              userId,
      tier1_service:        updates.tier1_service        ?? previous?.tier1_service        ?? true,
      tier2_research:       updates.tier2_research       ?? previous?.tier2_research       ?? false,
      tier2_research_types: updates.tier2_research_types ?? previous?.tier2_research_types ?? [],
      tier3_commercial:     updates.tier3_commercial     ?? previous?.tier3_commercial     ?? false,
      tier3_partners:       updates.tier3_partners       ?? previous?.tier3_partners       ?? [],
      consent_version:      process.env.CONSENT_VERSION  ?? "1.0",
      policy_version:       process.env.POLICY_VERSION   ?? "1.0",
      terms_version:        process.env.TERMS_VERSION    ?? "1.0",
      consent_method:       method,
      ip_address:           ipAddress ? hashIp(ipAddress) : null,
      user_agent:           null as string | null,
      is_current:           true,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("consent_records")
      .insert(newRecord)
      .select("id")
      .single();

    if (insertErr) {
      console.error("[ConsentService] recordConsent insert", insertErr.message);
      return { success: false, error: insertErr.message };
    }

    const consentId: string = (inserted as { id: string }).id;

    // Immutable audit trail
    const { error: auditErr } = await supabase
      .from("consent_audit_log")
      .insert({
        user_id:        userId,
        consent_id:     consentId,
        action:         previous ? "updated" : "created",
        previous_state: previous ?? null,
        new_state:      { ...newRecord, id: consentId },
        changed_by:     userId,
      });

    if (auditErr) {
      // Non-fatal — the consent record is already persisted; log and continue
      console.error("[ConsentService] recordConsent audit", auditErr.message);
    }

    // Fire-and-forget confirmation email
    void sendConsentConfirmationEmail(
      userId,
      { ...newRecord, id: consentId, created_at: new Date().toISOString() } as ConsentRecord,
    );

    return { success: true, consentId };
  }

  // ── 4. withConsentCheck ──────────────────────────────────────────────────
  static async withConsentCheck<T>(
    userId:       string,
    requiredTier: ConsentTier,
    dataFn:       () => Promise<T>,
    fallback:     T,
  ): Promise<T> {
    const ok = await ConsentService.hasConsent(userId, requiredTier);
    return ok ? dataFn() : fallback;
  }
}
