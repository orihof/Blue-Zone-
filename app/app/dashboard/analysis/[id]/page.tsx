/// app/app/dashboard/analysis/[id]/page.tsx
// Biomarker analysis report page — user-scoped, protected.
// Fetches: analysis_reports (payload) + profiles (bio age, user tier).

import { getServerSession }  from "next-auth";
import { authOptions }       from "@/lib/auth";
import { redirect }          from "next/navigation";
import { getAdminClient }    from "@/lib/supabase/admin";
import { TABLES, COLS }      from "@/lib/db/schema";
import type { AnalysisResult } from "@/lib/analysis/biomarker-engine";
import { AnalysisReport }    from "@/components/analysis/AnalysisReport";

export default async function AnalysisDashboardRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const userId   = session.user.id as string;

  const [reportRes, profileRes] = await Promise.all([
    supabase
      .from(TABLES.ANALYSIS_REPORTS)
      .select(`${COLS.ID}, ${COLS.STATUS}, ${COLS.PAYLOAD}, ${COLS.ERROR_MESSAGE}, ${COLS.GENERATED_AT}`)
      .eq(COLS.ID, (await params).id)
      .eq(COLS.USER_ID, userId)
      .maybeSingle(),

    supabase
      .from(TABLES.PROFILES)
      .select(`${COLS.BIOLOGICAL_AGE}, ${COLS.BIOLOGICAL_AGE_DELTA}, ${COLS.USER_TIER}, ${COLS.AGE}`)
      .eq(COLS.ID, userId)
      .maybeSingle(),
  ]);

  // Not found or belongs to another user
  if (!reportRes.data) redirect("/app/dashboard");

  const row     = reportRes.data;
  const profile = profileRes.data as Record<string, unknown> | null;
  const status  = row[COLS.STATUS] as string;

  // ── Processing ────────────────────────────────────────────────────────────
  if (status === "processing") {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(124,58,237,.15)", borderTopColor: "#7C3AED", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, margin: 0 }}>
          Analysis in progress…
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (status === "failed") {
    const errMsg = row[COLS.ERROR_MESSAGE] as string | null;
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h2 style={{ color: "#F1F5F9", fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 22, margin: 0 }}>
          Analysis generation failed
        </h2>
        {errMsg && (
          <p style={{ color: "#64748B", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, maxWidth: 400, textAlign: "center", margin: 0 }}>
            {errMsg}
          </p>
        )}
        <a
          href="/app/dashboard"
          style={{ marginTop: 8, padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg,#3B82F6,#7C3AED)", color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  // ── Ready ─────────────────────────────────────────────────────────────────
  const result      = row[COLS.PAYLOAD]      as AnalysisResult;
  const generatedAt = row[COLS.GENERATED_AT] as string;

  const biologicalAge      = typeof profile?.biological_age       === "number" ? profile.biological_age      : null;
  const biologicalAgeDelta = typeof profile?.biological_age_delta  === "number" ? profile.biological_age_delta : null;
  const chronologicalAge   = typeof profile?.age                   === "number" ? profile.age                  : null;
  const userTier           = typeof profile?.user_tier             === "string"  ? profile.user_tier            : "basic";

  return (
    <AnalysisReport
      result={result}
      reportId={(await params).id}
      generatedAt={generatedAt}
      biologicalAge={biologicalAge}
      biologicalAgeDelta={biologicalAgeDelta}
      chronologicalAge={chronologicalAge}
      userTier={userTier}
    />
  );
}
