/// lib/pdf-templates.ts
import { jsPDF } from "jspdf";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import type { CompetitionResult, TimingSlot } from "@/lib/nutrient-competition";
import type { CriticalValueEvent } from "@/lib/types/health";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type PDFContent = jsPDF;

export interface BiomarkerRow {
  name:   string;
  value:  number | string;
  unit:   string;
  status: string;
}

export interface ProtocolRecommendation {
  product:         string;
  dose:            string;
  timing:          string;
  reason:          string;
  evidence_grade?: string;
}

export interface ProtocolPDFData {
  userName:            string;
  generatedDate:       string;
  biologicalAge?:      number;
  chronologicalAge?:   number;
  biomarkers?:         BiomarkerRow[];
  recommendations?:    ProtocolRecommendation[];
  timingSchedule?:     TimingSlot[];
  competitionResults?: CompetitionResult[];
  criticalEvents?:     CriticalValueEvent[];
  exportType?:         "doctor_visit" | "specialist" | "full_clinical" | "summary";
  pregnancy_disclaimer?: string;
}

// ----------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------

const C = {
  primary:   [59,  130, 246] as [number, number, number],
  success:   [34,  197, 94 ] as [number, number, number],
  warning:   [234, 179, 8  ] as [number, number, number],
  danger:    [239, 68,  68 ] as [number, number, number],
  dark:      [17,  24,  39 ] as [number, number, number],
  muted:     [107, 114, 128] as [number, number, number],
  border:    [229, 231, 235] as [number, number, number],
  sectionBg: [239, 246, 255] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
};

function statusColor(status: string): [number, number, number] {
  switch (status.toLowerCase()) {
    case "critical": return C.danger;
    case "high":
    case "low":      return C.warning;
    case "normal":   return C.success;
    default:         return C.muted;
  }
}

function hRule(doc: jsPDF, y: number, ml: number, pw: number): void {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(ml, y, pw - ml, y);
}

function pageBreak(doc: jsPDF, y: number, need: number, ml: number, ph: number): number {
  if (y + need > ph - ml) {
    doc.addPage();
    return ml + 8;
  }
  return y;
}

function sectionBanner(doc: jsPDF, title: string, y: number, ml: number, pw: number): number {
  doc.setFillColor(...C.sectionBg);
  doc.roundedRect(ml, y, pw - ml * 2, 8, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.primary);
  doc.text(title.toUpperCase(), ml + 3, y + 5.5);
  return y + 12;
}

// ----------------------------------------------------------------
// 1. buildProtocolPDFContent
// ----------------------------------------------------------------

export function buildProtocolPDFContent(data: ProtocolPDFData): PDFContent {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw  = doc.internal.pageSize.getWidth();
  const ph  = doc.internal.pageSize.getHeight();
  const ml  = 15;
  let y     = ml;

  // ── Header ────────────────────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.primary);
  doc.text("Blue Zone", ml, y + 8);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.muted);
  doc.text("Personalised Health Protocol", ml, y + 14);

  doc.setFontSize(8.5);
  doc.setTextColor(...C.dark);
  doc.text(`For: ${data.userName}`, pw - ml, y + 8, { align: "right" });
  doc.text(`Generated: ${data.generatedDate}`, pw - ml, y + 14, { align: "right" });

  y += 20;
  hRule(doc, y, ml, pw);
  y += 7;

  // ── Biological Age Score ──────────────────────────────────────────────
  if (data.biologicalAge != null) {
    y = pageBreak(doc, y, 30, ml, ph);

    const bw = 70;
    const bx = pw / 2 - bw / 2;
    doc.setFillColor(...C.primary);
    doc.roundedRect(bx, y, bw, 24, 3, 3, "F");

    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("BIOLOGICAL AGE", pw / 2, y + 7, { align: "center" });

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(String(data.biologicalAge), pw / 2, y + 17, { align: "center" });

    if (data.chronologicalAge != null) {
      const delta = data.chronologicalAge - data.biologicalAge;
      const label = delta >= 0
        ? `${delta} yrs younger than chronological age (${data.chronologicalAge})`
        : `${Math.abs(delta)} yrs older than chronological age (${data.chronologicalAge})`;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(label, pw / 2, y + 22, { align: "center" });
    }

    y += 30;
  }

  // ── Biomarker Summary ─────────────────────────────────────────────────
  if (data.biomarkers?.length) {
    y = pageBreak(doc, y, 24, ml, ph);
    y = sectionBanner(doc, "Biomarker Summary", y, ml, pw);

    const colW = (pw - ml * 2) / 4;

    // Table headers
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.dark);
    ["Biomarker", "Value", "Unit", "Status"].forEach((h, i) => {
      doc.text(h, ml + i * colW + 2, y);
    });
    y += 2;
    hRule(doc, y, ml, pw);
    y += 4;

    doc.setFont("helvetica", "normal");
    for (const bm of data.biomarkers) {
      y = pageBreak(doc, y, 6, ml, ph);
      [bm.name, String(bm.value), bm.unit, bm.status].forEach((cell, i) => {
        doc.setTextColor(...(i === 3 ? statusColor(bm.status) : C.dark));
        doc.text(cell, ml + i * colW + 2, y);
      });
      y += 6;
    }
    y += 5;
  }

  // ── Protocol Recommendations ──────────────────────────────────────────
  if (data.recommendations?.length) {
    y = pageBreak(doc, y, 24, ml, ph);
    y = sectionBanner(doc, "Protocol Recommendations", y, ml, pw);

    for (const rec of data.recommendations) {
      y = pageBreak(doc, y, 26, ml, ph);

      // Product name + evidence grade
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.dark);
      doc.text(rec.product, ml + 2, y);
      if (rec.evidence_grade) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.muted);
        doc.text(`Evidence: ${rec.evidence_grade}`, pw - ml, y, { align: "right" });
      }
      y += 5;

      // Dose + timing
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.muted);
      doc.text(`Dose: ${rec.dose}  ·  Timing: ${rec.timing}`, ml + 2, y);
      y += 5;

      // Reason (word-wrapped)
      doc.setTextColor(...C.dark);
      const lines = doc.splitTextToSize(rec.reason, pw - ml * 2 - 4);
      y = pageBreak(doc, y, lines.length * 4.5, ml, ph);
      doc.text(lines, ml + 2, y);
      y += lines.length * 4.5 + 4;

      hRule(doc, y, ml, pw);
      y += 4;
    }
  }

  // ── Daily Timing Schedule ─────────────────────────────────────────────
  if (data.timingSchedule?.length) {
    y = pageBreak(doc, y, 24, ml, ph);
    y = sectionBanner(doc, "Daily Timing Schedule", y, ml, pw);

    for (const slot of data.timingSchedule) {
      y = pageBreak(doc, y, 18, ml, ph);

      // Slot time
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.primary);
      doc.text(slot.time, ml + 2, y);
      y += 5;

      // Products
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.dark);
      const productLine = doc.splitTextToSize(slot.products.join(", "), pw - ml * 2 - 4);
      doc.text(productLine, ml + 4, y);
      y += productLine.length * 4.5 + 2;

      // Notes
      if (slot.notes?.length) {
        doc.setTextColor(...C.muted);
        for (const note of slot.notes) {
          y = pageBreak(doc, y, 6, ml, ph);
          const noteLines = doc.splitTextToSize(`· ${note}`, pw - ml * 2 - 6);
          doc.text(noteLines, ml + 4, y);
          y += noteLines.length * 4 + 1;
        }
      }
      y += 4;
    }
  }

  // ── Nutrient Interactions (high + critical only) ───────────────────────
  const flagged = (data.competitionResults ?? []).filter(
    (r) => r.clinical_significance === "high" || r.clinical_significance === "critical",
  );
  if (flagged.length > 0) {
    y = pageBreak(doc, y, 24, ml, ph);
    y = sectionBanner(doc, "Nutrient Interactions", y, ml, pw);

    for (const conflict of flagged) {
      const isCritical = conflict.clinical_significance === "critical";
      y = pageBreak(doc, y, 18, ml, ph);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(isCritical ? C.danger : C.warning));
      doc.text(
        `${conflict.nutrient_a} + ${conflict.nutrient_b}  [${conflict.clinical_significance.toUpperCase()}]`,
        ml + 2,
        y,
      );
      y += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.dark);
      const msgLines = doc.splitTextToSize(conflict.user_message, pw - ml * 2 - 4);
      y = pageBreak(doc, y, msgLines.length * 4.5, ml, ph);
      doc.text(msgLines, ml + 2, y);
      y += msgLines.length * 4.5 + 5;
    }
  }

  // ── Critical Value Flags ──────────────────────────────────────────────
  if (data.criticalEvents?.length) {
    y = pageBreak(doc, y, 24, ml, ph);
    y = sectionBanner(doc, "Critical Flags", y, ml, pw);

    for (const ev of data.criticalEvents) {
      y = pageBreak(doc, y, 14, ml, ph);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.danger);
      const direction = ev.threshold_triggered === "critical_high" ? "▲ HIGH" : "▼ LOW";
      doc.text(`${ev.marker_name}  ${direction}`, ml + 2, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.dark);
      doc.text(
        `Observed: ${ev.observed_value}  ·  Threshold: ${ev.threshold_value}`,
        ml + 4,
        y,
      );
      y += 6;
    }
    y += 2;
  }

  // ── Disclaimers ───────────────────────────────────────────────────────
  y = pageBreak(doc, y, 36, ml, ph);
  y = sectionBanner(doc, "Important Disclaimers", y, ml, pw);

  // Pregnancy disclaimer (rendered prominently if present)
  if (data.pregnancy_disclaimer) {
    y = pageBreak(doc, y, 10, ml, ph);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.warning);
    const pdLines = doc.splitTextToSize(`⚠ ${data.pregnancy_disclaimer}`, pw - ml * 2 - 4);
    doc.text(pdLines, ml + 2, y);
    y += pdLines.length * 4.5 + 4;
  }

  const disclaimers = [
    "This protocol is generated by AI and is for informational purposes only.",
    "It does not constitute medical advice and should not replace consultation with a qualified healthcare professional.",
    "Always consult your doctor before starting any new supplement regimen, especially if you have existing medical conditions or take prescription medications.",
    "Individual results may vary. Blue Zone assumes no liability for supplement interactions or adverse effects.",
  ];

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.muted);
  for (const disclaimer of disclaimers) {
    y = pageBreak(doc, y, 8, ml, ph);
    const dLines = doc.splitTextToSize(`· ${disclaimer}`, pw - ml * 2 - 4);
    doc.text(dLines, ml + 2, y);
    y += dLines.length * 4 + 3;
  }

  // ── Footer on every page ──────────────────────────────────────────────
  const totalPages = (doc as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = ph - 8;
    hRule(doc, fy - 3, ml, pw);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text("Blue Zone · Personalised Health Protocol · Confidential", ml, fy);
    doc.text(`Page ${p} of ${totalPages}`, pw - ml, fy, { align: "right" });
  }

  return doc;
}

// ----------------------------------------------------------------
// 2. generatePDFBuffer
// ----------------------------------------------------------------

export async function generatePDFBuffer(content: PDFContent): Promise<Buffer> {
  return Buffer.from(content.output("arraybuffer"));
}

// ----------------------------------------------------------------
// 3. savePDFToStorage
// ----------------------------------------------------------------

export async function savePDFToStorage(
  userId:             string,
  buffer:             Buffer,
  protocolSnapshotId: string,
): Promise<string> {
  const supabase  = getAdminClient();
  const timestamp = Date.now();
  const filePath  = `${userId}/${protocolSnapshotId}/${timestamp}.pdf`;

  const { error: uploadErr } = await supabase.storage
    .from("pdf-exports")
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert:      false,
    });

  if (uploadErr) {
    throw new Error(`[pdf-templates] Storage upload failed: ${uploadErr.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("pdf-exports")
    .getPublicUrl(filePath);

  const pdfUrl = urlData?.publicUrl ?? filePath;

  const { error: dbErr } = await supabase
    .from(TABLES.PROTOCOL_PDF_EXPORTS)
    .insert({
      [COLS.USER_ID]: userId,
      snapshot_id:    protocolSnapshotId,
      pdf_url:        pdfUrl,
      export_type:    "summary",
      generated_at:   new Date().toISOString(),
      expires_at:     new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      download_count: 0,
    });

  if (dbErr) {
    throw new Error(`[pdf-templates] DB insert failed: ${dbErr.message}`);
  }

  return pdfUrl;
}
