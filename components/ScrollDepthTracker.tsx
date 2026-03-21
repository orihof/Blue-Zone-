/// components/ScrollDepthTracker.tsx
"use client";

import { useEffect, useRef } from "react";
import { trackScrollDepth } from "@/lib/analytics";

export function ScrollDepthTracker() {
  const fired = useRef({ 50: false, 100: false });

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const pct = (scrollTop / docHeight) * 100;

      if (!fired.current[50] && pct >= 50) {
        fired.current[50] = true;
        trackScrollDepth(50);
      }
      if (!fired.current[100] && pct >= 98) {
        fired.current[100] = true;
        trackScrollDepth(100);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return null;
}
