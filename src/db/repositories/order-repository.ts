import "server-only";
import { and, asc, eq, gt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase, type createDatabase } from "@/db/client";
import { orders, scenarios } from "@/db/schema";
import {
  OrderError,
  orderRow,
  parseOrderId,
  type OrderRow,
} from "@/lib/validation/order";

export type OrderWrite = Omit<OrderRow, "id" | "scenarioId">;
export type OrderUpdate = Omit<OrderWrite, "source" | "createdAt">;
export type OrderRepository = {
  hasScenario: (scenarioId: bigint) => Promise<boolean>;
  list: (
    scenarioId: bigint,
    query: { after?: bigint; limit: number },
  ) => Promise<OrderRow[]>;
  count: (scenarioId: bigint) => Promise<bigint>;
  findById: (scenarioId: bigint, id: bigint) => Promise<OrderRow | null>;
  insert: (scenarioId: bigint, input: OrderWrite) => Promise<bigint>;
  update: (
    scenarioId: bigint,
    id: bigint,
    input: OrderUpdate,
  ) => Promise<number>;
  remove: (scenarioId: bigint, id: bigint) => Promise<number>;
};
const affected = z.object({ rowsAffected: z.number().int().min(0).max(1) });
const flag = z.object({
  rows: z.tuple([z.object({ has_reference: z.enum(["0", "1"]) }).strict()]),
});
const orderExistenceResult = flag.extend({
  types: z.strictObject({ has_reference: z.enum(["CHAR", "VARCHAR"]) }),
});
const countResult = z.object({
  rows: z.tuple([
    z
      .object({
        total: z
          .string()
          .max(20)
          .regex(/^(?:0|[1-9]\d*)$/u),
      })
      .strict(),
  ]),
});
function coordinate(raw: unknown) {
  if (
    typeof raw !== "string" ||
    !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(raw) ||
    !Number.isFinite(Number(raw))
  )
    throw new OrderError("UNAVAILABLE");
  return Number(raw);
}
const projection = {
  id: orders.id,
  scenarioId: orders.scenarioId,
  orderCode: orders.orderCode,
  customerName: orders.customerName,
  address: orders.address,
  latitude: sql<string>`CAST(${orders.latitude} AS CHAR)`.mapWith(coordinate),
  longitude: sql<string>`CAST(${orders.longitude} AS CHAR)`.mapWith(coordinate),
  source: orders.source,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
};
function sqlCode(error: unknown) {
  let value = error;
  for (
    let depth = 0;
    depth < 4 && value && typeof value === "object";
    depth++
  ) {
    const part = value as { details?: { code?: unknown }; cause?: unknown };
    if (
      [1062, "1062", "ER_DUP_ENTRY"].includes(
        part.details?.code as string | number,
      )
    )
      return "ORDER_CODE_CONFLICT" as const;
    if (
      [1452, "1452", "ER_NO_REFERENCED_ROW_2"].includes(
        part.details?.code as string | number,
      )
    )
      return "NOT_FOUND" as const;
    value = part.cause;
  }
}
export function createOrderRepository(
  acquire: () => ReturnType<typeof createDatabase> = getDatabase,
): OrderRepository {
  async function read<T>(
    operation: (db: ReturnType<typeof createDatabase>) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(acquire());
    } catch {
      throw new OrderError("UNAVAILABLE");
    }
  }
  async function write<T>(
    operation: (db: ReturnType<typeof createDatabase>) => Promise<T>,
  ): Promise<T> {
    let db: ReturnType<typeof createDatabase>;
    try {
      db = acquire();
    } catch {
      throw new OrderError("UNAVAILABLE");
    }
    try {
      return await operation(db);
    } catch (error) {
      if (error instanceof OrderError) throw error;
      throw new OrderError(sqlCode(error) ?? "MUTATION_OUTCOME_UNKNOWN");
    }
  }
  async function duplicate(scenarioId: bigint, code: string, exclude?: bigint) {
    const found = await read(async (db) => {
      // Equality uses the column's explicit Unicode CI collation, including accents.
      const query = db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.scenarioId, scenarioId),
            eq(orders.orderCode, code),
            exclude === undefined ? undefined : ne(orders.id, exclude),
          ),
        );
      return (
        flag.parse(
          await db.execute(
            sql`select cast(exists(${query}) as char) as has_reference`,
          ),
        ).rows[0].has_reference === "1"
      );
    });
    if (found) throw new OrderError("ORDER_CODE_CONFLICT");
  }
  return {
    hasScenario: (scenarioId) =>
      read(async (db) => {
        const rows = await db
          .select({ id: scenarios.id })
          .from(scenarios)
          .where(eq(scenarios.id, scenarioId))
          .limit(1);
        if (!rows.length) return false;
        if (rows.length !== 1 || rows[0].id !== scenarioId)
          throw new OrderError("UNAVAILABLE");
        return true;
      }),
    list: (scenarioId, query) =>
      read(async (db) => {
        const rows = z
          .array(orderRow)
          .max(query.limit)
          .parse(
            await db
              .select(projection)
              .from(orders)
              .where(
                and(
                  eq(orders.scenarioId, scenarioId),
                  query.after === undefined
                    ? undefined
                    : gt(orders.id, query.after),
                ),
              )
              .orderBy(asc(orders.id))
              .limit(query.limit),
          );
        let previous = query.after ?? BigInt("0");
        for (const row of rows) {
          if (row.scenarioId !== scenarioId || row.id <= previous)
            throw new OrderError("UNAVAILABLE");
          previous = row.id;
        }
        return rows;
      }),
    count: (scenarioId) =>
      read(async (db) => {
        const result = countResult.parse(
          await db.execute(
            sql`select cast(count(*) as char) as total from ${orders} where ${orders.scenarioId} = ${scenarioId}`,
          ),
        );
        const value = BigInt(result.rows[0].total);
        if (value > BigInt("18446744073709551615")) throw new OrderError("UNAVAILABLE");
        return value;
      }),
    findById: (scenarioId, id) =>
      read(async (db) => {
        const scope = and(eq(orders.scenarioId, scenarioId), eq(orders.id, id));
        // EXISTS returns one flag even when a scoped SELECT would have no rows.
        const { has_reference: exists } = orderExistenceResult.parse(
          await db.execute(
            sql`select cast(exists(select 1 from ${orders} where ${scope} limit 1) as char) as has_reference`,
          ),
        ).rows[0];
        if (exists === "0") return null;

        const [row] = z.tuple([orderRow]).parse(
          await db.select(projection).from(orders).where(scope).limit(1),
        );
        if (row.id !== id || row.scenarioId !== scenarioId)
          throw new OrderError("UNAVAILABLE");
        return row;
      }),
    insert: async (scenarioId, input) => {
      await duplicate(scenarioId, input.orderCode);
      return write(async (db) => {
        const result = await db.insert(orders).select(
          db
            .select({
              id: sql<bigint>`NULL`.as("id"),
              scenarioId:
                sql<bigint>`${sql.param(scenarioId, orders.scenarioId)}`.as(
                  "scenarioId",
                ),
              orderCode: sql<string>`${input.orderCode}`.as("orderCode"),
              customerName: sql<string>`${input.customerName}`.as(
                "customerName",
              ),
              address: sql<string | null>`${input.address}`.as("address"),
              latitude: sql<number>`${input.latitude}`.as("latitude"),
              longitude: sql<number>`${input.longitude}`.as("longitude"),
              source: sql<"manual" | "dummy">`${input.source}`.as("source"),
              createdAt:
                sql<Date>`${sql.param(input.createdAt, orders.createdAt)}`.as(
                  "createdAt",
                ),
              updatedAt:
                sql<Date>`${sql.param(input.updatedAt, orders.updatedAt)}`.as(
                  "updatedAt",
                ),
            })
            .from(scenarios)
            .where(eq(scenarios.id, scenarioId)),
        );
        if (affected.parse(result).rowsAffected === 0)
          throw new OrderError("NOT_FOUND");
        return parseOrderId(result.lastInsertId);
      });
    },
    update: async (scenarioId, id, input) => {
      await duplicate(scenarioId, input.orderCode, id);
      return write(
        async (db) =>
          affected.parse(
            await db
              .update(orders)
              .set({
                orderCode: input.orderCode,
                customerName: input.customerName,
                address: input.address,
                latitude: input.latitude,
                longitude: input.longitude,
                updatedAt: input.updatedAt,
              })
              .where(and(eq(orders.scenarioId, scenarioId), eq(orders.id, id))),
          ).rowsAffected,
      );
    },
    remove: (scenarioId, id) =>
      write(
        async (db) =>
          affected.parse(
            await db
              .delete(orders)
              .where(and(eq(orders.scenarioId, scenarioId), eq(orders.id, id))),
          ).rowsAffected,
      ),
  };
}
