/// lib/uploads/errors.ts
// Client-safe helpers for upload error parsing and file size display.

/**
 * Parse a raw upload error (from XHR responseText or fetch body) into a
 * user-friendly message. Detects Supabase Storage 413 / payload-too-large
 * errors wrapped in a 400 status and returns a clear, actionable string.
 */
export function friendlyUploadError(raw: string): string {
  const lower = raw.toLowerCase();

  // Supabase Storage wraps 413 inside a 400 response body
  if (lower.includes("413") || lower.includes("payload too large") || lower.includes("exceeded the maximum")) {
    return "File too large for current storage limits. Try reducing the export date range in Apple Health, or contact support.";
  }
  if (lower.includes("invalid mime type") || lower.includes("mime")) {
    return "File type not recognized. Please upload a .zip export from Apple Health.";
  }
  if (lower.includes("not found")) {
    return "Upload destination not found. Please try again.";
  }

  // Fall back to the raw message but cap length
  if (raw.length > 200) return `${raw.slice(0, 180)}…`;
  return raw;
}

/** Human-readable file size (e.g. "142 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Threshold (bytes) above which we show a "large file" info toast. */
export const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB
