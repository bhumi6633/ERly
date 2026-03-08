import { describe, it, expect } from "vitest";
import {
  formatDistance,
  trafficColor,
  getTurnDirection,
  computeBearing,
  formatEta,
} from "../lib/navigation-utils";

// ── formatDistance ────────────────────────────────────────────────────────────

describe("formatDistance", () => {
  it('returns "arrive" for 0 m', () => {
    expect(formatDistance(0)).toBe("arrive");
  });

  it('returns "arrive" for distances under 50 m', () => {
    expect(formatDistance(49)).toBe("arrive");
  });

  it("rounds to nearest 10 m for distances between 50 m and 999 m", () => {
    expect(formatDistance(55)).toBe("60 m");
    expect(formatDistance(104)).toBe("100 m");
    expect(formatDistance(995)).toBe("1000 m"); // rounds up past 999
  });

  it("returns km with one decimal for distances >= 1000 m", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDistance(10200)).toBe("10.2 km");
  });

  it("does NOT include a unit suffix smaller than 50 m", () => {
    expect(formatDistance(1)).toBe("arrive");
  });
});

// ── trafficColor ──────────────────────────────────────────────────────────────

describe("trafficColor", () => {
  it("maps low congestion to green", () => {
    expect(trafficColor("low")).toBe("#22C55E");
  });

  it("maps moderate congestion to yellow/amber", () => {
    expect(trafficColor("moderate")).toBe("#FBBF24");
  });

  it("maps heavy congestion to red", () => {
    expect(trafficColor("heavy")).toBe("#F87171");
  });

  it("maps severe congestion to dark red", () => {
    expect(trafficColor("severe")).toBe("#DC2626");
  });

  it("maps unknown congestion to sky blue (fallback)", () => {
    expect(trafficColor("unknown")).toBe("#38BDF8");
  });

  it("maps empty string to fallback color", () => {
    expect(trafficColor("")).toBe("#38BDF8");
  });
});

// ── getTurnDirection ──────────────────────────────────────────────────────────

describe("getTurnDirection", () => {
  it("recognises arrive", () => {
    expect(getTurnDirection("arrive")).toBe("arrive");
  });

  it("recognises depart", () => {
    expect(getTurnDirection("depart")).toBe("depart");
  });

  it("recognises uturn from modifier", () => {
    expect(getTurnDirection("turn", "uturn-left")).toBe("uturn");
    expect(getTurnDirection("turn", "uturn-right")).toBe("uturn");
  });

  it("recognises sharp-left", () => {
    expect(getTurnDirection("turn", "sharp left")).toBe("sharp-left");
  });

  it("recognises sharp-right", () => {
    expect(getTurnDirection("turn", "sharp right")).toBe("sharp-right");
  });

  it("recognises left", () => {
    expect(getTurnDirection("turn", "left")).toBe("left");
    expect(getTurnDirection("turn", "slight left")).toBe("left");
  });

  it("recognises right", () => {
    expect(getTurnDirection("turn", "right")).toBe("right");
    expect(getTurnDirection("turn", "slight right")).toBe("right");
  });

  it("falls back to straight for unknown or missing modifier", () => {
    expect(getTurnDirection("turn")).toBe("straight");
    expect(getTurnDirection("new name", "straight")).toBe("straight");
  });
});

// ── computeBearing ────────────────────────────────────────────────────────────

describe("computeBearing", () => {
  it("is ~0° (north) when moving directly north", () => {
    const b = computeBearing([0, 0], [0, 1]);
    expect(b).toBeCloseTo(0, 0);
  });

  it("is ~90° (east) when moving directly east", () => {
    const b = computeBearing([0, 0], [1, 0]);
    expect(b).toBeCloseTo(90, 0);
  });

  it("is ~180° (south) when moving directly south", () => {
    const b = computeBearing([0, 1], [0, 0]);
    expect(b).toBeCloseTo(180, 0);
  });

  it("is ~270° (west) when moving directly west", () => {
    const b = computeBearing([1, 0], [0, 0]);
    expect(b).toBeCloseTo(270, 0);
  });

  it("returns a value in [0, 360)", () => {
    const b = computeBearing([-79.38, 43.65], [-80.54, 43.47]);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

// ── formatEta ─────────────────────────────────────────────────────────────────

describe("formatEta", () => {
  it("returns minutes only for < 60 min", () => {
    expect(formatEta(5)).toBe("5 min");
    expect(formatEta(59)).toBe("59 min");
  });

  it("returns hours only when minutes remainder is 0", () => {
    expect(formatEta(60)).toBe("1 hr");
    expect(formatEta(120)).toBe("2 hr");
  });

  it("returns hours and minutes for mixed values", () => {
    expect(formatEta(63)).toBe("1 hr 3 min");
    expect(formatEta(90)).toBe("1 hr 30 min");
  });
});
