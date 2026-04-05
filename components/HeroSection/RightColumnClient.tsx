"use client";
import dynamic from "next/dynamic";
import { HoloBodyErrorBoundaryV2 } from "@/components/HoloBody/HoloBodyErrorBoundaryV2";
import { MobileSilhouette } from "@/components/HoloBody/MobileSilhouette";

const HoloBodyClient = dynamic(
  () =>
    import("@/components/HoloBody/HoloBody").then((m) => ({
      default: m.HoloBody,
    })),
  { ssr: false },
);

export default function RightColumnClient() {
  return (
    <div
      id="holo-canvas-mount"
      style={{ position: "relative", minHeight: 500 }}
    >
      {/* Mobile silhouette — visible on mobile only */}
      <div className="mobile-only">
        <MobileSilhouette flaggedOrgans={["knee_l", "brain", "shldr_r"]} />
      </div>

      {/* Three.js HoloBody — visible on desktop only */}
      <div className="desktop-only">
        <HoloBodyErrorBoundaryV2>
          <HoloBodyClient
            flaggedOrgans={["knee_l", "brain", "shldr_r"]}
            onCtaClick={(id) => {
              window.location.href = `/dashboard?focus=${id}`;
            }}
          />
        </HoloBodyErrorBoundaryV2>
      </div>
    </div>
  );
}
