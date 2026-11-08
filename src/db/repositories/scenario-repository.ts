import "server-only";
import { and, asc, eq, exists, gt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase, type createDatabase } from "@/db/client";
import { depots, orders, scenarios } from "@/db/schema";
import {
  ScenarioError,
  parseScenarioId,
  scenarioRow,
} from "@/lib/validation/scenario";

export type ScenarioRow = z.infer<typeof scenarioRow>;
export type ScenarioWrite = Omit<ScenarioRow, "id">;
export type ScenarioUpdate = Omit<ScenarioWrite, "createdAt" | "status">;
export type ScenarioRepository = {
  list: (query: { after?: bigint; limit: number }) => Promise<ScenarioRow[]>;
  findById: (id: bigint) => Promise<ScenarioRow | null>;
  insert: (input: ScenarioWrite) => Promise<bigint>;
  update: (id: bigint, input: ScenarioUpdate) => Promise<number>;
  remove: (id: bigint) => Promise<number>;
};
function integer(raw: unknown): number {
  if (
    typeof raw !== "string" ||
    !/^(?:0|[1-9]\d*)$/u.test(raw) ||
    Number(raw) > 2147483647
  )
    throw new ScenarioError("UNAVAILABLE");
  return Number(raw);
}
const projection = {
  id: scenarios.id,
  depotId: scenarios.depotId,
  name: scenarios.name,
  distributionPattern: scenarios.distributionPattern,
  customerCount: sql<string>`CAST(${scenarios.customerCount} AS CHAR)`.mapWith(
    integer,
  ),
  radiusMinM: sql<string>`CAST(${scenarios.radiusMinM} AS CHAR)`.mapWith(
    integer,
  ),
  radiusMaxM: sql<string>`CAST(${scenarios.radiusMaxM} AS CHAR)`.mapWith(
    integer,
  ),
  generationSeed: scenarios.generationSeed,
  status: scenarios.status,
  createdAt: scenarios.createdAt,
  updatedAt: scenarios.updatedAt,
};
const affected = z.object({ rowsAffected: z.number().int().min(0).max(1) });
function sqlCode(error: unknown) {
  let value = error;
  for (
    let depth = 0;
    depth < 4 && value && typeof value === "object";
    depth++
  ) {
    const part = value as { details?: { code?: unknown }; cause?: unknown };
    if (
      [1451, "1451", "ER_ROW_IS_REFERENCED_2"].includes(
        part.details?.code as string | number,
      )
    )
      return "SCENARIO_IN_USE";
    if (
      [1452, "1452", "ER_NO_REFERENCED_ROW_2"].includes(
        part.details?.code as string | number,
      )
    )
      return "INVALID_DEPOT";
    value = part.cause;
  }
}
export function createScenarioRepository(
  acquire: () => ReturnType<typeof createDatabase> = getDatabase,
): ScenarioRepository {
  async function read<T>(
    operation: (db: ReturnType<typeof createDatabase>) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(acquire());
    } catch {
      throw new ScenarioError("UNAVAILABLE");
    }
  }
  async function write<T>(
    operation: (db: ReturnType<typeof createDatabase>) => Promise<T>,
  ): Promise<T> {
    let db: ReturnType<typeof createDatabase>;
    try {
      db = acquire();
    } catch {
      throw new ScenarioError("UNAVAILABLE");
    }
    try {
      return await operation(db);
    } catch (error) {
      if (error instanceof ScenarioError && error.code === "INVALID_DEPOT")
        throw error;
      throw new ScenarioError(sqlCode(error) ?? "MUTATION_OUTCOME_UNKNOWN");
    }
  }
  return {
    list: (query) =>
      read(async (db) =>
        z.array(scenarioRow).parse(
          await db
            .select(projection)
            .from(scenarios)
            .where(
              query.after === undefined
                ? undefined
                : gt(scenarios.id, query.after),
            )
            .orderBy(asc(scenarios.id))
            .limit(query.limit),
        ),
      ),
    findById: (id) =>
      read(async (db) => {
        const rows = await db
          .select(projection)
          .from(scenarios)
          .where(eq(scenarios.id, id))
          .limit(1);
        if (!rows.length) return null;
        const row = scenarioRow.parse(rows[0]);
        if (row.id !== id) throw new ScenarioError("UNAVAILABLE");
        return row;
      }),
    insert: (input) =>
      write(async (db) => {
        // NULL requests the auto id; the active-parent check and write are atomic.
        const result = await db.insert(scenarios).select(
          db
            .select({
              id: sql<bigint>`NULL`.as("id"),
              depotId:
                sql<bigint>`${sql.param(input.depotId, scenarios.depotId)}`.as(
                  "depotId",
                ),
              name: sql<string>`${input.name}`.as("name"),
              distributionPattern: sql<string>`${input.distributionPattern}`.as(
                "distributionPattern",
              ),
              customerCount: sql<number>`${input.customerCount}`.as(
                "customerCount",
              ),
              radiusMinM: sql<number | null>`${input.radiusMinM}`.as(
                "radiusMinM",
              ),
              radiusMaxM: sql<number | null>`${input.radiusMaxM}`.as(
                "radiusMaxM",
              ),
              generationSeed: sql<
                bigint | null
              >`${sql.param(input.generationSeed, scenarios.generationSeed)}`.as(
                "generationSeed",
              ),
              status: sql<string>`${input.status}`.as("status"),
              createdAt:
                sql<Date>`${sql.param(input.createdAt, scenarios.createdAt)}`.as(
                  "createdAt",
                ),
              updatedAt:
                sql<Date>`${sql.param(input.updatedAt, scenarios.updatedAt)}`.as(
                  "updatedAt",
                ),
            })
            .from(depots)
            .where(
              and(eq(depots.id, input.depotId), eq(depots.isActive, true)),
            ),
        );
        if (affected.parse(result).rowsAffected === 0)
          throw new ScenarioError("INVALID_DEPOT");
        return parseScenarioId(result.lastInsertId);
      }),
    update: (id, input) =>
      write(async (db) => {
        const active = db
          .select({ id: depots.id })
          .from(depots)
          .where(and(eq(depots.id, input.depotId), eq(depots.isActive, true)));
        return affected.parse(
          await db
            .update(scenarios)
            .set(input)
            .where(
              and(
                eq(scenarios.id, id),
                or(eq(scenarios.depotId, input.depotId), exists(active)),
              ),
            ),
        ).rowsAffected;
      }),
    remove: async (id) => {
      const result = await read(async (db) => {
        const value = await db.execute(
          sql`select cast(exists(select 1 from ${orders} where ${orders.scenarioId} = ${id} limit 1) as char) as has_reference`,
        );
        return (
          z
            .object({
              rows: z.tuple([
                z.object({ has_reference: z.enum(["0", "1"]) }).strict(),
              ]),
            })
            .parse(value).rows[0].has_reference === "1"
        );
      });
      if (result) throw new ScenarioError("SCENARIO_IN_USE");
      // RESTRICT remains authoritative if a child appears after this precheck.
      return write(
        async (db) =>
          affected.parse(await db.delete(scenarios).where(eq(scenarios.id, id)))
            .rowsAffected,
      );
    },
  };
}
