import {
  TextractClient,
  AnalyzeDocumentCommand,
} from "@aws-sdk/client-textract";
import type { ExtractedBiomarker } from "@/types";

// ---- AWS Textract OCR client --------------------------------

const textractClient = new TextractClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Given a Buffer of a PDF or image file, extract text via AWS Textract
 * then parse blood biomarker lines out of the text.
 */
export async function extractBiomarkersFromFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedBiomarker[]> {
  const isImage = mimeType.startsWith("image/");

  // Textract expects a Uint8Array
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: new Uint8Array(fileBuffer) },
    FeatureTypes: ["TABLES", "FORMS"],
  });

  const response = await textractClient.send(command);
  const blocks = response.Blocks ?? [];

  // Collect all LINE text blocks
  const lines = blocks
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text!);

  return parseBiomarkersFromLines(lines, isImage);
}

/**
 * Heuristic parser — extracts biomarker rows from OCR text lines.
 *
 * Expected line formats (common across Israeli & US labs):
 *   "Vitamin D    25.4    ng/mL    30–100"
 *   "TSH 2.13 mIU/L (0.4–4.0)"
 */
function parseBiomarkersFromLines(
  lines: string[],
  _isImage: boolean
): ExtractedBiomarker[] {
  const results: ExtractedBiomarker[] = [];

  // Pattern: name   value   unit   [ref_min–ref_max]
  const pattern =
    /^(.+?)\s+([\d.]+)\s+([a-zA-Z/%µ]+(?:\/[a-zA-Z]+)?)\s*(?:[\(\[]?([\d.]+)\s*[-–]\s*([\d.]+)[\)\]]?)?/;

  for (const line of lines) {
    const match = line.trim().match(pattern);
    if (!match) continue;

    const [, rawName, rawValue, unit, rawMin, rawMax] = match;
    const name = rawName.trim();
    const value = parseFloat(rawValue);

    if (isNaN(value)) continue;
    // Skip obvious non-biomarker lines
    if (name.length < 2 || /^\d/.test(name)) continue;

    results.push({
      name,
      value,
      unit: unit.trim(),
      reference_min: rawMin ? parseFloat(rawMin) : undefined,
      reference_max: rawMax ? parseFloat(rawMax) : undefined,
    });
  }

  return results;
}
