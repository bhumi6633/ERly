/**
 * Pure navigation utility functions.
 * All functions here are side-effect-free so they can be tested without a DOM.
 */

/** Format a bearing-aligned distance for display in the turn card */
export function formatDistance(meters: number): string {
  if (meters < 50) return "arrive";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Map congestion string → hex colour (matches drawRouteFromGeometry palette) */
export function trafficColor(congestion: string): string {
  switch (congestion) {
    case "low":      return "#22C55E";
    case "moderate": return "#FBBF24";
    case "heavy":    return "#F87171";
    case "severe":   return "#DC2626";
    default:         return "#38BDF8"; // unknown / no data → sky blue
  }
}

/** Derive a turn-direction label from Mapbox maneuver type + modifier */
export type TurnDirection =
  | "arrive"
  | "depart"
  | "sharp-left"
  | "sharp-right"
  | "uturn"
  | "left"
  | "right"
  | "straight";

export function getTurnDirection(
  type: string,
  modifier?: string,
): TurnDirection {
  if (type === "arrive") return "arrive";
  if (type === "depart") return "depart";
  const mod = modifier ?? "";
  if (mod.includes("uturn")) return "uturn";
  if (mod.includes("sharp left")) return "sharp-left";
  if (mod.includes("sharp right")) return "sharp-right";
  if (mod.includes("left")) return "left";
  if (mod.includes("right")) return "right";
  return "straight";
}

/**
 * Haversine bearing: compass heading (0-360°) from `start` to `end`.
 * 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function computeBearing(
  start: [number, number],
  end: [number, number],
): number {
  const [lng1, lat1] = start.map((d) => (d * Math.PI) / 180);
  const [lng2, lat2] = end.map((d) => (d * Math.PI) / 180);
  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Format ETA minutes into a human string, e.g. "5 min" or "1 hr 3 min" */
export function formatEta(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
