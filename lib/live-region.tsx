"use client";
import { createContext, useCallback, useContext, useState } from "react";

interface LiveRegionContextValue {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue>({
  announce: () => {},
});

export function LiveRegionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (priority === "assertive") {
        setAssertive("");
        requestAnimationFrame(() => setAssertive(message));
      } else {
        setPolite("");
        requestAnimationFrame(() => setPolite(message));
      }
    },
    [],
  );

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="sr-only"
      >
        {polite}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className="sr-only"
      >
        {assertive}
      </div>
    </LiveRegionContext.Provider>
  );
}

export const useLiveRegion = () => useContext(LiveRegionContext);
