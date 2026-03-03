/// lib/sentry.ts
// Stub — add SENTRY_DSN to .env.local and initialize the real SDK here.

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    console.error("[sentry:exception]", err, context ?? "");
    return;
  }
  // TODO: Sentry.captureException(err, { extra: context });
}

export function captureMessage(msg: string, level: "info" | "warning" | "error" = "info", context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    console.warn(`[sentry:${level}]`, msg, context ?? "");
    return;
  }
  // TODO: Sentry.captureMessage(msg, { level, extra: context });
}
