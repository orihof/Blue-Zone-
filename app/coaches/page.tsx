export default function CoachesPage() {
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
        fontFamily: "var(--font-label)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--bz-cyan)",
          letterSpacing: "0.14em",
        }}
      >
        BLUE ZONE &mdash; FOR COACHES
      </div>
      <div style={{ fontSize: 22, color: "white", fontWeight: 400 }}>
        Coach affiliate program coming May 4th.
      </div>
      <div style={{ fontSize: 12, color: "var(--bz-muted)" }}>
        Refer athletes. Earn recurring revenue. Launch with us.
      </div>
      {/* TODO: Replace with coach signup flow post-launch */}
    </main>
  );
}
