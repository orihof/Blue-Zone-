import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import OnboardAnalytics from "./OnboardAnalytics";

export default async function OnboardPage() {
  const session = await getServerSession(authOptions);

  // If already authenticated, skip onboarding intake
  if (session?.user) {
    redirect("/app/dashboard");
  }

  return (
    <main
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
      <div
        style={{
          fontSize: 22,
          color: "white",
          fontFamily: "var(--font-label)",
          fontWeight: 400,
        }}
      >
        Let&apos;s build your biological profile.
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--bz-muted)",
          fontFamily: "var(--font-label)",
        }}
      >
        Intake loading...
      </div>
      <OnboardAnalytics />
      {/*
        TODO: Replace with full onboarding flow component.
        This placeholder prevents a 404 on the primary CTA.
        The full onboarding funnel already exists at /app/onboarding/.
      */}
    </main>
  );
}
