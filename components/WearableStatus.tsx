/// components/WearableStatus.tsx
// Displays Galaxy Watch sync status as a small pill badge.
// Accepts pre-fetched props — the parent server component queries the DB.
//
// Usage in a server component:
//   const snap = await supabase.from(TABLES.WEARABLE_SNAPSHOTS)
//     .select("recorded_at, source")
//     .eq(COLS.USER_ID, userId)
//     .eq(COLS.SOURCE, "samsung_galaxy_watch")
//     .order("created_at", { ascending: false })
//     .limit(1).maybeSingle();
//   <WearableStatus isConnected={!!snap.data} lastSyncAt={snap.data?.recorded_at} />

interface WearableStatusProps {
  isConnected: boolean;
  lastSyncAt?: string | null; // ISO 8601
}

function formatAgo(iso: string): string {
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24)  return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function WearableStatus({ isConnected, lastSyncAt }: WearableStatusProps) {
  const STALE_MS = 48 * 60 * 60 * 1000;
  const isRecent = lastSyncAt
    ? Date.now() - new Date(lastSyncAt).getTime() < STALE_MS
    : false;

  // ── Green: connected + recent data ─────────────────────────────────────────
  if (isConnected && isRecent && lastSyncAt) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 999,
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.2)",
        fontSize: 12, color: "#10B981",
        fontFamily: "var(--font-ui,'Inter',sans-serif)",
        whiteSpace: "nowrap",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#10B981", boxShadow: "0 0 6px rgba(16,185,129,0.6)",
          flexShrink: 0,
        }} />
        Galaxy Watch synced · {formatAgo(lastSyncAt)}
      </span>
    );
  }

  // ── Amber: connected but stale data ───────────────────────────────────────
  if (isConnected) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 999,
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.2)",
        fontSize: 12, color: "#F59E0B",
        fontFamily: "var(--font-ui,'Inter',sans-serif)",
        whiteSpace: "nowrap",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#F59E0B", flexShrink: 0,
        }} />
        Galaxy Watch · No recent sync
      </span>
    );
  }

  // ── Grey: not connected ────────────────────────────────────────────────────
  return (
    <a
      href="/connect/wearables"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 999,
        background: "rgba(100,116,139,0.08)",
        border: "1px solid rgba(100,116,139,0.2)",
        fontSize: 12, color: "#64748B",
        fontFamily: "var(--font-ui,'Inter',sans-serif)",
        textDecoration: "none", whiteSpace: "nowrap",
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: "#475569", flexShrink: 0,
      }} />
      Connect wearable
    </a>
  );
}
