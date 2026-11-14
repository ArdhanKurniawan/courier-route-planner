import { z } from "zod";
import { scenarioSeed } from "@/lib/validation/scenario";

export const RANDOM_COORDINATE_VERSION = "random-v1";

const randomCoordinateInput = z
  .strictObject({
    version: z.literal(RANDOM_COORDINATE_VERSION),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    count: z.number().int().min(1).max(100),
    radiusMinM: z.number().int().min(0).max(50_000),
    radiusMaxM: z.number().int().min(1).max(50_000),
    seed: scenarioSeed,
  })
  .refine(({ radiusMinM, radiusMaxM }) => radiusMinM < radiusMaxM, {
    path: ["radiusMaxM"],
    message: "Maximum radius must be greater than minimum radius.",
  });

export type RandomCoordinateInput = z.infer<typeof randomCoordinateInput>;
export type GeneratedCoordinate = { latitude: number; longitude: number };

export class CoordinateGenerationError extends Error {
  readonly code = "GENERATION_EXHAUSTED";

  constructor(readonly attempts: number) {
    super("Could not generate enough unique coordinates inside the radius.");
    this.name = "CoordinateGenerationError";
  }
}

const earthRadiusM = 6_371_008.8;
const radiansPerDegree = Math.PI / 180;
const coordinateScale = 100_000;
const distanceToleranceM = 1e-6;
const attemptsPerCustomer = 64;
const splitMixIncrement = BigInt("0x9e3779b97f4a7c15");
const splitMixFirstMultiplier = BigInt("0xbf58476d1ce4e5b9");
const splitMixSecondMultiplier = BigInt("0x94d049bb133111eb");
const shift30 = BigInt(30);
const shift27 = BigInt(27);
const shift31 = BigInt(31);
const shift11 = BigInt(11);

function splitMix64(seed: string) {
  let state = BigInt.asUintN(64, BigInt(seed));
  return () => {
    state = BigInt.asUintN(64, state + splitMixIncrement);
    let bits = state;
    bits = BigInt.asUintN(64, (bits ^ (bits >> shift30)) * splitMixFirstMultiplier);
    bits = BigInt.asUintN(64, (bits ^ (bits >> shift27)) * splitMixSecondMultiplier);
    return Number((bits ^ (bits >> shift31)) >> shift11) / 2 ** 53;
  };
}

function wrapLongitude(degrees: number) {
  if (degrees >= 180) return degrees - 360;
  if (degrees < -180) return degrees + 360;
  return degrees;
}

function roundCoordinate(degrees: number) {
  const rounded = Math.round(degrees * coordinateScale) / coordinateScale;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function latitudeCosine(latitude: number) {
  return Math.abs(latitude) === 90 ? 0 : Math.cos(latitude * radiansPerDegree);
}

function sphericalOrigin({ latitude, longitude }: GeneratedCoordinate) {
  return {
    sinLat: Math.sin(latitude * radiansPerDegree),
    cosLat: latitudeCosine(latitude),
    longitude: wrapLongitude(longitude),
  };
}

function destination(
  center: ReturnType<typeof sphericalOrigin>,
  bearing: number,
  arc: number,
): GeneratedCoordinate {
  const sinArc = Math.sin(arc);
  const cosArc = Math.cos(arc);
  const north = Math.cos(bearing) * sinArc;
  const east = Math.sin(bearing) * sinArc;
  const horizontal = center.cosLat * cosArc - center.sinLat * north;
  const vertical = center.sinLat * cosArc + center.cosLat * north;
  const latitude = roundCoordinate(
    Math.atan2(vertical, Math.hypot(horizontal, east)) / radiansPerDegree,
  );
  const longitude = wrapLongitude(
    roundCoordinate(
      wrapLongitude(
        center.longitude + Math.atan2(east, horizontal) / radiansPerDegree,
      ),
    ),
  );
  return { latitude, longitude: Math.abs(latitude) === 90 ? 0 : longitude };
}

function distanceMeters(
  from: GeneratedCoordinate,
  to: GeneratedCoordinate,
  originCosine: number,
) {
  const halfLat = ((to.latitude - from.latitude) * radiansPerDegree) / 2;
  const halfLon =
    (wrapLongitude(to.longitude - from.longitude) * radiansPerDegree) / 2;
  const haversine =
    Math.sin(halfLat) ** 2 +
    originCosine * latitudeCosine(to.latitude) * Math.sin(halfLon) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

/**
 * random-v1 uses SplitMix64 with the signed seed reinterpreted as unsigned bits.
 * Per draw, the top 53 bits give a uniform fraction. Draw bearing first, then
 * interpolate sin²(arc/2) for uniform surface area on a 6,371,008.8 m sphere.
 * Round to 5 decimal places with Math.round. Wrap longitude and canonicalize
 * rounded poles before deduplication. Retain accepted points in draw order.
 * Recheck radius with a 1 µm floating-point tolerance. Reject nonfinite
 * distances, points within that tolerance of the Depot, and rounded duplicates.
 * The total candidate budget is 64 × count, including rejected candidates.
 */
export function generateRandomCoordinates(raw: unknown): GeneratedCoordinate[] {
  const input = randomCoordinateInput.parse(raw);
  const center = sphericalOrigin(input);
  const random = splitMix64(input.seed);
  const minArea = Math.sin(input.radiusMinM / (2 * earthRadiusM)) ** 2;
  const maxArea = Math.sin(input.radiusMaxM / (2 * earthRadiusM)) ** 2;
  const points: GeneratedCoordinate[] = [];
  const seen = new Set<string>();
  const maxAttempts = attemptsPerCustomer * input.count;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const bearing = 2 * Math.PI * random();
    const area = minArea + (maxArea - minArea) * random();
    const point = destination(center, bearing, 2 * Math.asin(Math.sqrt(area)));
    const key = point.latitude + "," + point.longitude;
    if (seen.has(key)) continue;

    const distance = distanceMeters(input, point, center.cosLat);
    if (
      !Number.isFinite(distance) ||
      distance <= distanceToleranceM ||
      distance < input.radiusMinM - distanceToleranceM ||
      distance > input.radiusMaxM + distanceToleranceM
    )
      continue;

    seen.add(key);
    points.push(point);
    if (points.length === input.count) return points;
  }

  throw new CoordinateGenerationError(maxAttempts);
}
