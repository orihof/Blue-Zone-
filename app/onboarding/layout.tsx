/// app/onboarding/layout.tsx
// Minimal no-nav layout for post-auth onboarding screens

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bz-midnight, #020817)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      {children}
    </div>
  );
}
