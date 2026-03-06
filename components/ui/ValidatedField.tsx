/// components/ui/ValidatedField.tsx
// Wrapper that applies the red glow validation state to any field type.
// Usage: wrap any input, date picker, chip group, or custom control.

interface ValidatedFieldProps {
  hasError:      boolean;
  errorMessage?: string;
  label?:        string;
  required?:     boolean;
  children:      React.ReactNode;
  className?:    string;
}

export function ValidatedField({
  hasError,
  errorMessage = "This field is required",
  label,
  required,
  children,
  className,
}: ValidatedFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }} className={className}>
      {label && (
        <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#64748B", fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
          {label}
          {required && <span style={{ color: "#F87171", marginLeft: 4 }}>*</span>}
        </label>
      )}

      {/* Wrapper applies .field-error glow class */}
      <div className={hasError ? "field-error" : undefined} style={{ borderRadius: 10, transition: "box-shadow .2s, border-color .2s" }}>
        {children}
      </div>

      {/* Inline error message */}
      {hasError && (
        <p role="alert" style={{ fontSize: 11, color: "#F87171", fontFamily: "var(--font-ui,'Inter',sans-serif)", margin: 0, animation: "fadeUp .2s ease both" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
