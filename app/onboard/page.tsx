import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import OnboardAnalytics from "./OnboardAnalytics";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Upload your blood panel and connect your wearable to get your Blue Zone protocol.",
};

export default async function OnboardPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/app/dashboard");
  }

  return (
    <section
      aria-labelledby="onboard-title"
      style={{
        minHeight: "100vh",
        background: "var(--bz-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--bz-cyan)",
          fontFamily: "var(--font-label)",
          letterSpacing: "0.14em",
        }}
      >
        BLUE ZONE
      </div>
      <h1
        id="onboard-title"
        style={{
          fontSize: 22,
          color: "white",
          fontFamily: "var(--font-label)",
          fontWeight: 400,
          margin: 0,
        }}
      >
        Get started with Blue Zone
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--bz-secondary)",
          fontFamily: "var(--font-label)",
          margin: 0,
        }}
      >
        Upload your blood panel and connect your wearable to receive your
        protocol.
      </p>
      <OnboardAnalytics />
    </section>
  );
}
