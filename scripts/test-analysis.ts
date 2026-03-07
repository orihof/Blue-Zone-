/// scripts/test-analysis.ts
// Smoke test for the biomarker analysis engine.
// Loads .env.local, runs generateAnalysis with a realistic sample input,
// and prints key result fields to stdout.
//
// Run:
//   npx ts-node -r tsconfig-paths/register \
//     --project tsconfig.scripts.json scripts/test-analysis.ts

import * as fs   from "fs";
import * as path from "path";

// Imports are hoisted to the top by the TypeScript → CJS compiler, but the
// Anthropic client is created lazily inside getClient() — so setting
// process.env here (before calling generateAnalysis) is sufficient.
import { generateAnalysis }            from "@/lib/analysis/biomarker-engine";
import { sampleAdvancedMaleAthlete }   from "@/lib/analysis/__tests__/sample-input";

// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Load .env.local ────────────────────────────────────────────────────────
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      // Strip optional surrounding single/double quotes from the value
      const val = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
    console.log(`[env] Loaded ${envPath}`);
  } else {
    console.warn(`[env] .env.local not found — ANTHROPIC_API_KEY must already be set`);
  }

  // ── Run the pipeline ───────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Blue Zone — Biomarker Engine Smoke Test");
  console.log("  Input: sampleAdvancedMaleAthlete (38yo male, advanced tier)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const t0              = Date.now();
  const { result, usage, depth } = await generateAnalysis(sampleAdvancedMaleAthlete);
  const elapsed         = Date.now() - t0;

  // ── Overall ────────────────────────────────────────────────────────────────
  console.log("━━━ Overall ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  overall_score:         ${result.overallScore} / 100  (grade ${result.overallGrade})`);
  console.log(`  data_completeness:     ${Math.round(result.dataCompleteness * 100)}%`);

  // biological_age / biological_age_delta are computed externally (profiles table)
  // and are not part of AnalysisOutput — check in case Claude added them anyway
  const raw = result as unknown as Record<string, unknown>;
  console.log(`  biological_age:        ${raw["biologicalAge"]       ?? "N/A (derived externally from profiles table)"}`);
  console.log(`  biological_age_delta:  ${raw["biologicalAgeDelta"]  ?? "N/A (derived externally from profiles table)"}`);

  console.log(`\n  Summary:\n  ${result.summary}\n`);

  // ── Domain scores ──────────────────────────────────────────────────────────
  console.log("━━━ Domain Scores ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const d of result.domainScores) {
    const bar = "█".repeat(Math.round(d.score / 10)).padEnd(10, "░");
    console.log(`  ${d.domain.padEnd(16)} ${bar}  ${d.score}/100  (${d.grade})`);
  }

  // ── Top 3 supplements ─────────────────────────────────────────────────────
  console.log("\n━━━ Top 3 Supplement Recommendations ━━━━━━━━━━━━━━━━━━━━━━━");
  const top3 = result.protocol.supplements.slice(0, 3);
  if (top3.length === 0) {
    console.log("  (none returned)");
  } else {
    top3.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}  —  ${s.dose}  @  ${s.timing}`);
      console.log(`     Rationale  : ${s.rationale}`);
      console.log(`     Targets    : ${s.targetMarkers.join(", ") || "—"}`);
      if ((s.contraindications ?? []).length > 0) {
        console.log(`     ⚠ Contraindications: ${s.contraindications!.join("; ")}`);
      }
      console.log();
    });
  }

  // ── Top 2 cross-domain signals ─────────────────────────────────────────────
  console.log("━━━ Top 2 Cross-Domain Signals ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const top2sig = result.crossDomainSignals.slice(0, 2);
  if (top2sig.length === 0) {
    console.log("  (none returned)");
  } else {
    top2sig.forEach((sig, i) => {
      console.log(`  ${i + 1}. [${sig.priority.toUpperCase()}] ${sig.signal}`);
      console.log(`     Domains  : ${sig.domains.join(", ")}`);
      console.log(`     Markers  : ${sig.markers.join(", ") || "—"}`);
      console.log(`     ${sig.explanation}`);
      console.log();
    });
  }

  // ── Critical flags ─────────────────────────────────────────────────────────
  console.log("━━━ Critical Flags ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (result.criticalFlags.length === 0) {
    console.log("  ✓ None");
  } else {
    result.criticalFlags.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.marker}${f.value ? `  (${f.value})` : ""}  [urgency: ${f.urgency}]`);
      console.log(`     Concern : ${f.concern}`);
      console.log(`     Action  : ${f.action}`);
      console.log();
    });
  }

  // ── Token usage + cost ─────────────────────────────────────────────────────
  const totalIn  = usage.stage2InputTokens  + usage.stage3InputTokens;
  const totalOut = usage.stage2OutputTokens + usage.stage3OutputTokens;
  const costUsd  = totalIn * 0.000003 + totalOut * 0.000015;
  console.log("━━━ Token Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Depth level:          ${depth}`);
  console.log(`  Stage 2 (domains):    ${usage.stage2InputTokens} in / ${usage.stage2OutputTokens} out`);
  console.log(`  Stage 3 (synthesis):  ${usage.stage3InputTokens} in / ${usage.stage3OutputTokens} out`);
  console.log(`  Total tokens:         ${totalIn} in / ${totalOut} out`);
  console.log(`  Estimated cost:       $${costUsd.toFixed(4)}`);

  // ── Timing ─────────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Total execution time: ${elapsed} ms`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━\n");
}

main().catch((err: unknown) => {
  console.error("\n[FATAL] Unhandled error:");
  if (err instanceof Error) {
    console.error(err.stack ?? err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});
