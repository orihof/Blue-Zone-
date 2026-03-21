/// hooks/useConsentOnboarding.ts
import { useState, useCallback } from "react";

// ── Exported types ────────────────────────────────────────────────────────────

export interface ConsentSelections {
  tier2_research:       boolean;
  tier2_research_types: string[];
  tier3_commercial:     boolean;
}

export interface UseConsentOnboardingReturn {
  selections:    ConsentSelections;
  isSubmitting:  boolean;
  error:         string | null;
  toggleTier2:   () => void;
  toggleTier3:   () => void;
  submitConsent: () => Promise<{ success: boolean }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TIER2_TYPES = [
  "biomarker_trends",
  "protocol_outcomes",
  "wearable_correlations",
] as const;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConsentOnboarding(): UseConsentOnboardingReturn {
  const [selections, setSelections] = useState<ConsentSelections>({
    tier2_research:       false,
    tier2_research_types: [],
    tier3_commercial:     false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Flip tier-2 research consent. Enabling auto-populates the default research types. */
  const toggleTier2 = useCallback(() => {
    setSelections((prev) => ({
      ...prev,
      tier2_research:       !prev.tier2_research,
      tier2_research_types: !prev.tier2_research ? [...DEFAULT_TIER2_TYPES] : [],
    }));
  }, []);

  /** Flip tier-3 commercial consent. */
  const toggleTier3 = useCallback(() => {
    setSelections((prev) => ({ ...prev, tier3_commercial: !prev.tier3_commercial }));
  }, []);

  const submitConsent = useCallback(async (): Promise<{ success: boolean }> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Record consent choices
      const consentRes = await fetch("/api/consent/record", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...selections, method: "onboarding_modal" }),
      });

      if (!consentRes.ok) {
        const body = await consentRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to record consent");
      }

      // 2. Award credits for research consent (only when tier-2 is enabled)
      if (selections.tier2_research) {
        const creditsRes = await fetch("/api/credits/award", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ amount: 500, reason: "research_consent" }),
        });

        if (!creditsRes.ok) {
          const body = await creditsRes.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? "Failed to award credits");
        }
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("[useConsentOnboarding]", err);
      setError("Something went wrong saving your preferences. Please try again.");
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  }, [selections]);

  return { selections, isSubmitting, error, toggleTier2, toggleTier3, submitConsent };
}
