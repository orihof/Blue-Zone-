/// lib/text-utils.ts

/**
 * Extracts the first sentence from a string.
 * Splits on ". " (period + space) — handles the common case of prose reasoning text.
 * Edge cases:
 *   - No ". " found → returns the whole string (treated as one sentence)
 *   - Ends with period but no space after → same as above
 *   - null/undefined/empty → returns ""
 */
export function extractFirstSentence(text: string | null | undefined): string {
  if (!text) return "";
  const idx = text.indexOf(". ");
  if (idx === -1) {
    // Single sentence — ensure it ends with a period
    return text.endsWith(".") ? text : `${text}.`;
  }
  return text.slice(0, idx + 1); // includes the period, excludes the trailing space
}

/**
 * Returns everything after the first sentence.
 * If the string is a single sentence, returns "".
 */
export function remainingAfterFirstSentence(text: string | null | undefined): string {
  if (!text) return "";
  const first = extractFirstSentence(text);
  return text.slice(first.length).trim();
}
