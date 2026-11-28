import { createHash } from "node:crypto";
import { z } from "zod";
import { depotId } from "@/lib/validation/depot";

export const distanceMatrixVersion = "distance-matrix/v1";
export const distanceMatrixPointLimit = 51;
export const matrixProviderEndpoints = Object.freeze({
  "just-routing": "https://api.justrouting.tech/",
  "osrm-plus": "https://api.osrmplus.com/",
});
export type MatrixProviderId = keyof typeof matrixProviderEndpoints;
export const matrixProviderId = z.enum(["just-routing", "osrm-plus"]);

const normalized = (value: number) => (value === 0 ? 0 : value);
const latitude = z.number().finite().min(-90).max(90).transform(normalized);
const longitude = z.number().finite().min(-180).max(180).transform(normalized);
const meters = z.number().finite().nonnegative().transform(normalized);
const digest = z.string().regex(/^[0-9a-f]{64}$/u);
const node = z
  .strictObject({
    index: z.number().int().nonnegative(),
    kind: z.enum(["depot", "order"]),
    id: depotId,
    latitude,
    longitude,
  })
  .readonly();
const snap = z
  .strictObject({ longitude, latitude, distanceM: meters })
  .readonly();
const metadata = z.string().min(1).max(200).nullable();
const nodeOrderSchema = z.array(node).min(2).max(distanceMatrixPointLimit).readonly();
const inputSchema = z.strictObject({
  version: z.literal(distanceMatrixVersion),
  provider: z.literal("osrm"),
  profile: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,31}$/u),
  endpoint: z
    .string()
    .max(255)
    .refine((value) => {
      const url = URL.parse(value);
      return (
        url?.protocol === "https:" &&
        url.href === value &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      );
    }),
  options: z
    .strictObject({
      annotations: z.literal("distance"),
      generateHints: z.literal(false),
      snapRadiusM: z.number().finite().positive(),
    })
    .readonly(),
  unit: z.literal("meter"),
  directed: z.literal(true),
  inputHash: digest,
  nodeOrder: nodeOrderSchema,
  matrix: z
    .array(z.array(meters).max(distanceMatrixPointLimit).readonly())
    .max(distanceMatrixPointLimit)
    .readonly(),
  snapping: z
    .array(z.strictObject({ source: snap, destination: snap }).readonly())
    .max(distanceMatrixPointLimit)
    .readonly(),
  provenance: z
    .strictObject({
      generatedAt: z.iso.datetime({ precision: 3 }),
      apiVersion: z.literal("v1"),
      actualProvider: matrixProviderId.optional(),
      generationMode: z.enum(["operational", "research"]).optional(),
      dataVersion: metadata,
      softwareVersion: metadata,
      networkExtract: metadata,
      codeRevision: z
        .string()
        .regex(/^[0-9a-f]{40}$/u)
        .nullable(),
    })
    .readonly(),
});

type MatrixInput = z.output<typeof inputSchema>;
export type DistanceMatrixNode = z.output<typeof node>;
type ZeroPair = Readonly<{ from: number; to: number }>;
export type DistanceMatrixSnapshot = Readonly<
  MatrixInput & {
    matrixHash: string;
    zeroPairs: readonly ZeroPair[];
    comparisonEligible: boolean;
  }
>;

export class DistanceMatrixValidationError extends Error {
  constructor(readonly code: "INVALID_MATRIX" | "INVALID_SNAP" | "INTEGRITY") {
    super(code);
    this.name = "DistanceMatrixValidationError";
  }
}

type Coordinates = Pick<DistanceMatrixNode, "latitude" | "longitude">;
function verifyNodeOrder(nodeOrder: readonly DistanceMatrixNode[]) {
  const identities = new Set<string>();
  for (const [index, point] of nodeOrder.entries()) {
    const key = point.kind + ":" + point.id;
    if (
      point.index !== index ||
      point.kind !== (index === 0 ? "depot" : "order") ||
      identities.has(key)
    )
      throw new DistanceMatrixValidationError("INVALID_MATRIX");
    identities.add(key);
  }
}

export function validateDistanceMatrixRequest(inputHash: string, nodes: unknown) {
  const parsed = nodeOrderSchema.safeParse(nodes);
  if (!digest.safeParse(inputHash).success || !parsed.success)
    throw new DistanceMatrixValidationError("INVALID_MATRIX");
  verifyNodeOrder(parsed.data);
  return parsed.data;
}

export function verifyMatrixProvider(endpoint: string, actualProvider?: MatrixProviderId) {
  if (actualProvider && endpoint !== matrixProviderEndpoints[actualProvider])
    throw new DistanceMatrixValidationError("INTEGRITY");
}

function snapChordM(original: Coordinates, snapped: Coordinates) {
  const vector = ({ latitude, longitude }: Coordinates) => {
    const lat = latitude * (Math.PI / 180);
    const lon = longitude * (Math.PI / 180);
    return [
      Math.cos(lat) * Math.cos(lon),
      Math.cos(lat) * Math.sin(lon),
      Math.sin(lat),
    ];
  };
  const [x, y, z] = vector(original);
  const [a, b, c] = vector(snapped);
  return 6_371_008.8 * Math.hypot(x - a, y - b, z - c);
}

function matrixPreimage(input: MatrixInput) {
  // Field order is part of distance-matrix/v1. Provenance is observational.
  const { options } = input;
  return JSON.stringify({
    version: input.version,
    provider: input.provider,
    profile: input.profile,
    endpoint: input.endpoint,
    options: {
      annotations: options.annotations,
      generateHints: options.generateHints,
      snapRadiusM: options.snapRadiusM,
    },
    unit: input.unit,
    directed: input.directed,
    inputHash: input.inputHash,
    nodeOrder: input.nodeOrder.map(
      ({ index, kind, id, latitude, longitude }) => ({
        index,
        kind,
        id,
        latitude,
        longitude,
      }),
    ),
    matrix: input.matrix,
    snapping: input.snapping.map(({ source, destination }) => ({
      source: {
        longitude: source.longitude,
        latitude: source.latitude,
        distanceM: source.distanceM,
      },
      destination: {
        longitude: destination.longitude,
        latitude: destination.latitude,
        distanceM: destination.distanceM,
      },
    })),
  });
}

export function buildDistanceMatrixSnapshot(
  raw: unknown,
): DistanceMatrixSnapshot {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    throw new DistanceMatrixValidationError(
      parsed.error.issues[0]?.path[0] === "snapping"
        ? "INVALID_SNAP"
        : "INVALID_MATRIX",
    );
  const input = parsed.data;
  const { matrix, nodeOrder, snapping, options } = input;
  const size = nodeOrder.length;
  verifyNodeOrder(nodeOrder);
  verifyMatrixProvider(input.endpoint, input.provenance.actualProvider);
  if (input.provenance.generationMode && !input.provenance.actualProvider)
    throw new DistanceMatrixValidationError("INTEGRITY");
  if (
    matrix.length !== size ||
    matrix.some((row, index) => row.length !== size || row[index] !== 0)
  )
    throw new DistanceMatrixValidationError("INVALID_MATRIX");
  if (
    snapping.length !== size ||
    snapping.some(
      ({ source, destination }, index) =>
        source.longitude !== destination.longitude ||
        source.latitude !== destination.latitude ||
        source.distanceM > options.snapRadiusM ||
        destination.distanceM > options.snapRadiusM ||
        // The chord lower bound rejects a misplaced waypoint. One meter allows
        // for coordinate quantization. It is never used as a matrix cost.
        snapChordM(nodeOrder[index], source) > options.snapRadiusM + 1,
    )
  )
    throw new DistanceMatrixValidationError("INVALID_SNAP");

  const zeroPairs: ZeroPair[] = [];
  for (const [from, row] of matrix.entries())
    for (const [to, value] of row.entries())
      if (from !== to && value === 0)
        zeroPairs.push(Object.freeze({ from, to }));
  return Object.freeze({
    ...input,
    matrixHash: createHash("sha256")
      .update(matrixPreimage(input), "utf8")
      .digest("hex"),
    zeroPairs: Object.freeze(zeroPairs),
    comparisonEligible: zeroPairs.length === 0,
  });
}

export function restoreDistanceMatrixSnapshot(
  raw: unknown,
  expectedHash: unknown,
) {
  const snapshot = buildDistanceMatrixSnapshot(raw);
  if (snapshot.matrixHash !== expectedHash)
    throw new DistanceMatrixValidationError("INTEGRITY");
  return snapshot;
}
