/// app/app/results/sports/[id]/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import type { SportsProtocolPayload } from "@/lib/db/sports-payload";
import { SportsResultsPage } from "@/components/sports/SportsResultsPage";

export default async function SportsResultsRoute({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const [{ data: row }, { data: wearable }, { data: bloodTest }, { data: adoptions }] = await Promise.all([
    supabase
      .from(TABLES.SPORTS_PROTOCOLS)
      .select("*")
      .eq(COLS.ID, params.id)
      .eq(COLS.USER_ID, session.user.id)
      .maybeSingle(),
    supabase
      .from(TABLES.WEARABLE_SNAPSHOTS)
      .select(COLS.ID)
      .eq(COLS.USER_ID, session.user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from(TABLES.BIOMARKERS)
      .select(COLS.ID)
      .eq(COLS.USER_ID, session.user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from(TABLES.USER_SUPPLEMENT_ADOPTIONS)
      .select(COLS.SUPPLEMENT_NAME)
      .eq(COLS.USER_ID, session.user.id),
  ]);

  if (!row) {
    redirect("/app/goals");
  }

  const status = row[COLS.STATUS] as string;

  // Still processing — show spinner (rare: API is synchronous, but guard just in case)
  if (status === "processing") {
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7C3AED", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14 }}>
          Building your competition protocol…
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Failed
  if (status === "failed") {
    const errMsg = row[COLS.ERROR_MESSAGE] as string | null;
    return (
      <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h2 style={{ color: "#F1F5F9", fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 22, margin: 0 }}>
          Protocol generation failed
        </h2>
        {errMsg && (
          <p style={{ color: "#64748B", fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontSize: 12, maxWidth: 400, textAlign: "center" }}>
            {errMsg}
          </p>
        )}
        <a href="/app/onboarding/sports-prep" style={{ marginTop: 8, padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#06B6D4)", color: "#fff", fontFamily: "var(--font-ui,'Inter',sans-serif)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
          Try Again
        </a>
      </div>
    );
  }

  // Ready
  const payload          = row[COLS.PAYLOAD] as SportsProtocolPayload;
  const competitionType  = row[COLS.COMPETITION_TYPE] as string;

  // Community count: other athletes with same competition type active in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { count: communityCount } = await supabase
    .from(TABLES.SPORTS_PROTOCOLS)
    .select(COLS.ID, { count: "exact", head: true })
    .eq(COLS.COMPETITION_TYPE, competitionType)
    .eq(COLS.STATUS, "ready")
    .neq(COLS.USER_ID, session.user.id)
    .gte(COLS.CREATED_AT, thirtyDaysAgo);

  const eventMeta = {
    competitionType,
    eventDate:        row[COLS.EVENT_DATE]         as string,
    weeksToEvent:     row[COLS.WEEKS_TO_EVENT]     as number,
    priorityOutcome:  row[COLS.PRIORITY_OUTCOME]   as string,
    experienceLevel:  row[COLS.EXPERIENCE_LEVEL]   as string,
    budgetTier:       row[COLS.BUDGET_TIER]         as number,
    budgetValue:      row[COLS.BUDGET_VALUE]        as number,
  };

  const initialAdoptedIds = (adoptions ?? []).map((a) => a[COLS.SUPPLEMENT_NAME] as string);

  return (
    <SportsResultsPage
      payload={payload}
      eventMeta={eventMeta}
      hasWearable={!!wearable}
      hasBloodTest={!!bloodTest}
      communityCount={communityCount ?? 0}
      protocolId={params.id}
      initialAdoptedIds={initialAdoptedIds}
    />
  );
}
