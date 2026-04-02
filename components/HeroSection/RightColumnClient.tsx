"use client";
import HoloBody from "@/components/HoloBody";
import HoloBodyErrorBoundary from "@/components/HoloBodyErrorBoundary";

export default function RightColumnClient() {
  return (
    <HoloBodyErrorBoundary>
      <HoloBody
        flaggedOrgans={["knee_l", "brain", "shldr_r"]}
        onCtaClick={(id) => {
          window.location.href = `/dashboard?focus=${id}`;
        }}
      />
    </HoloBodyErrorBoundary>
  );
}
