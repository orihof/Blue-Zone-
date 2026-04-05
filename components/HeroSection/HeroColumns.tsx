"use client";
import dynamic from "next/dynamic";
import { LeftColumnSkeleton } from "./LeftColumnSkeleton";

export const LeftColumnClient = dynamic(
  () => import("./LeftColumnClient"),
  {
    ssr: false,
    loading: () => <LeftColumnSkeleton />,
  },
);

export const RightColumnClient = dynamic(
  () => import("./RightColumnClient"),
  {
    ssr: false,
    loading: () => (
      <div
        className="skeleton-shimmer"
        aria-hidden="true"
        style={{ width: "100%", height: "100%", borderRadius: 8 }}
      />
    ),
  },
);
