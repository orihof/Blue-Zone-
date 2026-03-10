/// lib/consent/sendConsentConfirmationEmail.ts
// Server-only — never import from client components
import { createHash } from "crypto";
import { Resend } from "resend";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ConsentRecord } from "./ConsentService";

const FROM = process.env.EMAIL_FROM ?? "privacy@bluezone.app";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

function fmtBool(v: boolean): string {
  return v ? "Opted in ✓" : "Opted out";
}

/** Returns a human-readable list of what changed between previous and new record. */
function describeDiff(previous: ConsentRecord | null, next: ConsentRecord): string[] {
  if (!previous) return ["Consent preferences recorded for the first time."];

  const changes: string[] = [];

  if (previous.tier2_research !== next.tier2_research) {
    const label = next.tier2_research ? "opted in to" : "opted out of";
    changes.push(`You ${label} Longevity Research data sharing.`);
  }

  if (previous.tier3_commercial !== next.tier3_commercial) {
    const label = next.tier3_commercial ? "opted in to" : "opted out of";
    changes.push(`You ${label} Partner Benefits data sharing.`);
  }

  return changes.length > 0 ? changes : ["No changes detected — preferences confirmed."];
}

/** Minimal HTML email body. */
function buildHtml(changes: string[], record: ConsentRecord): string {
  const changeItems = changes
    .map((c) => `<li style="margin-bottom:6px;">${c}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Your Blue Zone privacy settings were updated</title></head>
<body style="margin:0;padding:0;background:#06090D;font-family:system-ui,sans-serif;color:#e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06090D;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0D1117;border-radius:16px;border:1px solid rgba(255,255,255,0.08);padding:40px 36px;max-width:560px;width:100%;">

        <!-- Logo / brand -->
        <tr><td style="padding-bottom:28px;">
          <span style="font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">Blue Zone</span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="padding-bottom:20px;">
          <h1 style="margin:0;font-size:20px;font-weight:600;color:#ffffff;line-height:1.3;">
            Your privacy settings were updated
          </h1>
          <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.5);">
            Here's a summary of what changed.
          </p>
        </td></tr>

        <!-- What changed -->
        <tr><td style="padding-bottom:24px;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px 20px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.3);">What changed</p>
            <ul style="margin:0;padding-left:18px;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;">
              ${changeItems}
            </ul>
          </div>
        </td></tr>

        <!-- Current settings -->
        <tr><td style="padding-bottom:28px;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px 20px;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.3);">Current settings</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:rgba(255,255,255,0.6);">
              <tr>
                <td style="padding:5px 0;">Service Operations</td>
                <td align="right" style="color:#00E5A0;">Always active</td>
              </tr>
              <tr>
                <td style="padding:5px 0;border-top:1px solid rgba(255,255,255,0.05);">Longevity Research</td>
                <td align="right" style="border-top:1px solid rgba(255,255,255,0.05);color:${record.tier2_research ? "#00E5A0" : "rgba(255,255,255,0.4)"};">
                  ${fmtBool(record.tier2_research)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;border-top:1px solid rgba(255,255,255,0.05);">Partner Benefits</td>
                <td align="right" style="border-top:1px solid rgba(255,255,255,0.05);color:${record.tier3_commercial ? "#00E5A0" : "rgba(255,255,255,0.4)"};">
                  ${fmtBool(record.tier3_commercial)}
                </td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding-bottom:28px;text-align:center;">
          <a href="${process.env.NEXTAUTH_URL ?? ""}/app/settings/privacy"
             style="display:inline-block;background:#7EB8F7;color:#06090D;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">
            Manage Privacy Settings →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);line-height:1.6;">
            You received this because your Blue Zone privacy preferences were updated.<br />
            If you didn't make this change, please contact us immediately.<br />
            Consent record ID: <code style="font-size:11px;">${record.id}</code>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function sendConsentConfirmationEmail(
  userId:     string,
  newConsent: ConsentRecord,
): Promise<void> {
  const supabase = getAdminClient();

  // 1. Fetch user email
  const { data: userRow, error: userErr } = await supabase
    .from("nextauth_users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (userErr || !userRow?.email) {
    await supabase.from("consent_audit_log").insert({
      user_id:    userId,
      consent_id: newConsent.id,
      event_type: "confirmation_email_failed",
      new_state: {
        error:  userErr?.message ?? "User email not found",
        stage:  "fetch_user",
      },
    });
    return;
  }

  const email: string = userRow.email as string;

  // 2. Fetch the previous consent from the audit log to compute diff
  const { data: auditRows } = await supabase
    .from("consent_audit_log")
    .select("previous_state")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const previousRaw = auditRows?.[0]?.previous_state as ConsentRecord | null | undefined;
  const previous: ConsentRecord | null = previousRaw ?? null;

  // 3. Build + send email
  const changes = describeDiff(previous, newConsent);
  const html    = buildHtml(changes, newConsent);

  const client = getResend();
  if (!client) {
    // RESEND_API_KEY not configured — skip email silently
    return;
  }

  const { error: sendErr } = await client.emails.send({
    from:    FROM,
    to:      email,
    subject: "Your Blue Zone privacy settings were updated",
    html,
  });

  // 4a. Success audit log
  if (!sendErr) {
    await supabase.from("consent_audit_log").insert({
      user_id:    userId,
      consent_id: newConsent.id,
      event_type: "confirmation_email_sent",
      new_state: {
        email_hash: hashEmail(email),
        changes,
      },
    });
    return;
  }

  // 4b. Failure audit log
  await supabase.from("consent_audit_log").insert({
    user_id:    userId,
    consent_id: newConsent.id,
    event_type: "confirmation_email_failed",
    new_state: {
      error:      sendErr.message,
      email_hash: hashEmail(email),
    },
  });
}
