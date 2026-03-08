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

/** Default fetch timeout (ms). Render free tier needs ~15 s on cold start.
 * The urgency verdict is shown instantly from questionnaire data, so this only
 * controls how long we wait for the facility list to populate. */
export const API_FETCH_TIMEOUT_MS = 15_000;
