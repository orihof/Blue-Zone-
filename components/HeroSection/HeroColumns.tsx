"use client";
import dynamic from "next/dynamic";
import LeftColumnSkeleton from "./LeftColumnSkeleton";

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
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--bz-muted)",
            fontFamily: "var(--font-label)",
            letterSpacing: "0.1em",
            animation: "blink 1.4s ease-in-out infinite",
          }}
        >
          ANATOMY ANALYSIS LOADING...
        </span>
      </div>
    ),
  },
);
