export const PRIORITY_CONFIG = {
  high: {
    border: 'border-l-4 border-amber-400',
    badge: 'text-amber-400',
    label: 'High priority',
    description: 'Strongest signal from your biomarker profile',
  },
  medium: {
    border: 'border-l-4 border-blue-400',
    badge: 'text-blue-400',
    label: 'Medium priority',
    description: 'Supportive intervention for your goals',
  },
  low: {
    border: 'border-l-4 border-slate-600',
    badge: 'text-slate-400',
    label: 'Lower priority',
    description: 'Consider after adopting higher priority items',
  },
} as const

export type Priority = keyof typeof PRIORITY_CONFIG
