import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Biomarker } from "@/types";

const STATUS_CONFIG = {
  normal: {
    label: "Normal",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    barClass: "bg-sky-500",
  },
  low: {
    label: "Low",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    barClass: "bg-amber-500",
  },
  high: {
    label: "High",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    barClass: "bg-orange-500",
  },
  critical: {
    label: "Critical",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    barClass: "bg-red-500",
  },
};

interface BiomarkerCardProps {
  biomarker: Biomarker;
}

export function BiomarkerCard({ biomarker }: BiomarkerCardProps) {
  const config = STATUS_CONFIG[biomarker.status];

  // Calculate fill position for the reference bar
  let fillPercent = 50; // default to middle
  if (biomarker.reference_min != null && biomarker.reference_max != null) {
    const range = biomarker.reference_max - biomarker.reference_min;
    const relativeValue = biomarker.value - biomarker.reference_min;
    fillPercent = Math.min(100, Math.max(0, (relativeValue / range) * 100));
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-medium text-sm text-gray-900">{biomarker.name}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {biomarker.value}
              <span className="text-sm font-normal text-gray-500 ml-1">
                {biomarker.unit}
              </span>
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-medium ${config.badgeClass}`}
          >
            {config.label}
          </Badge>
        </div>

        {biomarker.reference_min != null && biomarker.reference_max != null && (
          <div className="space-y-1">
            <div className="relative h-1.5 rounded-full bg-gray-100">
              <div
                className={`absolute h-full rounded-full ${config.barClass} transition-all`}
                style={{ width: `${fillPercent}%` }}
              />
              {/* Reference range indicator */}
              <div className="absolute inset-y-0 left-[10%] right-[10%] border-l-2 border-r-2 border-dashed border-gray-400 rounded opacity-40" />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{biomarker.reference_min}</span>
              <span>Reference range</span>
              <span>{biomarker.reference_max}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
