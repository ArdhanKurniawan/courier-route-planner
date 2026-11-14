// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import {
  generateRandomCoordinates,
  type RandomCoordinateInput,
} from "@/domain/generator/random-coordinate-generator";

const input = {
  version: "random-v1",
  latitude: -6.2,
  longitude: 106.8,
  count: 3,
  radiusMinM: 100,
  radiusMaxM: 1000,
  seed: "0",
} satisfies RandomCoordinateInput;

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const rad = Math.PI / 180;
  const halfLat = (to.latitude - from.latitude) * rad / 2;
  const halfLon = (to.longitude - from.longitude) * rad / 2;
  const haversine = Math.sin(halfLat) ** 2 +
    Math.cos(from.latitude * rad) * Math.cos(to.latitude * rad) *
    Math.sin(halfLon) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(haversine));
}

afterEach(() => vi.restoreAllMocks());

describe("random-v1 golden vectors", () => {
  it.each([
    ["0", [[-6.19558, 106.796], [-6.19126, 106.80147], [-6.19592, 106.80324]]],
    ["1", [[-6.20711, 106.79682], [-6.19407, 106.7989], [-6.20739, 106.80272]]],
    ["-1", [[-6.19324, 106.79466], [-6.19887, 106.80584], [-6.20225, 106.79209]]],
    ["-9223372036854775808", [[-6.20156, 106.80778], [-6.20394, 106.80365], [-6.19523, 106.80152]]],
    ["9223372036854775807", [[-6.19558, 106.80759], [-6.19709, 106.79844], [-6.20142, 106.80281]]],
  ] as const)("reproduces the ordered coordinates for seed %s", (seed, pairs) => {
    const expected = pairs.map(([latitude, longitude]) => ({ latitude, longitude }));
    const options = Object.freeze({ ...input, seed });
    expect(generateRandomCoordinates(options)).toEqual(expected);
    expect(generateRandomCoordinates(options)).toEqual(expected);
    expect(options).toEqual({ ...input, seed });
  });
});

describe("random-v1 geographic bounds", () => {
  it.each([
    { latitude: 0, longitude: 0, count: 1, radiusMinM: 0, radiusMaxM: 2 },
    { latitude: 89.99999, longitude: 179.99999, count: 100, radiusMinM: 49_999, radiusMaxM: 50_000 },
    { latitude: 90, longitude: -180, count: 100, radiusMinM: 500, radiusMaxM: 1500 },
    { latitude: -90, longitude: 180, count: 100, radiusMinM: 500, radiusMaxM: 1500 },
    { latitude: 0, longitude: 179.99999, count: 100, radiusMinM: 5, radiusMaxM: 1500 },
  ])("returns $count unique, rounded points within the radius at ($latitude,$longitude)", (overrides) => {
    const options = { ...input, ...overrides };
    const points = generateRandomCoordinates(options);
    expect(points).toHaveLength(options.count);
    expect(new Set(points.map((point) => JSON.stringify(point))).size).toBe(options.count);
    for (const point of points) {
      expect(Math.abs(point.latitude)).toBeLessThanOrEqual(90);
      expect(point.longitude).toBeGreaterThanOrEqual(-180);
      expect(point.longitude).toBeLessThan(180);
      expect(Number(point.latitude.toFixed(5))).toBe(point.latitude);
      expect(Number(point.longitude.toFixed(5))).toBe(point.longitude);
      const distance = distanceMeters(options, point);
      expect(distance).toBeGreaterThan(1e-6);
      expect(distance).toBeGreaterThanOrEqual(options.radiusMinM - 1e-6);
      expect(distance).toBeLessThanOrEqual(options.radiusMaxM + 1e-6);
    }
    if (options.latitude === 0 && options.longitude === 179.99999)
      expect(points.some((point) => point.longitude < 0)).toBe(true);
  });

  it("skips duplicate and post-rounding out-of-radius candidates in draw order", () => {
    const options = { ...input, latitude: 0, longitude: 0, count: 4, radiusMinM: 0, radiusMaxM: 2 };
    expect(generateRandomCoordinates(options)).toEqual([
      { latitude: 0.00001, longitude: -0.00001 },
      { latitude: 0.00001, longitude: 0.00001 },
      { latitude: -0.00001, longitude: 0.00001 },
      { latitude: -0.00001, longitude: 0 },
    ]);
  });

  it("fails deterministically when the annulus cannot fit the requested dataset", () => {
    const options = { ...input, latitude: 0, longitude: 0, count: 9, radiusMinM: 0, radiusMaxM: 2 };
    for (let run = 0; run < 2; run++)
      expect(() => generateRandomCoordinates(options)).toThrow(
        expect.objectContaining({ code: "GENERATION_EXHAUSTED", attempts: 9 * 64 }),
      );
  });

  it("does not read randomness, time, or the network", () => {
    const unavailable = () => { throw new Error("Unexpected dependency"); };
    vi.spyOn(Math, "random").mockImplementation(unavailable);
    vi.spyOn(Date, "now").mockImplementation(unavailable);
    vi.spyOn(globalThis, "fetch").mockImplementation(unavailable);
    const points = generateRandomCoordinates(input);
    vi.restoreAllMocks();
    expect(points).toHaveLength(input.count);
  });
});

describe("random coordinate input validation", () => {
  it.each([
    { version: "random-v2" }, { count: 0 }, { count: 101 }, { count: 1.5 },
    { radiusMinM: -1 }, { radiusMinM: 1000 }, { radiusMinM: 1001 },
    { radiusMinM: 0.5 }, { radiusMaxM: 50_001 }, { radiusMaxM: Infinity },
    { seed: 0 }, { seed: "01" }, { seed: "-0" }, { seed: "0x10" }, { seed: " 1" },
    { seed: "-9223372036854775809" }, { seed: "9223372036854775808" },
    { latitude: NaN }, { latitude: Infinity }, { latitude: 90.00001 },
    { longitude: -180.00001 }, { longitude: -Infinity }, { extra: "unexpected" },
  ])("rejects invalid input %o with structured validation issues", (overrides) => {
    expect(() => generateRandomCoordinates({ ...input, ...overrides })).toThrow(ZodError);
  });
});
