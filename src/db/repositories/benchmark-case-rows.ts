import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  BenchmarkCaseError,
  type BenchmarkCaseSource,
} from "@/application/benchmark-cases/benchmark-case-service";
import {
  benchmarkInputVersion,
  buildBenchmarkInput,
  type BenchmarkInputSnapshot,
} from "@/domain/benchmark-input";
import { depotId } from "@/lib/validation/depot";
import type { BenchmarkHistoryQuery } from "@/lib/validation/benchmark-case";

const jsonObject = z.preprocess(
  (value) => (typeof value === "string" ? JSON.parse(value) : value),
  z.record(z.string(), z.unknown()),
);
const sqlBoolean = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .transform(Boolean);
const sourceRow = z.object({
  source_scenario: jsonObject.nullable(),
  source_depot: jsonObject
    .pipe(z.object({ isActive: sqlBoolean }).passthrough())
    .nullable(),
  source_order: jsonObject.nullable(),
  actual_count: z.string().regex(/^(?:0|[1-9]\d*)$/u),
  active_scenario_id: depotId.nullable(),
});

export function decodeBenchmarkSource(
  raw: unknown,
  scenarioId: string,
): BenchmarkCaseSource {
  const rows = z.array(sourceRow).min(1).parse(raw);
  const first = rows[0];
  if (
    rows.length === 1 &&
    first.source_scenario === null &&
    first.source_depot === null &&
    first.source_order === null &&
    first.actual_count === "0" &&
    first.active_scenario_id === null
  )
    throw new BenchmarkCaseError("NOT_FOUND");

  if (
    !first.source_scenario ||
    first.source_scenario.id !== scenarioId ||
    !first.source_depot
  )
    throw new BenchmarkCaseError("SOURCE_INVALID");

  for (const row of rows) {
    if (
      row.actual_count !== first.actual_count ||
      !isDeepStrictEqual(row.source_scenario, first.source_scenario) ||
      !isDeepStrictEqual(row.source_depot, first.source_depot) ||
      row.active_scenario_id !== first.active_scenario_id
    )
      throw new BenchmarkCaseError("SOURCE_INCOMPLETE");
  }
  if (first.active_scenario_id !== null) {
    throw new BenchmarkCaseError(
      first.active_scenario_id === scenarioId
        ? "DUMMY_OPERATION_PENDING"
        : "SOURCE_INVALID",
    );
  }

  const orders = rows.flatMap((row) =>
    row.source_order === null ? [] : [row.source_order],
  );
  if (
    orders.length.toString() !== first.actual_count ||
    (orders.length > 0 ? rows.length !== orders.length : rows.length !== 1)
  )
    throw new BenchmarkCaseError("SOURCE_INCOMPLETE");

  return { scenario: first.source_scenario, depot: first.source_depot, orders };
}

const count = z.number().int().nonnegative().max(2147483647);
const headerSchema = z.object({
  id: depotId,
  scenarioId: depotId,
  requestId: z.uuid(),
  scenario: jsonObject.pipe(
    z
      .object({ generatorVersion: z.string().min(1).max(64).nullable() })
      .passthrough(),
  ),
  configuredCustomerCount: count,
  actualOrderCount: count.min(1),
  pointCount: count.min(2),
  inputVersion: z.literal(benchmarkInputVersion),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/u),
  frozenAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/u)
    .transform((value) => {
      const [date, fraction = ""] = value.split(".");
      return date.replace(" ", "T") + "." + fraction.padEnd(3, "0") + "Z";
    }),
  gitCommitSha: z
    .string()
    .regex(/^[a-f0-9]{40}$/u)
    .nullish(),
});
const pointSchema = z.object({
  caseId: depotId,
  nodeIndex: count,
  kind: z.enum(["depot", "order"]),
  sourceId: depotId,
  name: z.string(),
  address: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  orderCode: z.string().nullable(),
  orderSource: z.enum(["manual", "dummy"]).nullable(),
  depotActive: sqlBoolean.nullable(),
});
const storedRowSchema = z.object({
  case_header: jsonObject.nullable(),
  case_point: jsonObject.nullable(),
});

export type BenchmarkCaseKey = { requestId: string } | { id: string };

function decodeStored(raw: unknown, key: BenchmarkCaseKey) {
  const rows = z.array(storedRowSchema).min(1).parse(raw);
  if (
    rows.length === 1 &&
    rows[0].case_header === null &&
    rows[0].case_point === null
  ) {
    return null;
  }

  const header = headerSchema.parse(rows[0].case_header);
  if (
    ("requestId" in key
      ? header.requestId !== key.requestId
      : header.id !== key.id) ||
    header.scenario.id !== header.scenarioId ||
    header.pointCount !== header.actualOrderCount + 1 ||
    rows.length !== header.pointCount ||
    rows.some((row) => !isDeepStrictEqual(row.case_header, rows[0].case_header))
  )
    throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");

  const points = rows.map((row) => pointSchema.parse(row.case_point));
  const [depot, ...orders] = points;
  if (
    depot.kind !== "depot" ||
    depot.sourceId !== header.scenario.depotId ||
    depot.depotActive === null ||
    depot.orderCode !== null ||
    depot.orderSource !== null ||
    points.some(
      (point, index) => point.caseId !== header.id || point.nodeIndex !== index,
    )
  )
    throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");

  // Check persisted order before the domain builder has a chance to sort it.
  let previous = BigInt(0);
  for (const order of orders) {
    const sourceId = BigInt(order.sourceId);
    if (
      order.kind !== "order" ||
      sourceId <= previous ||
      order.depotActive !== null ||
      order.orderCode === null ||
      order.orderSource === null
    )
      throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
    previous = sourceId;
  }

  const snapshot = buildBenchmarkInput({
    scenario: {
      ...header.scenario,
      customerCount: header.configuredCustomerCount,
    },
    depot: { ...depot, id: depot.sourceId, isActive: depot.depotActive },
    orders: orders.map((point) => ({
      ...point,
      id: point.sourceId,
      scenarioId: header.scenarioId,
      customerName: point.name,
      source: point.orderSource,
    })),
    provenance: {
      benchmarkCaseId: header.id,
      frozenAt: header.frozenAt,
      ...(header.gitCommitSha ? { gitCommitSha: header.gitCommitSha } : {}),
    },
  });
  if (snapshot.inputHash !== header.inputHash) {
    throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
  }
  return snapshot;
}

export function decodeStoredBenchmarkCase(
  raw: unknown,
  key: BenchmarkCaseKey,
): BenchmarkInputSnapshot | null {
  try {
    return decodeStored(raw, key);
  } catch {
    throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
  }
}

const historyRow = z.object({
  summary: jsonObject
    .pipe(
      headerSchema
        .pick({
          id: true,
          scenarioId: true,
          actualOrderCount: true,
          pointCount: true,
          inputHash: true,
          frozenAt: true,
        })
        .extend({ scenarioName: z.string() }),
    )
    .nullable(),
});

export function decodeBenchmarkHistory(
  raw: unknown,
  query: BenchmarkHistoryQuery,
) {
  try {
    const rows = z
      .array(historyRow)
      .min(1)
      .max(query.limit + 1)
      .parse(raw);
    if (rows.length === 1 && rows[0].summary === null)
      return { data: [], nextCursor: null };
    let previous = query.after === undefined ? undefined : BigInt(query.after);
    const summaries = rows.map(({ summary }) => {
      if (!summary || summary.pointCount !== summary.actualOrderCount + 1)
        throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
      const id = BigInt(summary.id);
      if (previous !== undefined && id >= previous)
        throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
      previous = id;
      return summary;
    });
    const data = summaries.slice(0, query.limit);
    return {
      data,
      nextCursor: summaries.length > query.limit ? data.at(-1)!.id : null,
    };
  } catch {
    throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
  }
}
