"use client";
import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function OnboardAnalytics() {
  const { track } = useAnalytics();
  useEffect(() => {
    track("onboard_page_reached", {});
  }, [track]);
  return null;
}
