/// components/marketing/ApplyCtaButton.tsx
"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { trackBottomCtaClick } from "@/lib/analytics";
import { FoundingCohortApplication } from "./FoundingCohortApplication";

export function ApplyCtaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="cta"
        onClick={() => {
          trackBottomCtaClick();
          setOpen(true);
        }}
      >
        Apply for Early Access{" "}
        <ArrowRight
          size={15}
          strokeWidth={1.5}
          style={{ display: "inline", verticalAlign: "middle", marginTop: -1 }}
        />
      </button>
      <FoundingCohortApplication open={open} onClose={() => setOpen(false)} />
    </>
  );
}
