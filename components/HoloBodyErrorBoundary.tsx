"use client";
import { Component, type ReactNode } from "react";

export default class HoloBodyErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).posthog) {
      (
        (window as unknown as Record<string, unknown>).posthog as {
          capture: (event: string, props: Record<string, unknown>) => void;
        }
      ).capture("holo_render_error", {
        error: error.message,
        stack: error.stack?.slice(0, 200),
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              fontSize: 11,
              color: "var(--bz-muted)",
              fontFamily: "var(--font-label)",
            }}
          >
            ANATOMY VIEWER UNAVAILABLE
          </div>
        )
      );
    }
    return this.props.children;
  }
}
