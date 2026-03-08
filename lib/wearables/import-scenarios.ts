/// lib/wearables/import-scenarios.ts

export type ImportScenario =
  | "onboarding_baseline"    // First upload ever — during initial setup
  | "quarterly_refresh"      // 90-day reminder cycle
  | "user_triggered_event";  // User initiated from dashboard

export function getImportScenario(
  isFirstUpload:  boolean,
  daysSinceLast:  number | null,
  userInitiated:  boolean,
): ImportScenario {
  if (isFirstUpload)                                    return "onboarding_baseline";
  if (daysSinceLast !== null && daysSinceLast >= 85)    return "quarterly_refresh";
  if (userInitiated)                                    return "user_triggered_event";
  return "user_triggered_event";
}

export const EVENT_TRIGGERS = [
  { id: "new_training",  icon: "🏋️", label: "New training program"      },
  { id: "illness",       icon: "🤒", label: "Recovering from illness"    },
  { id: "new_supps",     icon: "💊", label: "New supplement stack"       },
  { id: "competition",   icon: "🏁", label: "New competition prep cycle" },
  { id: "injury",        icon: "🩹", label: "Recovering from injury"     },
  { id: "general",       icon: "📊", label: "General data refresh"       },
] as const;
