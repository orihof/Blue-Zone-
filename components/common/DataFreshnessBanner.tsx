/// components/common/DataFreshnessBanner.tsx
import { AlertTriangle } from "lucide-react";

interface DataFreshnessBannerProps {
  sources: { name: string; lastUpdatedAt: string }[];
}

function monthsAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30));
}

export function DataFreshnessBanner({ sources }: DataFreshnessBannerProps) {
  const stale = sources.filter((s) => monthsAgo(s.lastUpdatedAt) >= 12);
  if (stale.length === 0) return null;

  const names = stale.map((s) => `${s.name} (${monthsAgo(s.lastUpdatedAt)}mo old)`).join(", ");

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 leading-relaxed">
        <span className="font-semibold">Stale data detected:</span> {names}.
        {" "}This protocol is based on data older than 12 months.
        Upload recent results for higher accuracy.
      </p>
    </div>
  );
}
