/// app/(app)/protocol/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { Disclaimer } from "@/components/common/Disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { ProtocolOutputSchema } from "@/lib/types/health";
import type { ProtocolOutput } from "@/lib/types/health";

interface PageProps {
  searchParams: { outputId?: string };
}

export default async function ProtocolPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const { outputId } = searchParams;
  if (!outputId) redirect("/app/onboarding/dial");

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from(TABLES.PROTOCOL_OUTPUTS)
    .select(`${COLS.ID}, ${COLS.PARSED_OUTPUT}, ${COLS.PRIORITY_SCORE}, ${COLS.CREATED_AT}, ${COLS.MODEL}`)
    .eq(COLS.ID, outputId)
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (error || !data) notFound();

  const parsed = ProtocolOutputSchema.safeParse(data.parsed_output);
  if (!parsed.success) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="py-8 text-center space-y-4">
            <p className="font-semibold text-red-800">Protocol data is invalid</p>
            <p className="text-sm text-red-600">Something went wrong with the stored protocol.</p>
            <Link href="/app/onboarding/dial">
              <Button size="sm" variant="outline" className="border-red-200 text-red-600">
                Try again
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const output: ProtocolOutput = parsed.data;

  const createdAt = new Date(data.created_at as string).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Your Longevity Protocol</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generated {createdAt} · {data.model as string}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-xs capitalize">
            AI-powered
          </Badge>
          <Link href="/app/onboarding/dial">
            <Button variant="outline" size="sm" className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </Link>
        </div>
      </div>

      {/* Protocol content */}
      <Card>
        <CardContent className="py-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">{output.summary}</p>
          {output.pillars.map((pillar) => (
            <div key={pillar.name} className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{pillar.name}</p>
              <p className="text-xs text-slate-500">{pillar.insight}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Disclaimer />
    </div>
  );
}
