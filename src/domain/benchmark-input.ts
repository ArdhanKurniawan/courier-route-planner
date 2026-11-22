import { createHash } from "node:crypto";
import { z } from "zod";

export const benchmarkInputVersion = "benchmark-case-input/v1";

const maxSignedId = BigInt("9223372036854775807");
const minSignedSeed = BigInt("-9223372036854775808");

const id = z
  .string()
  .refine(
    (value) => /^[1-9]\d{0,18}$/u.test(value) && BigInt(value) <= maxSignedId,
    "Expected a canonical positive signed BIGINT string.",
  );
const seed = z.string().refine((value) => {
  if (!/^(?:0|-?[1-9]\d{0,18})$/u.test(value)) return false;
  const parsed = BigInt(value);
  return parsed >= minSignedSeed && parsed <= maxSignedId;
}, "Expected a canonical signed BIGINT string.");

const normalizeZero = (value: number) => (value === 0 ? 0 : value);
const nonnegativeInt = z
  .number()
  .int()
  .min(0)
  .max(2147483647)
  .transform(normalizeZero);
const coordinates = {
  latitude: z.number().finite().min(-90).max(90).transform(normalizeZero),
  longitude: z.number().finite().min(-180).max(180).transform(normalizeZero),
};
const scenarioSchema = z
  .object({
    id,
    depotId: id,
    name: z.string(),
    distributionPattern: z.enum([
      "random",
      "clustered",
      "circular",
      "directional",
    ]),
    customerCount: nonnegativeInt,
    radiusMinM: nonnegativeInt.nullable(),
    radiusMaxM: nonnegativeInt.nullable(),
    generationSeed: seed.nullable(),
    generatorVersion: z.string().min(1).max(64).nullable().default(null),
    status: z.literal("draft"),
  })
  .refine(
    ({ radiusMinM, radiusMaxM }) =>
      radiusMinM === null || radiusMaxM === null || radiusMinM <= radiusMaxM,
    {
      path: ["radiusMaxM"],
      message: "Maximum radius must cover minimum radius.",
    },
  );
const depotSchema = z.object({
  id,
  name: z.string(),
  address: z.string().nullable(),
  ...coordinates,
  isActive: z.boolean(),
});
const orderSchema = z.object({
  id,
  scenarioId: id,
  orderCode: z.string(),
  customerName: z.string(),
  address: z.string().nullable(),
  ...coordinates,
  source: z.enum(["manual", "dummy"]),
});
const provenanceSchema = z.object({
  frozenAt: z.iso.datetime().optional(),
  benchmarkCaseId: id.optional(),
  gitCommitSha: z
    .string()
    .regex(/^[a-f0-9]{40}$/u)
    .optional(),
});
const sourceSchema = z.object({
  scenario: scenarioSchema,
  depot: depotSchema,
  orders: z.array(orderSchema).min(1, "Freeze requires at least one Order."),
  provenance: provenanceSchema.optional(),
});

type ScenarioSnapshot = Readonly<
  Omit<z.output<typeof scenarioSchema>, "customerCount">
>;
type DepotNode = Readonly<
  z.output<typeof depotSchema> & { index: 0; kind: "depot" }
>;
type OrderNode = Readonly<
  z.output<typeof orderSchema> & { index: number; kind: "order" }
>;

export type BenchmarkInputSnapshot = Readonly<{
  version: typeof benchmarkInputVersion;
  scenario: ScenarioSnapshot;
  configuredCustomerCount: number;
  actualOrderCount: number;
  pointCount: number;
  nodes: readonly [DepotNode, ...OrderNode[]];
  provenance: Readonly<z.output<typeof provenanceSchema>>;
  canonicalInput: string;
  inputHash: string;
}>;

function serializeCanonicalInput(
  scenario: ScenarioSnapshot,
  configuredCustomerCount: number,
  nodes: BenchmarkInputSnapshot["nodes"],
) {
  // The v1 preimage uses these literal key orders and the frozen node order.
  return JSON.stringify({
    version: benchmarkInputVersion,
    scenario: {
      id: scenario.id,
      depotId: scenario.depotId,
      distributionPattern: scenario.distributionPattern,
      configuredCustomerCount,
      radiusMinM: scenario.radiusMinM,
      radiusMaxM: scenario.radiusMaxM,
      generationSeed: scenario.generationSeed,
      generatorVersion: scenario.generatorVersion,
    },
    nodes: nodes.map(({ index, kind, id, latitude, longitude }) => ({
      index,
      kind,
      id,
      latitude,
      longitude,
    })),
  });
}

export function buildBenchmarkInput(input: unknown): BenchmarkInputSnapshot {
  const {
    scenario: { customerCount: configuredCustomerCount, ...scenarioFields },
    depot,
    orders,
    provenance,
  } = sourceSchema.parse(input);
  if (scenarioFields.depotId !== depot.id) {
    throw new Error("DEPOT_ID_MISMATCH");
  }

  const seen = new Set<string>();
  for (const order of orders) {
    if (order.scenarioId !== scenarioFields.id) {
      throw new Error("ORDER_SCENARIO_MISMATCH");
    }
    if (seen.has(order.id)) {
      throw new Error("DUPLICATE_ORDER_ID");
    }
    seen.add(order.id);
  }
  // Zod parses a new array. Positive canonical decimals sort numerically by
  // digit count first, then lexically, preserving IDs above Number.MAX_SAFE_INTEGER.
  orders.sort((left, right) => {
    const lengthDifference = left.id.length - right.id.length;
    if (lengthDifference !== 0) return lengthDifference;
    if (left.id === right.id) return 0;
    return left.id < right.id ? -1 : 1;
  });

  const scenario = Object.freeze(scenarioFields);
  const nodes: BenchmarkInputSnapshot["nodes"] = Object.freeze([
    Object.freeze({ ...depot, index: 0, kind: "depot" }),
    ...orders.map((order, position) =>
      Object.freeze({ ...order, index: position + 1, kind: "order" as const }),
    ),
  ]);
  const canonicalInput = serializeCanonicalInput(
    scenario,
    configuredCustomerCount,
    nodes,
  );

  return Object.freeze({
    version: benchmarkInputVersion,
    scenario,
    configuredCustomerCount,
    actualOrderCount: orders.length,
    pointCount: nodes.length,
    nodes,
    provenance: Object.freeze(provenance ?? {}),
    canonicalInput,
    inputHash: createHash("sha256")
      .update(canonicalInput, "utf8")
      .digest("hex"),
  });
}
