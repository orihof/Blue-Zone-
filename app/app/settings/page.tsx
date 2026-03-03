/// app/(app)/settings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsActions } from "@/components/settings/SettingsActions";
import { Download, Shield, CreditCard, Link2 } from "lucide-react";
import type { Plan } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  clinic: "Clinic",
};

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: ["Up to 3 protocols", "Demo data only", "Basic recommendations"],
  pro: ["Unlimited protocols", "Personal data analysis", "Share protocols", "Priority support"],
  clinic: ["Everything in Pro", "Clinic network access", "White-label exports", "Dedicated support"],
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const userId = session.user.id;

  // Fetch counts for the privacy overview
  const [
    { count: uploadCount },
    { count: protocolCount },
    { count: checkinCount },
    { data: accounts },
  ] = await Promise.all([
    supabase.from(TABLES.UPLOADS).select("*", { count: "exact", head: true }).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.PROTOCOLS).select("*", { count: "exact", head: true }).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.CHECKIN_RESPONSES).select("*", { count: "exact", head: true }).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.ACCOUNTS).select(`${COLS.ID},provider`).eq(COLS.USER_ID, userId),
  ]);

  const plan = (session.user.plan ?? "free") as Plan;
  const connectedProviders = (accounts ?? []).map((a: { id: string; provider: string }) => a.provider);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account, data, and privacy.
        </p>
      </div>

      {/* Account info */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">{session.user.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <Badge variant={plan === "free" ? "secondary" : "default"} className="text-xs capitalize">
              {PLAN_LABELS[plan]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Plan info */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{PLAN_LABELS[plan]} Plan</p>
              <ul className="mt-1 space-y-0.5">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            {plan === "free" && (
              <a
                href="/#pricing"
                className="flex-shrink-0 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 text-xs font-medium"
              >
                Upgrade
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts */}
      {connectedProviders.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Connected accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {connectedProviders.map((provider) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                    {provider[0]}
                  </div>
                  <span className="text-sm text-slate-700 capitalize">{provider}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">Connected</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Privacy center */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Privacy center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <div className="grid grid-cols-3 gap-3 pb-3 border-b border-slate-100">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">{uploadCount ?? 0}</p>
              <p>Uploads</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">{protocolCount ?? 0}</p>
              <p>Protocols</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">{checkinCount ?? 0}</p>
              <p>Check-ins</p>
            </div>
          </div>
          <p className="pt-2">
            Your data is stored securely and used only to generate your longevity protocol.
            We never sell your data to third parties.
          </p>
        </CardContent>
      </Card>

      {/* Action buttons (client component for interactivity) */}
      <SettingsActions />
    </div>
  );
}
