/// components/protocols/ProtocolDiff.tsx
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import type { ProtocolPayload } from "@/lib/db/payload";

interface ProtocolRow {
  id: string;
  created_at: string;
  mode: "demo" | "personal";
  selected_age: number;
  goals: string[];
  budget: string;
  payload: ProtocolPayload;
}

interface ProtocolDiffProps {
  a: ProtocolRow;
  b: ProtocolRow;
}

function scoreDelta(a: number, b: number) {
  const delta = b - a;
  if (delta === 0) return <span className="text-slate-400">—</span>;
  return delta > 0 ? (
    <span className="text-emerald-600 flex items-center gap-0.5">
      <TrendingUp className="w-3 h-3" />+{delta}
    </span>
  ) : (
    <span className="text-red-500 flex items-center gap-0.5">
      <TrendingDown className="w-3 h-3" />{delta}
    </span>
  );
}

function diffItems(aIds: string[], bIds: string[], aItems: { id: string; title: string }[], bItems: { id: string; title: string }[]) {
  const added = bIds.filter((id) => !aIds.includes(id)).map((id) => bItems.find((x) => x.id === id)?.title ?? id);
  const removed = aIds.filter((id) => !bIds.includes(id)).map((id) => aItems.find((x) => x.id === id)?.title ?? id);
  return { added, removed };
}

export function ProtocolDiff({ a, b }: ProtocolDiffProps) {
  const aSupps = a.payload.recommendations.supplements;
  const bSupps = b.payload.recommendations.supplements;
  const { added: suppAdded, removed: suppRemoved } = diffItems(
    aSupps.map((s) => s.id),
    bSupps.map((s) => s.id),
    aSupps,
    bSupps
  );

  const SCORE_LABELS = [
    { key: "recovery" as const, label: "Recovery" },
    { key: "sleep" as const, label: "Sleep" },
    { key: "metabolic" as const, label: "Metabolic" },
    { key: "readiness" as const, label: "Readiness" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
          <Badge variant="secondary" className="text-[10px]">Older</Badge>
          <p className="font-medium text-slate-800">{new Date(a.created_at).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">Age {a.selected_age} · {a.budget} · {a.mode}</p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
          <Badge className="text-[10px]">Newer</Badge>
          <p className="font-medium text-slate-800">{new Date(b.created_at).toLocaleDateString()}</p>
          <p className="text-xs text-muted-foreground">Age {b.selected_age} · {b.budget} · {b.mode}</p>
        </div>
      </div>

      {/* Score deltas */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score changes</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCORE_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-lg border border-slate-200 p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="text-sm font-semibold">
                {a.payload.scores[key]} → {b.payload.scores[key]}
              </div>
              <div className="text-xs mt-0.5">{scoreDelta(a.payload.scores[key], b.payload.scores[key])}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Supplement changes */}
      {(suppAdded.length > 0 || suppRemoved.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supplement changes</h4>
          <div className="space-y-1">
            {suppAdded.map((title) => (
              <div key={title} className="flex items-center gap-2 text-xs text-emerald-700">
                <Plus className="w-3 h-3 flex-shrink-0" /> {title}
              </div>
            ))}
            {suppRemoved.map((title) => (
              <div key={title} className="flex items-center gap-2 text-xs text-red-600">
                <Minus className="w-3 h-3 flex-shrink-0" /> {title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
