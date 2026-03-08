import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
