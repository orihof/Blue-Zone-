/// lib/analytics.ts
import posthog from "posthog-js";

type EventName =
  | "protocol_requested"
  | "protocol_ready"
  | "upload_complete"
  | "affiliate_click"
  | "clinic_click"
  | "bookmark_toggle"
  | "checkin_submitted"
  | "share_link_created"
  | "pdf_exported"
  | "upgrade_cta_shown"
  | "upgrade_cta_clicked"
  | "primary_cta_click"
  | "secondary_cta_click"
  | "bottom_cta_click"
  | "how_it_works_cta_click"
  | "scroll_depth";

const capture = (event: string, properties?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
};

export function track(event: EventName, properties?: Record<string, unknown>) {
  capture(event, properties);
}

// ── Typed analytics API (Prompt 7) ──────────────────────────────────────────
export const analytics = {
  primaryCtaClicked: (variant?: string) =>
    capture("primary_cta_clicked", { source: "hero_left_column", variant }),
  waitlistSignup: (emailDomain: string) =>
    capture("waitlist_signup", { email_domain: emailDomain }),
  holoHotspotClicked: (organId: string) =>
    capture("holo_hotspot_clicked", { organ_id: organId }),
  holoPanelCtaClicked: (organId: string) =>
    capture("holo_protocol_cta", { organ_id: organId }),
  bioAgeRingViewed: (biologicalAge: number) =>
    capture("bio_age_ring_viewed", { biological_age: biologicalAge }),
  reckoningCardClicked: (flaggedDomains: string[]) =>
    capture("reckoning_card_clicked", { flagged_domains: flaggedDomains }),
  bioAgeCardPreviewClicked: () => capture("bio_age_card_preview"),
  onboardPageReached: () => capture("onboard_page_reached"),
  holoRenderError: (errorMessage: string, stack?: string) =>
    capture("holo_render_error", {
      error: errorMessage,
      stack: stack?.slice(0, 200),
    }),
  scrollDepth: (percent: 50 | 100) => capture("scroll_depth", { percent }),
};

export function trackPrimaryCtaClick() {
  try { track("primary_cta_click", { location: "hero", text: "Get My Personal Protocol" }); } catch {}
}

export function trackSecondaryCtaClick() {
  try { track("secondary_cta_click", { location: "hero", text: "See how it works" }); } catch {}
}

export function trackBottomCtaClick() {
  try { track("bottom_cta_click", { location: "bottom_cta", text: "Find out why your training stalled" }); } catch {}
}

export function trackHowItWorksCtaClick() {
  try { track("how_it_works_cta_click", { location: "how_it_works_page", text: "Find out why your training stalled" }); } catch {}
}

export function trackScrollDepth(depth: 50 | 100) {
  try { track("scroll_depth", { page: "landing", depth_percent: depth }); } catch {}
}
