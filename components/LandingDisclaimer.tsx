export default function LandingDisclaimer() {
  return (
    <p
      style={{
        fontSize: 11,
        color: "var(--bz-muted)",
        fontFamily: "var(--font-label)",
        textAlign: "center",
        padding: "12px 24px",
        borderTop: "1px solid var(--bz-border)",
        margin: 0,
      }}
    >
      Blue Zone provides performance and longevity insights for informational
      purposes only. It is not a medical device and does not provide medical
      advice, diagnosis, or treatment. Consult a qualified healthcare provider
      before making health decisions.
    </p>
  );
}
