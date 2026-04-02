"use client";
import { useCallback } from "react";

export type LandingEvent =
  | {
      event: "page_view";
      props: { referrer: string; utm_source?: string | null };
    }
  | {
      event: "primary_cta_clicked";
      props: { source: string; label: string; variant: string };
    }
  | {
      event: "waitlist_signup";
      props: { email_domain: string; source: string };
    }
  | {
      event: "holo_hotspot_clicked";
      props: { organ_id: string; organ_label: string; is_flagged: boolean };
    }
  | { event: "holo_protocol_cta"; props: { organ_id: string } }
  | {
      event: "bio_age_ring_viewed";
      props: { biological_age: number; years_younger: number };
    }
  | {
      event: "reckoning_card_clicked";
      props: { flagged_domains: string[] };
    }
  | { event: "bio_age_card_preview"; props: Record<string, never> }
  | {
      event: "holo_render_error";
      props: { error: string; stack?: string };
    }
  | { event: "coach_link_clicked"; props: Record<string, never> }
  | { event: "onboard_page_reached"; props: { source?: string } };

export function useAnalytics() {
  const track = useCallback(
    <T extends LandingEvent["event"]>(
      event: T,
      props: Extract<LandingEvent, { event: T }>["props"],
    ) => {
      if (typeof window === "undefined") return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ph = (window as any).posthog;
      if (!ph) {
        console.debug("[analytics] PostHog not loaded:", event, props);
        return;
      }
      ph.capture(event, props);
    },
    [],
  );

  return { track };
}
