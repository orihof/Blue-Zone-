/// components/results/StackBuilder.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { RecItem } from "@/lib/db/payload";

interface StackBuilderProps {
  supplements: RecItem[];
}

export function StackBuilder({ supplements }: StackBuilderProps) {
  const [have, setHave] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  function toggle(id: string) {
    setHave((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function copyToClipboard() {
    const lines = supplements
      .filter((s) => !have.has(s.id))
      .map((s) => `• ${s.title} — ${s.howToUse}`)
      .join("\n");
    const text = `Blue Zone Supplement Stack\n${"─".repeat(32)}\n${lines}\n\n⚠ Educational only — discuss with your clinician.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Stack copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const needCount = supplements.filter((s) => !have.has(s.id)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-800">Stack Builder</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs h-8"
          onClick={copyToClipboard}
          disabled={needCount === 0}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copy shopping list ({needCount})
        </Button>
      </div>

      <div className="space-y-1.5">
        {supplements.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
              have.has(s.id)
                ? "border-emerald-200 bg-emerald-50 opacity-60"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  have.has(s.id) ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                }`}
              >
                {have.has(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-sm text-slate-800 truncate">{s.title}</span>
            </div>
            {have.has(s.id) ? (
              <Badge variant="secondary" className="text-[10px] flex-shrink-0">Have it</Badge>
            ) : (
              <div className="flex gap-1 flex-shrink-0">
                {s.links.iherb && (
                  <a
                    href={s.links.iherb}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-blue-600 underline"
                  >
                    iHerb
                  </a>
                )}
                {s.links.amazon && (
                  <a
                    href={s.links.amazon}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-orange-600 underline ml-1"
                  >
                    Amazon
                  </a>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Mark items you already own to build your shopping list
      </p>
    </div>
  );
}
