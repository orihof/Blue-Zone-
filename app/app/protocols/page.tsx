/// app/(app)/protocols/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProtocolDiff } from "@/components/protocols/ProtocolDiff";
import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import type { ProtocolPayload } from "@/lib/db/payload";

export const dynamic = "force-dynamic";

interface ProtocolRow {
  id: string;
  selected_age: number;
  goals: string[];
  budget: string;
  mode: "demo" | "personal";
  status: string;
  payload: ProtocolPayload | null;
  created_at: string;
}

const BUDGET_LABELS: Record<string, string> = {
  low: "Essentials",
  medium: "Optimized",
  high: "All-in",
};

const GOAL_LABELS: Record<string, string> = {
  energy: "Energy",
  sleep: "Sleep",
  focus: "Focus",
  strength: "Strength",
  fat_loss: "Fat Loss",
  recovery: "Recovery",
  hormones: "Hormones",
  longevity: "Longevity",
};

export default async function ProtocolsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const { data: protocols } = await supabase
    .from(TABLES.PROTOCOLS)
    .select(`${COLS.ID},${COLS.SELECTED_AGE},${COLS.GOALS},${COLS.BUDGET},${COLS.MODE},${COLS.STATUS},${COLS.PAYLOAD},${COLS.CREATED_AT}`)
    .eq(COLS.USER_ID, session.user.id)
    .order(COLS.CREATED_AT, { ascending: false });

  const rows = (protocols ?? []) as ProtocolRow[];
  const readyProtocols = rows.filter((p) => p.status === "ready");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Protocol History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rows.length} protocol{rows.length !== 1 ? "s" : ""} generated
          </p>
        </div>
        <Link href="/app/onboarding/dial">
          <Button size="sm" className="gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" /> New Protocol
          </Button>
        </Link>
      </div>

      {rows.length === 0 && (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-10 text-center space-y-3">
            <FlaskConical className="w-10 h-10 text-primary mx-auto" />
            <p className="font-semibold text-slate-800">No protocols yet</p>
            <p className="text-sm text-muted-foreground">
              Generate your first longevity protocol to get started.
            </p>
            <Link href="/app/onboarding/dial">
              <Button size="sm" className="gap-1.5 mt-1">
                <ArrowRight className="w-3.5 h-3.5" /> Generate protocol
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((protocol, index) => (
            <Card key={protocol.id} className="border border-slate-200">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">
                        Protocol #{rows.length - index}
                      </span>
                      <Badge
                        variant={protocol.mode === "demo" ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {protocol.mode === "demo" ? "Demo" : "Personal"}
                      </Badge>
                      {protocol.status !== "ready" && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {protocol.status}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {new Date(protocol.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · Age {protocol.selected_age} · {BUDGET_LABELS[protocol.budget] ?? protocol.budget}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {(protocol.goals ?? []).slice(0, 4).map((g) => (
                        <Badge key={g} variant="outline" className="text-[10px] px-1.5 py-0">
                          {GOAL_LABELS[g] ?? g}
                        </Badge>
                      ))}
                      {(protocol.goals ?? []).length > 4 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{(protocol.goals ?? []).length - 4} more
                        </Badge>
                      )}
                    </div>

                    {protocol.payload?.scores && (
                      <div className="flex gap-3 pt-0.5">
                        {(["recovery", "sleep", "metabolic", "readiness"] as const).map((k) => (
                          <div key={k} className="text-center">
                            <div className="text-xs font-semibold text-slate-700">
                              {protocol.payload!.scores[k]}
                            </div>
                            <div className="text-[10px] text-muted-foreground capitalize">{k}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {protocol.status === "ready" && (
                    <Link href={`/app/results/${protocol.id}`} className="flex-shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                        View <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Side-by-side diff for two most recent ready protocols */}
      {readyProtocols.length >= 2 &&
        readyProtocols[1].payload != null &&
        readyProtocols[0].payload != null && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Protocol Comparison</h2>
          <ProtocolDiff
            a={readyProtocols[1] as ProtocolRow & { payload: ProtocolPayload }}
            b={readyProtocols[0] as ProtocolRow & { payload: ProtocolPayload }}
          />
        </div>
      )}
    </div>
  );
}
