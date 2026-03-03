/// app/(app)/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckinForm } from "@/components/dashboard/CheckinForm";
import { AdherenceSparkline } from "@/components/dashboard/AdherenceSparkline";
import Link from "next/link";
import { ArrowRight, Upload, RotateCcw, CheckCircle2, Circle, FlaskConical } from "lucide-react";
import type { ProtocolPayload } from "@/lib/db/payload";

export const dynamic = "force-dynamic";

const SCORE_META = [
  { key: "recovery" as const, label: "Recovery", color: "#10b981" },
  { key: "sleep" as const, label: "Sleep", color: "#6366f1" },
  { key: "metabolic" as const, label: "Metabolic", color: "#f59e0b" },
  { key: "readiness" as const, label: "Readiness", color: "#0ea5e9" },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const userId = session.user.id;

  // Fetch latest ready protocol
  const { data: protocols } = await supabase
    .from(TABLES.PROTOCOLS)
    .select("*")
    .eq(COLS.USER_ID, userId)
    .eq(COLS.STATUS, "ready")
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(5);

  const latest = protocols?.[0];
  const payload = latest?.payload as ProtocolPayload | undefined;

  // Fetch upload count
  const { count: uploadCount } = await supabase
    .from(TABLES.UPLOADS)
    .select("*", { count: "exact", head: true })
    .eq(COLS.USER_ID, userId);

  // Fetch latest check-in week number
  const { data: lastCheckin } = await supabase
    .from(TABLES.CHECKIN_RESPONSES)
    .select(COLS.WEEK_NUMBER)
    .eq(COLS.USER_ID, userId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextWeek = (lastCheckin?.week_number ?? 0) + 1;

  // Build sparkline data from all protocols
  const sparklineData = (protocols ?? [])
    .filter((p) => p.payload?.scores)
    .reverse()
    .map((p, i) => ({
      label: `Protocol ${i + 1}`,
      recovery: p.payload.scores.recovery,
      sleep: p.payload.scores.sleep,
      metabolic: p.payload.scores.metabolic,
      readiness: p.payload.scores.readiness,
    }));

  const hasUploads = (uploadCount ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {latest
              ? `Last protocol generated ${new Date(latest.created_at).toLocaleDateString()}`
              : "No protocol yet — get started below"}
          </p>
        </div>
        <Badge variant={session.user.plan === "free" ? "secondary" : "default"} className="text-xs capitalize">
          {session.user.plan} plan
        </Badge>
      </div>

      {/* No protocol CTA */}
      {!latest && (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center space-y-4">
            <FlaskConical className="w-10 h-10 text-primary mx-auto" />
            <div>
              <h2 className="font-semibold text-slate-800">No protocol yet</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload health data or use the dial to generate your first longevity protocol.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Link href="/app/onboarding/upload">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Upload data
                </Button>
              </Link>
              <Link href="/app/onboarding/dial">
                <Button size="sm" className="gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" /> Generate protocol
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scores */}
      {payload && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SCORE_META.map(({ key, label, color }) => (
              <Card key={key} className="border border-slate-200">
                <CardContent className="pt-4 pb-4 px-4 space-y-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <AdherenceSparkline
                    data={sparklineData}
                    metric={key}
                    color={color}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Latest protocol link */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Latest protocol</p>
              <p className="text-xs text-muted-foreground">
                {latest.mode === "demo" ? "Demo • " : "Personal • "}
                Age {latest.selected_age} • {latest.budget}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/app/results/${latest.id}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  View <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
              <Link href={`/app/onboarding/dial`}>
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8">
                  <RotateCcw className="w-3 h-3" /> Regenerate
                </Button>
              </Link>
            </div>
          </div>

          {/* Daily checklist */}
          {payload.habits.dailyChecklist.length > 0 && (
            <Card className="border border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Today&apos;s checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payload.habits.dailyChecklist.filter((i) => i.frequency === "daily").map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{item.title}</span>
                    {item.timeOfDay && (
                      <Badge variant="outline" className="text-[10px] ml-auto">{item.timeOfDay.toUpperCase()}</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Weekly check-in */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Week {nextWeek} Check-In
                </CardTitle>
                <Badge variant="secondary" className="text-xs">Weekly</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CheckinForm
                questions={payload.habits.weeklyCheckInQuestions}
                protocolId={latest.id}
                weekNumber={nextWeek}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* New data banner */}
      {latest && hasUploads && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-blue-800">
            You have {uploadCount} upload{uploadCount !== 1 ? "s" : ""}.
            {latest.mode === "demo" && " Generate a personal protocol with your real data."}
          </p>
          <Link href="/app/onboarding/dial">
            <Button size="sm" className="flex-shrink-0 gap-1.5 text-xs h-8">
              Update protocol <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
