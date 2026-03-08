/// lib/critical-values.ts
// Server-only — import only from API routes or server components.

import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import type {
  CriticalValueThreshold,
  CriticalValueEvent,
  UserHealthContextRow,
} from "@/lib/types/health";

// ── Module-level threshold cache ──────────────────────────────────────────────
// Populated on first call, reused for the lifetime of the serverless instance.

let _thresholdCache: CriticalValueThreshold[] | null = null;

async function loadThresholds(): Promise<CriticalValueThreshold[]> {
  if (_thresholdCache) return _thresholdCache;
  const db = getAdminClient();
  const { data, error } = await db
    .from(TABLES.CRITICAL_VALUE_THRESHOLDS)
    .select("*");
  if (error) throw new Error(`Failed to load critical value thresholds: ${error.message}`);
  _thresholdCache = (data ?? []) as CriticalValueThreshold[];
  return _thresholdCache;
}

// ── 1. checkForCriticalValues ─────────────────────────────────────────────────

export async function checkForCriticalValues(
  results: Array<{ name: string; value: number; unit: string }>
): Promise<CriticalValueEvent[]> {
  const thresholds = await loadThresholds();

  // Build a lowercase map for O(1) lookup
  const thresholdMap = new Map<string, CriticalValueThreshold>();
  for (const t of thresholds) {
    thresholdMap.set(t.marker_name.toLowerCase(), t);
  }

  const events: CriticalValueEvent[] = [];
  const now = new Date().toISOString();

  for (const result of results) {
    const threshold = thresholdMap.get(result.name.toLowerCase());
    if (!threshold) continue;

    let triggered: "critical_high" | "critical_low" | null = null;
    let thresholdValue = 0;

    if (threshold.critical_high !== null && result.value > threshold.critical_high) {
      triggered = "critical_high";
      thresholdValue = threshold.critical_high;
    } else if (threshold.critical_low !== null && result.value < threshold.critical_low) {
      triggered = "critical_low";
      thresholdValue = threshold.critical_low;
    }

    if (!triggered) continue;

    // Shape matches CriticalValueEvent — id/user_id filled by caller or insert
    events.push({
      id:                   "",           // populated after DB insert
      user_id:              "",           // populated by gateCriticalProtocol
      marker_name:          result.name,
      observed_value:       result.value,
      threshold_triggered:  triggered,
      threshold_value:      thresholdValue,
      biomarker_result_id:  null,
      alerted_at:           now,
      user_acknowledged_at: null,
      practitioner_alerted: false,
      protocol_gated:       false,
      resolved_at:          null,
      notes:                threshold.immediate_action_text,
    });
  }

  return events;
}

// ── 2. gateCriticalProtocol ───────────────────────────────────────────────────

export async function gateCriticalProtocol(
  userId: string,
  criticalEvents: CriticalValueEvent[]
): Promise<void> {
  if (criticalEvents.length === 0) return;

  const db = getAdminClient();
  const now = new Date().toISOString();

  // Check whether this user has any practitioner connected
  const { data: practitioners } = await db
    .from(TABLES.PRACTITIONER_ACCESS)
    .select("id")
    .eq(COLS.USER_ID, userId)
    .eq("is_active", true)
    .limit(1);
  const hasPractitioner = (practitioners ?? []).length > 0;

  // Insert all critical events
  const eventRows = criticalEvents.map((e) => ({
    user_id:              userId,
    marker_name:          e.marker_name,
    observed_value:       e.observed_value,
    threshold_triggered:  e.threshold_triggered,
    threshold_value:      e.threshold_value,
    biomarker_result_id:  e.biomarker_result_id,
    alerted_at:           e.alerted_at,
    practitioner_alerted: hasPractitioner,
    protocol_gated:       true,
    notes:                e.notes,
  }));

  const { error: insertError } = await db
    .from(TABLES.CRITICAL_VALUE_EVENTS)
    .insert(eventRows);
  if (insertError) throw new Error(`Failed to insert critical value events: ${insertError.message}`);

  // Build gated_reason from all triggered markers
  const markerList = criticalEvents
    .map((e) => `${e.marker_name} (${e.threshold_triggered.replace("_", " ")})`)
    .join(", ");

  // Gate the user's protocol in user_health_context
  const { error: gateError } = await db
    .from(TABLES.USER_HEALTH_CONTEXT)
    .update({
      protocol_gated_reason:      markerList,
      protocol_gated_at:          now,
      protocol_gate_acknowledged: false,
    })
    .eq(COLS.USER_ID, userId);
  if (gateError) throw new Error(`Failed to gate protocol: ${gateError.message}`);

  // Log a notification
  const { error: notifError } = await db
    .from(TABLES.NOTIFICATION_LOG)
    .insert({
      user_id:      userId,
      trigger_type: "CRITICAL_VALUE_DETECTED",
      urgency:      0,
      payload: {
        markers:           criticalEvents.map((e) => e.marker_name),
        event_count:       criticalEvents.length,
        practitioner_notified: hasPractitioner,
      },
      sent_at: now,
    });
  if (notifError) throw new Error(`Failed to insert notification log: ${notifError.message}`);
}

// ── 3. isProtocolGated ────────────────────────────────────────────────────────

export function isProtocolGated(user: UserHealthContextRow): boolean {
  return user.protocol_gated_reason !== null && !user.protocol_gate_acknowledged;
}

// ── getActiveCriticalEvents: query helper used by gate responses ──────────────

export async function getActiveCriticalEvents(userId: string): Promise<CriticalValueEvent[]> {
  const db = getAdminClient();
  const { data } = await db
    .from(TABLES.CRITICAL_VALUE_EVENTS)
    .select("*")
    .eq(COLS.USER_ID, userId)
    .is("user_acknowledged_at", null)
    .order("alerted_at", { ascending: false });
  return (data ?? []) as CriticalValueEvent[];
}

// ── 4. acknowledgeGate ────────────────────────────────────────────────────────

export async function acknowledgeGate(
  userId: string,
  eventId: string,
  acknowledgement: "provider_seen" | "provider_contacted" | "dismiss"
): Promise<void> {
  const db = getAdminClient();
  const now = new Date().toISOString();

  const notes =
    acknowledgement === "dismiss"
      ? "User dismissed critical value warning without confirmed provider contact. This is recorded for clinical audit purposes."
      : null;

  // Acknowledge the specific event
  const { error: ackError } = await db
    .from(TABLES.CRITICAL_VALUE_EVENTS)
    .update({
      user_acknowledged_at: now,
      ...(notes ? { notes } : {}),
    })
    .eq(COLS.ID, eventId)
    .eq(COLS.USER_ID, userId);
  if (ackError) throw new Error(`Failed to acknowledge critical value event: ${ackError.message}`);

  // Check whether ALL unresolved events for this user are now acknowledged
  const { data: unresolved, error: fetchError } = await db
    .from(TABLES.CRITICAL_VALUE_EVENTS)
    .select("id, user_acknowledged_at")
    .eq(COLS.USER_ID, userId)
    .is("resolved_at", null);
  if (fetchError) throw new Error(`Failed to fetch unresolved events: ${fetchError.message}`);

  const allAcknowledged = (unresolved ?? []).every(
    (e: { id: string; user_acknowledged_at: string | null }) =>
      e.user_acknowledged_at !== null
  );

  if (allAcknowledged) {
    const { error: unlockError } = await db
      .from(TABLES.USER_HEALTH_CONTEXT)
      .update({ protocol_gate_acknowledged: true })
      .eq(COLS.USER_ID, userId);
    if (unlockError) throw new Error(`Failed to acknowledge protocol gate: ${unlockError.message}`);
  }
}
