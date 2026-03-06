/// app/r/[code]/page.tsx
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { ReferralLandingClient } from "./_client";

export default async function ReferralPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const supabase  = getAdminClient();

  // Look up the referral link
  const { data: link } = await supabase
    .from(TABLES.REFERRAL_LINKS)
    .select("user_id, clicks")
    .eq(COLS.CODE, code)
    .single();

  if (!link) redirect("/auth/signin");

  // Get referrer's display name
  const { data: referrer } = await supabase
    .from(TABLES.USERS)
    .select("name, email")
    .eq(COLS.ID, link.user_id)
    .single();

  // Increment click count (fire-and-forget)
  void supabase
    .from(TABLES.REFERRAL_LINKS)
    .update({ clicks: link.clicks + 1 })
    .eq(COLS.CODE, code);

  const referrerName =
    referrer?.name ??
    referrer?.email?.split("@")[0] ??
    "A Blue Zone member";

  return <ReferralLandingClient code={code} referrerName={referrerName} />;
}
