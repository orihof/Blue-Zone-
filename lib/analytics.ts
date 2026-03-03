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
  | "upgrade_cta_clicked";

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
