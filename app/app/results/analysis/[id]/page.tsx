/// app/app/results/analysis/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { redirect }         from "next/navigation";
import { getAdminClient }   from "@/lib/supabase/admin";
import { TABLES, COLS }     from "@/lib/db/schema";
import type { AnalysisResult } from "@/lib/analysis/biomarker-engine";
import { AnalysisResultsPage } from "@/components/analysis/AnalysisResultsPage";

export default async function AnalysisReportRoute({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const { data: row } = await supabase
    .from(TABLES.ANALYSIS_REPORTS)
    .select("id, status, payload, error_message, generated_at, model")
    .eq(COLS.ID, params.id)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (!row) redirect("/app/dashboard");

  const status = row.status as string;

  if (status === "processing") {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7C3AED", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14 }}>
          Analysis in progress…
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h2 style={{ color: "#F1F5F9", fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 22, margin: 0 }}>
          Analysis generation failed
        </h2>
        {row.error_message && (
          <p style={{ color: "#64748B", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, maxWidth: 400, textAlign: "center" }}>
            {row.error_message as string}
          </p>
        )}
        <a href="/app/dashboard" style={{ marginTop: 8, padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg,#3B82F6,#7C3AED)", color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
          Back to Dashboard
        </a>
      </div>
    );
  }

  const payload = row.payload as AnalysisResult;

  return (
    <AnalysisResultsPage
      result={payload}
      reportId={params.id}
      generatedAt={row.generated_at as string}
    />
  );
}
