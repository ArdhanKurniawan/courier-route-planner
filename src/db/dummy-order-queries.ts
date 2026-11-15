import "server-only";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { assertDepotEnvironment } from "@/config/depot-env";
import { getDatabase } from "@/db/client";
import type { DummyConnection } from "@/db/dummy-order-connection";
import { HttpError } from "@/lib/http/request-security";
import { depotId } from "@/lib/validation/depot";
import {
  dummyOperationVersion,
  MAX_DUMMY_ORDERS,
} from "@/lib/validation/dummy-preview";

const timestamp = z.string().regex(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{6}$/u);
const decimal = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/u)
  .refine((value) => Number.isFinite(Number(value)));
const scenarioRow = z.object({
  id: depotId,
  depotId,
  name: z.string(),
  distributionPattern: z.string(),
  status: z.string(),
  customerCount: z.string(),
  radiusMinM: z.string().nullable(),
  radiusMaxM: z.string().nullable(),
  generationSeed: z.string().nullable(),
  updatedAt: timestamp,
});
const depotRow = z.object({
  id: depotId,
  name: z.string(),
  isActive: z.enum(["0", "1"]),
  latitude: decimal,
  longitude: decimal,
  updatedAt: timestamp,
});
const dummyRow = z.object({
  id: depotId,
  scenarioId: depotId,
  orderCode: z.string().min(1),
  customerName: z.string(),
  address: z.string().nullable(),
  latitude: decimal,
  longitude: decimal,
  createdAt: timestamp,
  updatedAt: timestamp,
  source: z.literal("dummy"),
});
export type DummyOrderRow = z.infer<typeof dummyRow>;
export type DummySnapshot = {
  scenario: z.infer<typeof scenarioRow>;
  depot: z.infer<typeof depotRow> | null;
  orders: DummyOrderRow[];
};

const char = (column: string) => `CAST(${column} AS CHAR)`;
const datetime = (column: string) =>
  `DATE_FORMAT(${column}, '%Y-%m-%d %H:%i:%s.%f')`;
const scenarioFields = {
  id: char("s.id"),
  depotId: char("s.depot_id"),
  name: "s.name",
  distributionPattern: "s.distribution_pattern",
  status: "s.status",
  customerCount: char("s.customer_count"),
  radiusMinM: char("s.radius_min_m"),
  radiusMaxM: char("s.radius_max_m"),
  generationSeed: char("s.generation_seed"),
  updatedAt: datetime("s.updated_at"),
};
const depotFields = {
  id: char("d.id"),
  name: "d.name",
  isActive: char("d.is_active"),
  latitude: char("d.latitude"),
  longitude: char("d.longitude"),
  updatedAt: datetime("d.updated_at"),
};
const orderFields = {
  id: char("o.id"),
  scenarioId: char("o.scenario_id"),
  orderCode: "o.order_code",
  customerName: "o.customer_name",
  address: "o.address",
  latitude: char("o.latitude"),
  longitude: char("o.longitude"),
  createdAt: datetime("o.created_at"),
  updatedAt: datetime("o.updated_at"),
  source: "o.source",
};
const columns = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([alias, source]) => `${source} AS ${alias}`)
    .join(", ");
const jsonColumn = (fields: Record<string, string>, table: string) => {
  const pairs = Object.entries(fields).map(
    ([key, source]) => `'${key}', ${source}`,
  );
  return `IF(${table}.id IS NULL, NULL, CAST(JSON_OBJECT(${pairs.join(", ")}) AS CHAR))`;
};

const scanLimit = MAX_DUMMY_ORDERS + 1;
// mysql2 formats string parameters as quoted text. Explicit casts preserve BIGINT comparisons.
export const signedIdParameter = "CAST(? AS SIGNED)";
const orderScope = `WHERE o.scenario_id = ${signedIdParameter} AND o.source = 'dummy'`;
export const lockScenarioSql = `SELECT ${columns(scenarioFields)} FROM scenarios s WHERE s.id = ${signedIdParameter} FOR UPDATE NOWAIT`;
export const lockDepotSql = `SELECT ${columns(depotFields)} FROM depots d WHERE d.id = ${signedIdParameter} FOR UPDATE NOWAIT`;
export const readDummyOrdersSql = `SELECT ${columns(orderFields)} FROM orders o ${orderScope} ORDER BY o.id LIMIT ${scanLimit}`;
const tooManyDummyOrders = () =>
  new HttpError(409, "DUMMY_LIMIT", "Too many existing dummy Orders.");
const scenarioNotFound = () =>
  new HttpError(404, "NOT_FOUND", "Scenario not found.");

export function parseDummyOrders(raw: unknown, scenarioId: string) {
  const rows = z.array(dummyRow).max(scanLimit).parse(raw);
  if (rows.length > MAX_DUMMY_ORDERS) throw tooManyDummyOrders();
  let previous = BigInt(0);
  for (const row of rows) {
    const id = BigInt(row.id);
    if (row.scenarioId !== scenarioId || id <= previous)
      throw new Error("Unexpected dummy Order identity.");
    previous = id;
  }
  return rows;
}

export function parseLockedScenario(raw: unknown, scenarioId: string) {
  const [scenario] = z.array(scenarioRow).max(1).parse(raw);
  if (!scenario) throw scenarioNotFound();
  if (scenario.id !== scenarioId)
    throw new Error("Unexpected Scenario identity.");
  return scenario;
}

export async function lockDummyScenario(
  connection: DummyConnection,
  scenarioId: string,
) {
  return parseLockedScenario(
    await connection.query(lockScenarioSql, [scenarioId]),
    scenarioId,
  );
}

export function parseLockedDepot(raw: unknown, depotId: string) {
  const [depot] = z.array(depotRow).max(1).parse(raw);
  if (depot && depot.id !== depotId)
    throw new Error("Unexpected Depot identity.");
  return depot ?? null;
}

const previewRows = z.object({
  rows: z
    .array(
      z.strictObject({
        scenario: z.string().nullable(),
        depot: z.string().nullable(),
        dummy: z.string().nullable(),
        operationVersion: dummyOperationVersion,
        operationPending: z.enum(["0", "1"]),
      }),
    )
    .min(1)
    .max(scanLimit),
});

export async function readDummyPreviewSnapshot(
  scenarioId: string,
): Promise<
  DummySnapshot & { operationVersion: string; operationPending: boolean }
> {
  assertDepotEnvironment();
  // Anchor the SELECT so a missing Scenario still produces a validated row.
  // The LEFT JOIN and all projections share a single TiDB snapshot.
  const { rows } = previewRows.parse(
    await getDatabase().execute(sql`
    select ${sql.raw(jsonColumn(scenarioFields, "s"))} as scenario,
      ${sql.raw(jsonColumn(depotFields, "d"))} as depot,
      ${sql.raw(jsonColumn(orderFields, "o"))} as dummy,
      coalesce((select cast(g.operation_version as char) from dummy_order_operations g
        where g.scenario_id = s.id order by g.operation_version desc limit 1), '0') as operationVersion,
      cast(exists(select 1 from dummy_order_operations g where g.active_scenario_id = s.id) as char) as operationPending
    from (select cast(${scenarioId} as signed) as id) as target
    left join scenarios s on s.id = target.id
    left join depots d on d.id = s.depot_id
    left join orders o on o.scenario_id = s.id and o.source = 'dummy'
    order by o.id limit ${sql.raw(String(scanLimit))}
  `),
  );
  const [first] = rows;
  if (
    rows.some(
      (row) =>
        row.scenario !== first.scenario ||
        row.depot !== first.depot ||
        row.operationVersion !== first.operationVersion ||
        row.operationPending !== first.operationPending,
    )
  )
    throw new Error("Inconsistent Scenario snapshot.");
  const absentDummy = rows.some((row) => row.dummy === null);
  if (absentDummy && rows.length !== 1)
    throw new Error("Inconsistent dummy Order snapshot.");
  if (first.scenario === null && (first.depot !== null || !absentDummy))
    throw new Error("Inconsistent missing Scenario snapshot.");
  const scenario = parseLockedScenario(
    first.scenario === null ? [] : [JSON.parse(first.scenario)],
    scenarioId,
  );
  return {
    scenario,
    operationVersion: first.operationVersion,
    operationPending: first.operationPending === "1",
    depot: parseLockedDepot(
      first.depot === null ? [] : [JSON.parse(first.depot)],
      scenario.depotId,
    ),
    orders: parseDummyOrders(
      absentDummy ? [] : rows.map((row) => JSON.parse(row.dummy!)),
      scenarioId,
    ),
  };
}
