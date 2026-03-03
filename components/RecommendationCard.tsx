import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingBag, Package } from "lucide-react";
import type { Recommendation } from "@/types";

const SOURCE_CONFIG = {
  iherb: {
    label: "iHerb",
    icon: Package,
    badgeClass: "bg-green-100 text-green-700 border-green-200",
  },
  amazon: {
    label: "Amazon",
    icon: ShoppingBag,
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  google_places: {
    label: "Clinic",
    icon: ExternalLink,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const config = SOURCE_CONFIG[recommendation.source];
  const Icon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm text-gray-900 leading-snug">
              {recommendation.title}
            </p>
            <Badge
              variant="outline"
              className={`shrink-0 text-xs ${config.badgeClass}`}
            >
              {config.label}
            </Badge>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            {recommendation.reason}
          </p>

          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded px-2 py-1 mb-2">
            Not medical advice — discuss with your doctor before starting supplements.
          </p>

          {recommendation.url && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              asChild
            >
              <a
                href={recommendation.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                View on {config.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
