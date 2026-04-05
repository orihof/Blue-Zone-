// aria-hidden="true" only — do NOT add aria-busy="true".
// aria-hidden removes the element from the accessibility tree entirely,
// making aria-busy unreachable and meaningless on the same element.
// The LiveRegion announcement in LeftColumnClient handles the "loaded" signal.

export function LeftColumnSkeleton() {
  return (
    <div aria-hidden="true" style={{ width: "100%" }}>
      <div
        className="skeleton-shimmer"
        style={{
          width: "60%",
          height: 16,
          borderRadius: 4,
          marginBottom: 16,
        }}
      />
      <div
        className="skeleton-shimmer"
        style={{
          width: "95%",
          height: 58,
          borderRadius: 4,
          marginBottom: 8,
        }}
      />
      <div
        className="skeleton-shimmer"
        style={{
          width: "80%",
          height: 58,
          borderRadius: 4,
          marginBottom: 8,
        }}
      />
      <div
        className="skeleton-shimmer"
        style={{
          width: "60%",
          height: 58,
          borderRadius: 4,
          marginBottom: 24,
        }}
      />
      <div
        className="skeleton-shimmer"
        style={{
          width: "100%",
          height: 20,
          borderRadius: 4,
          marginBottom: 8,
        }}
      />
      <div
        className="skeleton-shimmer"
        style={{
          width: "85%",
          height: 20,
          borderRadius: 4,
          marginBottom: 32,
        }}
      />
      <div
        className="skeleton-shimmer"
        style={{
          width: 240,
          height: 240,
          borderRadius: "50%",
          marginBottom: 32,
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <div
          className="skeleton-shimmer"
          style={{ flex: 1, height: 44, borderRadius: 6 }}
        />
        <div
          className="skeleton-shimmer"
          style={{ width: 120, height: 44, borderRadius: 6 }}
        />
      </div>
    </div>
  );
}
