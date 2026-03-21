/// lib/analytics.ts
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

export function track(event: EventName, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    // Client-side
    console.debug(`[analytics] ${event}`, properties ?? "");
  } else {
    // Server-side
    console.log(`[analytics:server] ${event}`, properties ?? "");
  }
  // Replace with real analytics (PostHog, Mixpanel, Segment, etc.)
}

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
