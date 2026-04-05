"use client";
import { useEffect, useRef } from "react";
import { analytics } from "@/lib/analytics";

export function ScrollDepthTracker() {
  const firedRef = useRef({ half: false, full: false });

  useEffect(() => {
    const body = document.body;
    const originalPosition = body.style.position || "";

    // Set body to position:relative so sentinel top:% resolves against
    // body content height (full page), not the initial containing block (viewport).
    body.style.position = "relative";

    const createSentinel = (topPercent: number) => {
      const el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = `position:absolute;top:${topPercent}%;left:0;width:1px;height:1px;pointer-events:none;`;
      body.appendChild(el);
      return el;
    };

    const halfSentinel = createSentinel(50);
    const fullSentinel = createSentinel(99);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === halfSentinel && !firedRef.current.half) {
            firedRef.current.half = true;
            analytics.scrollDepth(50);
          }
          if (entry.target === fullSentinel && !firedRef.current.full) {
            firedRef.current.full = true;
            analytics.scrollDepth(100);
          }
        });
      },
      { threshold: 0 },
    );

    observer.observe(halfSentinel);
    observer.observe(fullSentinel);

    return () => {
      observer.disconnect();
      if (body.contains(halfSentinel)) body.removeChild(halfSentinel);
      if (body.contains(fullSentinel)) body.removeChild(fullSentinel);
      body.style.position = originalPosition;
    };
  }, []);

  return null;
}
