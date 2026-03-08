import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CareFilter } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a minute count into a readable string.
 * Avoids the ambiguous "m" suffix (could be metres).
 */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const r = Math.round(minutes);
  if (r < 60) return `${r} min`;
  const h = Math.floor(r / 60);
  const m = r % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Returns true if a facility type string matches the given care filter.
 * Used to client-side filter the triage results panel without a backend round-trip.
 */
export function matchesCareFilter(facilityType: string, filter: CareFilter): boolean {
  if (filter === "all") return true;
  const t = facilityType.toLowerCase();
  switch (filter) {
    case "er":         return t.includes("hospital") || t.includes("er") || t.includes("emergency");
    case "urgent":     return t.includes("urgent");
    case "walkin":     return t.includes("clinic") || t.includes("walk") || t.includes("family");
    case "telehealth": return t.includes("telehealth") || t.includes("virtual");
    case "pharmacy":   return t.includes("pharmacy") || t.includes("drug");
    case "specialty":  return t.includes("specialty") || t.includes("specialist");
    default:           return true;
  }
}
