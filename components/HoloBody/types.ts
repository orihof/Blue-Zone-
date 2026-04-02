export interface Metric {
  name: string;
  value: string;
  trend: "up" | "down" | "stable";
  good: boolean;
}

export interface Hotspot {
  id: string;
  pos: [number, number, number];
  label: string;
  category: "organ" | "joint";
  metrics: Metric[];
}

export interface HoloBodyProps {
  flaggedOrgans?: string[];
  onCtaClick?: (organId: string) => void;
  className?: string;
}
