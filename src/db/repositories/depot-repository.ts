import "server-only";
import { asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase, type createDatabase } from "@/db/client";
import { depots } from "@/db/schema";
import { DepotError, depotRow, parseDepotId } from "@/lib/validation/depot";

export type DepotRow = typeof depots.$inferSelect;
export type DepotWrite = Omit<DepotRow, "id">;
export type DepotUpdate = Omit<DepotWrite, "createdAt">;
export type DepotRepository = {
  list: (query: { after?: bigint; limit: number }) => Promise<DepotRow[]>;
  findById: (id: bigint) => Promise<DepotRow | null>;
  insert: (input: DepotWrite) => Promise<bigint>;
  update: (id: bigint, input: DepotUpdate) => Promise<number>;
  remove: (id: bigint) => Promise<number>;
};
// Preserve raw numeric text until validation, before the driver's parseFloat/boolean coercion.
function coordinate(raw: unknown) {
  if (
    typeof raw !== "string" ||
    !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(raw) ||
    !Number.isFinite(Number(raw))
  )
    throw new DepotError("UNAVAILABLE");
  return Number(raw);
}
const projection = {
  id: depots.id,
  name: depots.name,
  address: depots.address,
  latitude: sql<string>`CAST(${depots.latitude} AS CHAR)`.mapWith(coordinate),
  longitude: sql<string>`CAST(${depots.longitude} AS CHAR)`.mapWith(coordinate),
  isActive: sql<string>`CAST(${depots.isActive} AS CHAR)`.mapWith(
    (raw: unknown) => {
      if (raw !== "0" && raw !== "1") throw new DepotError("UNAVAILABLE");
      return raw === "1";
    },
  ),
  createdAt: depots.createdAt,
  updatedAt: depots.updatedAt,
};
function foreignKeyConflict(error: unknown) {
  let current = error;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === "object";
    depth++
  ) {
    const candidate = current as {
      details?: { code?: unknown };
      cause?: unknown;
    };
    if (
      [1451, "1451", "ER_ROW_IS_REFERENCED_2"].includes(
        candidate.details?.code as string | number,
      )
    )
      return true;
    current = candidate.cause;
  }
  return false;
}
const affected = z.object({ rowsAffected: z.number().int().min(0).max(1) });
export function createDepotRepository(
  acquire: () => ReturnType<typeof createDatabase> = getDatabase,
): DepotRepository {
  async function read<T>(
    operation: (db: ReturnType<typeof createDatabase>) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(acquire());
    } catch {
      throw new DepotError("UNAVAILABLE");
    }
  }
  async function mutate<T>(
    operation: (db: ReturnType<typeof createDatabase>) => Promise<T>,
  ): Promise<T> {
    let db: ReturnType<typeof createDatabase>;
    try {
      db = acquire();
    } catch {
      throw new DepotError("UNAVAILABLE");
    }
    try {
      return await operation(db);
    } catch (error) {
      throw new DepotError(
        foreignKeyConflict(error) ? "DEPOT_IN_USE" : "MUTATION_OUTCOME_UNKNOWN",
      );
    }
  }
  return {
    list: (query) =>
      read(async (db) => {
        const rows = await db
          .select(projection)
          .from(depots)
          .where(
            query.after === undefined ? undefined : gt(depots.id, query.after),
          )
          .orderBy(asc(depots.id))
          .limit(query.limit);
        return z.array(depotRow).parse(rows);
      }),
    findById: (id) =>
      read(async (db) => {
        const rows = await db
          .select(projection)
          .from(depots)
          .where(eq(depots.id, id))
          .limit(1);
        if (!rows.length) return null;
        const row = depotRow.parse(rows[0]);
        if (row.id !== id) throw new DepotError("UNAVAILABLE");
        return row;
      }),
    insert: (input) =>
      mutate(async (db) => {
        const result = await db.insert(depots).values(input);
        if (affected.parse(result).rowsAffected !== 1)
          throw new Error("Invalid insert result.");
        return parseDepotId(result.lastInsertId);
      }),
    update: (id, input) =>
      mutate(
        async (db) =>
          affected.parse(
            await db.update(depots).set(input).where(eq(depots.id, id)),
          ).rowsAffected,
      ),
    remove: (id) =>
      mutate(
        async (db) =>
          affected.parse(await db.delete(depots).where(eq(depots.id, id)))
            .rowsAffected,
      ),
  };
}
