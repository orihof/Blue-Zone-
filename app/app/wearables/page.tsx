/// app/app/wearables/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { WearablesClient } from "./_client";

export default async function WearablesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const { data } = await getAdminClient()
    .from(TABLES.WEARABLE_CONNECTIONS)
    .select(`${COLS.PROVIDER}, ${COLS.CONNECTED_AT}`)
    .eq(COLS.USER_ID, session.user.id);

  const connected = (data ?? []).map((r) => ({
    provider:    r.provider as string,
    connectedAt: r.connected_at as string,
  }));

  return (
    <div className="px-4 lg:px-8" style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      <WearablesClient connected={connected} />
    </div>
  );
}
