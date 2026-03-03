import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ExternalLink } from "lucide-react";
import type { NearbyClinic } from "@/types";

interface ClinicCardProps {
  clinic: NearbyClinic;
}

export function ClinicCard({ clinic }: ClinicCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm text-gray-900 leading-snug truncate">
              {clinic.name}
            </p>
            {clinic.rating != null && (
              <span className="shrink-0 flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                <Star className="w-3 h-3 fill-current" />
                {clinic.rating.toFixed(1)}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-1">{clinic.address}</p>

          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200 mb-3"
          >
            {clinic.clinic_type}
          </Badge>

          <div className="block">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              asChild
            >
              <a
                href={clinic.maps_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
