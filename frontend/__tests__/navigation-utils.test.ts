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
    expect(formatDistance(995)).toBe("1000 m");
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

// ── Ambulance position stability (unit-level logic) ───────────────────────────
// These tests verify the contract that the position-caching ref pattern upholds:
// positions computed from the same base coords must stay within the jitter window.

describe("ambulance position stability invariants", () => {
  const JITTER_DEG = 0.002; // half of 0.004 range
  const deltas: [number, number][] = [
    [ 0.013,  0.007],
    [-0.009,  0.011],
    [ 0.007, -0.014],
    [-0.016, -0.006],
    [ 0.020, -0.003],
  ];

  function computePositions(baseLng: number, baseLat: number): [number, number][] {
    const jitter = () => (Math.random() - 0.5) * 0.004;
    return deltas.map(([dlng, dlat]) => [baseLng + dlng + jitter(), baseLat + dlat + jitter()]);
  }

  it("produces 5 unique positions", () => {
    const pos = computePositions(-80.54, 43.47);
    expect(pos).toHaveLength(5);
    const unique = new Set(pos.map(([lng, lat]) => `${lng},${lat}`));
    expect(unique.size).toBe(5);
  });

  it("positions are within jitter distance of the base", () => {
    const baseLng = -80.54, baseLat = 43.47;
    const pos = computePositions(baseLng, baseLat);
    pos.forEach(([lng, lat], i) => {
      const [dlng, dlat] = deltas[i];
      expect(Math.abs(lng - (baseLng + dlng))).toBeLessThanOrEqual(JITTER_DEG + 0.001);
      expect(Math.abs(lat - (baseLat + dlat))).toBeLessThanOrEqual(JITTER_DEG + 0.001);
    });
  });

  it("two calls from same base produce DIFFERENT positions (random jitter)", () => {
    // Run 20 times — probability of all matching at float precision is astronomically low
    const results = Array.from({ length: 20 }, () => computePositions(-80.54, 43.47));
    const allSame = results.every(pos =>
      pos.every(([lng, lat], i) => lng === results[0][i][0] && lat === results[0][i][1])
    );
    expect(allSame).toBe(false);
  });

  it("caching ref prevents re-randomisation across re-spawns", () => {
    // Simulate the ref-based caching: compute once, store, reuse
    let cachedPositions: [number, number][] | null = null;
    const getPositions = (baseLng: number, baseLat: number) => {
      if (!cachedPositions) {
        cachedPositions = computePositions(baseLng, baseLat);
      }
      return cachedPositions;
    };

    const first  = getPositions(-80.54, 43.47);
    const second = getPositions(-80.54, 43.47); // cache hit
    expect(second).toBe(first); // Same reference — no new random computation
  });

  it("clearing the cache forces recomputation at a new base (GPS respawn)", () => {
    let cachedPositions: [number, number][] | null = null;
    const getPositions = (baseLng: number, baseLat: number) => {
      if (!cachedPositions) {
        cachedPositions = computePositions(baseLng, baseLat);
      }
      return cachedPositions;
    };
    const clearCache = () => { cachedPositions = null; };

    const oldBase  = getPositions(-80.54, 43.47);  // map center
    clearCache();                                     // GPS fires
    const newBase  = getPositions(-79.38, 43.65);  // real GPS location
    // Verify positions shifted by the GPS offset (~1.16° lng, ~0.18° lat)
    expect(Math.abs(newBase[0][0] - oldBase[0][0])).toBeGreaterThan(1.0);
  });
});


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
