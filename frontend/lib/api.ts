/**
 * Backend API base URL. Set NEXT_PUBLIC_API_URL in .env (no trailing slash).
 * Next.js bakes this in at build/start — restart dev server after changing .env.
 */
const FALLBACK = "http://localhost:8000";

export function getApiUrl(): string {
  const url =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
    FALLBACK;
  const base = url.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    console.debug("[ERly] API base:", base);
  }
  return base;
}

/** Default fetch timeout (ms). Fail fast — urgency verdict is shown instantly from questionnaire data. */
export const API_FETCH_TIMEOUT_MS = 8_000;
