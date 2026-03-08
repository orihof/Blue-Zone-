/// app/app/wearables/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { redirect }         from "next/navigation";
import { getAdminClient }   from "@/lib/supabase/admin";
import { TABLES, COLS }     from "@/lib/db/schema";
import { WearablesClient }  from "./_client";

export default async function WearablesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getAdminClient();
  const userId   = session.user.id as string;

  const [connRes, profileRes] = await Promise.all([
    supabase
      .from(TABLES.WEARABLE_CONNECTIONS)
      .select(`${COLS.PROVIDER}, ${COLS.CONNECTED_AT}`)
      .eq(COLS.USER_ID, userId),
    supabase
      .from(TABLES.PROFILES)
      .select(`${COLS.BASELINE_ESTABLISHED_AT}, ${COLS.LAST_WEARABLE_UPLOAD_AT}`)
      .eq(COLS.ID, userId)
      .maybeSingle(),
  ]);

  const connected = (connRes.data ?? []).map((r) => ({
    provider:    r.provider     as string,
    connectedAt: r.connected_at as string,
  }));

  const profile       = profileRes.data as Record<string, string | null> | null;
  const lastUploadAt  = profile?.last_wearable_upload_at  ?? null;
  const isFirstUpload = !profile?.baseline_established_at;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 120px" }}>
      <WearablesClient
        connected={connected}
        isFirstUpload={isFirstUpload}
        lastUploadAt={lastUploadAt}
      />
    </div>
  );
}
