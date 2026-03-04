/// app/app/settings/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsActions } from "@/components/settings/SettingsActions";
import { Download, Shield, CreditCard, Link2, Activity } from "lucide-react";
import type { Plan } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<Plan, string> = { free: "Free", pro: "Pro", clinic: "Clinic" };
const PLAN_FEATURES: Record<Plan, string[]> = {
  free:   ["Up to 3 protocols", "Demo data only", "Basic recommendations"],
  pro:    ["Unlimited protocols", "Personal data analysis", "Share protocols", "Priority support"],
  clinic: ["Everything in Pro", "Clinic network access", "White-label exports", "Dedicated support"],
};

const WEARABLE_META: Record<string, { name: string; icon: string }> = {
  whoop:        { name: "WHOOP",        icon: "⚡" },
  oura:         { name: "Oura Ring",    icon: "💍" },
  garmin:       { name: "Garmin",       icon: "🏃" },
  apple_health: { name: "Apple Health", icon: "🍎" },
  lumen:        { name: "Lumen",        icon: "🔬" },
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const userId   = session.user.id;

  const [
    { count: uploadCount },
    { count: protocolCount },
    { count: checkinCount },
    { data: accounts },
    { data: wearableConns },
  ] = await Promise.all([
    supabase.from(TABLES.UPLOADS).select("*", { count: "exact", head: true }).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.PROTOCOLS).select("*", { count: "exact", head: true }).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.CHECKIN_RESPONSES).select("*", { count: "exact", head: true }).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.ACCOUNTS).select(`${COLS.ID},provider`).eq(COLS.USER_ID, userId),
    supabase.from(TABLES.WEARABLE_CONNECTIONS).select("provider,connected_at").eq(COLS.USER_ID, userId),
  ]);

  const plan = (session.user.plan ?? "free") as Plan;
  const connectedProviders = (accounts ?? []).map((a: { id: string; provider: string }) => a.provider);
  const wearables = (wearableConns ?? []) as { provider: string; connected_at: string }[];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#F1F5F9" }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
          Manage your account, data, and connected devices.
        </p>
      </div>

      {/* Account */}
      <Card style={{ background: "#111827", border: "1px solid rgba(99,102,241,0.12)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#F1F5F9" }}>
            <Shield className="w-4 h-4" style={{ color: "#6366F1" }} /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "#F1F5F9" }}>{session.user.name ?? "—"}</p>
              <p className="text-xs" style={{ color: "#64748B" }}>{session.user.email}</p>
            </div>
            <Badge variant={plan === "free" ? "secondary" : "default"} className="text-xs capitalize">
              {PLAN_LABELS[plan]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card style={{ background: "#111827", border: "1px solid rgba(99,102,241,0.12)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#F1F5F9" }}>
            <CreditCard className="w-4 h-4" style={{ color: "#6366F1" }} /> Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>{PLAN_LABELS[plan]} Plan</p>
              <ul className="mt-1 space-y-0.5">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="text-xs flex items-center gap-1.5" style={{ color: "#64748B" }}>
                    <span className="w-1 h-1 rounded-full inline-block" style={{ background: "#6366F1" }} />{f}
                  </li>
                ))}
              </ul>
            </div>
            {plan === "free" && (
              <a href="/#pricing"
                className="flex-shrink-0 inline-flex items-center justify-center rounded-lg h-8 px-3 text-xs font-medium"
                style={{ background: "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)", color: "#fff" }}>
                Upgrade
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connected wearables */}
      <Card style={{ background: "#111827", border: "1px solid rgba(99,102,241,0.12)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#F1F5F9" }}>
            <Activity className="w-4 h-4" style={{ color: "#6366F1" }} /> Connected Wearables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {wearables.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs" style={{ color: "#64748B" }}>No wearables connected yet.</p>
              <a href="/app/onboarding?step=2" className="inline-block mt-2 text-xs underline" style={{ color: "#A5B4FC" }}>
                Connect a device →
              </a>
            </div>
          ) : (
            <>
              {wearables.map((w) => {
                const meta = WEARABLE_META[w.provider] ?? { name: w.provider, icon: "⌚" };
                const connectedDate = new Date(w.connected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                return (
                  <div key={w.provider} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                        style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)" }}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: "#F1F5F9" }}>{meta.name}</p>
                        <p className="text-xs" style={{ color: "#64748B" }}>Connected {connectedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]" style={{ color: "#10B981", borderColor: "rgba(16,185,129,.3)" }}>
                        Active
                      </Badge>
                      <a href={`/api/oauth/${w.provider.replace("_health", "")}/start`}
                        className="text-[10px] underline" style={{ color: "#64748B" }}>
                        Reconnect
                      </a>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                <a href="/app/onboarding?step=2" className="text-xs underline" style={{ color: "#A5B4FC" }}>
                  + Connect another device
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Auth sign-in methods */}
      {connectedProviders.length > 0 && (
        <Card style={{ background: "#111827", border: "1px solid rgba(99,102,241,0.12)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#F1F5F9" }}>
              <Link2 className="w-4 h-4" style={{ color: "#6366F1" }} /> Sign-in methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {connectedProviders.map((provider) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold uppercase"
                    style={{ background: "rgba(99,102,241,.1)", color: "#A5B4FC" }}>
                    {provider[0]}
                  </div>
                  <span className="text-sm capitalize" style={{ color: "#F1F5F9" }}>{provider}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">Connected</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Privacy center */}
      <Card style={{ background: "#111827", border: "1px solid rgba(99,102,241,0.12)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2" style={{ color: "#F1F5F9" }}>
            <Download className="w-4 h-4" style={{ color: "#6366F1" }} /> Privacy center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs" style={{ color: "#64748B" }}>
          <div className="grid grid-cols-3 gap-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            {([["Uploads", uploadCount], ["Protocols", protocolCount], ["Check-ins", checkinCount]] as [string, number | null][]).map(([label, count]) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{count ?? 0}</p>
                <p>{label}</p>
              </div>
            ))}
          </div>
          <p className="pt-2">
            Your data is stored securely and used only to generate your longevity protocol. We never sell your data to third parties.
          </p>
        </CardContent>
      </Card>

      <SettingsActions />
    </div>
  );
}
