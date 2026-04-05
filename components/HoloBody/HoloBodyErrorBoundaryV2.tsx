import React, { Component } from "react";
import { analytics } from "@/lib/analytics";

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

export class HoloBodyErrorBoundaryV2 extends Component<Props, State> {
  private fallbackRef = React.createRef<HTMLDivElement>();
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("HoloBody render error:", error.message);
    analytics.holoRenderError(error.message, error.stack);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (!prevState.hasError && this.state.hasError) {
      setTimeout(() => {
        this.fallbackRef.current?.focus();
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          ref={this.fallbackRef}
          role="region"
          aria-label="Body visualization unavailable"
          tabIndex={-1}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            fontSize: 13,
            color: "var(--bz-secondary)",
            fontFamily: "var(--font-label)",
            border: "1px solid var(--bz-border-subtle)",
            borderRadius: 8,
          }}
        >
          <p>
            3D visualization unavailable. Domain details are accessible below.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
