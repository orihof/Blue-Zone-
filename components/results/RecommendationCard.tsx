/// components/results/RecommendationCard.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookmarkButton } from "./BookmarkButton";
import { ExternalLink, ShieldAlert, CheckCircle2, AlertTriangle, Globe, Calendar } from "lucide-react";
import type { RecItem, ClinicItem } from "@/lib/db/payload";

const SAFE_AVOID_PHRASES = new Set([
  "None established — low risk profile",
  "None established at typical doses",
  "No contraindications at dietary doses",
  "No known contraindications at dietary doses",
  "No contraindications",
  "Avocado allergy",
]);

export function RecommendationCard({ item, protocolId }: { item: RecItem; protocolId: string }) {
  const hasIherb = !!item.links.iherb;
  const hasAmazon = !!item.links.amazon;
  const avoidNote = item.whenToAvoid.find((w) => !SAFE_AVOID_PHRASES.has(w));

  return (
    <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
      <CardContent className="pt-5 pb-4 px-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{item.title}</h3>
          <BookmarkButton itemId={item.id} itemType={item.category} protocolId={protocolId} />
        </div>

        <ul className="space-y-1">
          {item.rationaleBullets.map((bullet, i) => (
            <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
              {bullet}
            </li>
          ))}
        </ul>

        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">How to use: </span>{item.howToUse}
          </p>
        </div>

        {avoidNote && (
          <div className="flex gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">{avoidNote}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] px-2 py-0.5">{t}</Badge>
          ))}
        </div>

        {(hasIherb || hasAmazon) && (
          <div className="flex gap-2 pt-1">
            {hasIherb && (
              <a href={item.links.iherb!} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8">
                  <ExternalLink className="w-3 h-3" /> iHerb
                </Button>
              </a>
            )}
            {hasAmazon && (
              <a href={item.links.amazon!} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8">
                  <ExternalLink className="w-3 h-3" /> Amazon
                </Button>
              </a>
            )}
          </div>
        )}

        <div className="flex gap-1.5 pt-0.5">
          <ShieldAlert className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Educational only. Discuss with your clinician before use.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClinicCard({ item, protocolId }: { item: ClinicItem; protocolId: string }) {
  const linkUrl = item.bookingUrl ?? item.website;
  const linkLabel = item.bookingUrl ? "Book" : "Website";

  return (
    <Card className="border border-slate-200 hover:border-slate-300 transition-colors">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-snug">{item.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{item.specialty.join(" · ")}</p>
            <p className="text-xs text-slate-400 mt-0.5">{item.city}</p>
          </div>
          <BookmarkButton itemId={item.id} itemType="clinic" protocolId={protocolId} />
        </div>

        {item.whyRelevant.length > 0 && (
          <ul className="space-y-0.5 mb-3">
            {item.whyRelevant.map((reason, i) => (
              <li key={i} className="flex gap-1.5 text-[10px] text-slate-500 leading-relaxed">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                {reason}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between">
          {item.placeId ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}&query_place_id=${item.placeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"
            >
              <Globe className="w-3 h-3" /> Maps
            </a>
          ) : <span />}
          {linkUrl && (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                {item.bookingUrl ? <Calendar className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                {linkLabel}
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
