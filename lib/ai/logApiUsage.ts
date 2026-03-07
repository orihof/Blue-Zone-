/// lib/ai/logApiUsage.ts
// Fire-and-forget helper — call after every Claude API response.
// Never throws; logs errors to console so callers are never blocked.

import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";

export interface ApiUsageParams {
  userId:       string;
  endpoint:     string;   // e.g. "/api/analysis/generate"
  model:        string;   // e.g. "claude-sonnet-4-20250514"
  inputTokens:  number;
  outputTokens: number;
  durationMs?:  number;   // wall-clock ms for the full pipeline
  reportId?:    string;   // FK → analysis_reports.id if applicable
  // ── Biomarker analysis stage-level detail (optional) ──────────────────────
  stage2InputTokens?:  number;   // sum of all parallel domain calls (Stage 2)
  stage2OutputTokens?: number;
  stage3InputTokens?:  number;   // synthesis call (Stage 3)
  stage3OutputTokens?: number;
  totalCostUsd?:       number;   // computed by caller: in×$0.000003 + out×$0.000015
  depthLevel?:         string;   // "essential" | "standard" | "comprehensive"
  dataCompleteness?:   number;   // 0–1 fraction of ideal biomarker panel present
}

/**
 * Log a Claude API call to the api_usage table.
 * Designed to be called without await — it never rejects.
 *
 * Usage (simple):
 *   logApiUsage({ userId, endpoint, model,
 *     inputTokens: resp.usage.input_tokens,
 *     outputTokens: resp.usage.output_tokens, durationMs });
 *
 * Usage (biomarker analysis — full detail):
 *   logApiUsage({ userId, endpoint: "/api/analysis/generate", model,
 *     inputTokens, outputTokens, durationMs, reportId,
 *     stage2InputTokens, stage2OutputTokens,
 *     stage3InputTokens, stage3OutputTokens,
 *     totalCostUsd, depthLevel, dataCompleteness });
 */
export function logApiUsage(params: ApiUsageParams): void {
  const supabase = getAdminClient();

  supabase
    .from(TABLES.API_USAGE)
    .insert({
      [COLS.USER_ID]:            params.userId,
      [COLS.ENDPOINT]:           params.endpoint,
      [COLS.MODEL]:              params.model,
      [COLS.INPUT_TOKENS]:       params.inputTokens,
      [COLS.OUTPUT_TOKENS]:      params.outputTokens,
      [COLS.DURATION_MS]:        params.durationMs           ?? null,
      report_id:                 params.reportId             ?? null,
      stage_2_input_tokens:      params.stage2InputTokens    ?? null,
      stage_2_output_tokens:     params.stage2OutputTokens   ?? null,
      stage_3_input_tokens:      params.stage3InputTokens    ?? null,
      stage_3_output_tokens:     params.stage3OutputTokens   ?? null,
      [COLS.COST_USD]:           params.totalCostUsd         ?? null,
      depth_level:               params.depthLevel           ?? null,
      data_completeness:         params.dataCompleteness     ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[logApiUsage] insert failed:", error.message);
    });
}
