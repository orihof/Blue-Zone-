/// app/app/biomarkers/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import Link from "next/link";

const STATUS_C: Record<string, string> = {
  normal:   "#10B981",
  optimal:  "#10B981",
  good:     "#3B82F6",
  low:      "#F59E0B",
  high:     "#F59E0B",
  warn:     "#F59E0B",
  critical: "#EF4444",
};

const STATUS_LABEL: Record<string, string> = {
  normal:   "Normal",
  optimal:  "Optimal",
  good:     "Good",
  low:      "Low",
  high:     "High",
  warn:     "Attention",
  critical: "Critical",
};

const STATUS_BG: Record<string, string> = {
  normal:   "rgba(16,185,129,.1)",
  optimal:  "rgba(16,185,129,.1)",
  good:     "rgba(59,130,246,.1)",
  low:      "rgba(245,158,11,.1)",
  high:     "rgba(245,158,11,.1)",
  warn:     "rgba(245,158,11,.1)",
  critical: "rgba(239,68,68,.1)",
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_C[status] ?? "#3B82F6";
  const bg = STATUS_BG[status] ?? "rgba(59,130,246,.1)";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 400,
      background: bg, color: c, border: `1px solid ${c}40`,
      fontFamily: "var(--font-ui,'Inter',sans-serif)",
    }}>
      {label}
    </span>
  );
}

interface BiomarkerRow {
  id: string;
  name: string;
  value: number;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
  status: string;
  created_at: string;
}

export default async function BiomarkersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const db = getAdminClient();
  const { data: rows } = await db
    .from(TABLES.BIOMARKERS)
    .select("id,name,value,unit,reference_min,reference_max,status,created_at")
    .eq(COLS.USER_ID, session.user.id)
    .order(COLS.CREATED_AT, { ascending: false });

  const items: BiomarkerRow[] = rows ?? [];

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="fu" style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 400, letterSpacing: ".1em",
          color: "#6366F1", fontFamily: "'Inter',sans-serif",
          textTransform: "uppercase", marginBottom: 8,
        }}>
          Biomarker Panel
        </div>
        <h2 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 400,
          fontSize: "clamp(22px,3vw,32px)", color: "#F1F5F9", letterSpacing: "-.02em",
        }}>
          Your Lab Results
        </h2>
      </div>

      {items.length === 0 ? (
        /* ── Empty state ── */
        <div className="card fu1" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔬</div>
          <h3 style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 400, fontSize: 20,
            color: "#F1F5F9", marginBottom: 8, letterSpacing: "-.02em",
          }}>
            No biomarker data yet
          </h3>
          <p style={{
            fontSize: 13, color: "#64748B", fontFamily: "'Inter',sans-serif",
            fontWeight: 300, marginBottom: 24, lineHeight: 1.65,
          }}>
            Upload a blood test PDF or connect a wearable to see your biomarker panel.
          </p>
          <Link href="/app/onboarding/upload">
            <button className="cta cta-sm">Upload Health Data →</button>
          </Link>
        </div>
      ) : (
        /* ── Biomarker list ── */
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((b, i) => {
            const c = STATUS_C[b.status] ?? "#3B82F6";
            const rangeStr = b.reference_min != null && b.reference_max != null
              ? `${b.reference_min}–${b.reference_max}`
              : b.reference_max != null
              ? `<${b.reference_max}`
              : b.reference_min != null
              ? `>${b.reference_min}`
              : "—";

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  animation: `fadeUp .4s cubic-bezier(.16,1,.3,1) ${i * 0.04}s both`,
                }}
              >
                {/* Status bar */}
                <div style={{
                  width: 3, height: 36, borderRadius: 3,
                  background: c, flexShrink: 0,
                  boxShadow: `0 0 8px ${c}55`,
                }} />

                {/* Name + range */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, color: "#F1F5F9",
                    fontFamily: "'Syne',sans-serif", fontWeight: 400, marginBottom: 2,
                  }}>
                    {b.name}
                  </div>
                  <div style={{
                    fontSize: 11, color: "#64748B",
                    fontFamily: "'Inter',sans-serif", fontWeight: 300,
                  }}>
                    Range: {rangeStr} {b.unit}
                  </div>
                </div>

                {/* Value */}
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 18,
                    fontWeight: 400, color: c, marginBottom: 3,
                  }}>
                    {b.value}
                  </div>
                  <div style={{
                    fontSize: 10, color: "#64748B",
                    fontFamily: "'JetBrains Mono',monospace", fontWeight: 300,
                  }}>
                    {b.unit}
                  </div>
                </div>

                <StatusBadge status={b.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
