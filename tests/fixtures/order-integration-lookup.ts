import { and, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { createDatabase } from "@/db/client";
import { depots, orders, scenarios } from "@/db/schema";
import type { FixtureLookup } from "./order-integration-fixtures";

type Database = ReturnType<typeof createDatabase>;
const columns = {
  depot: { table: depots, tag: depots.name, parent: null },
  scenario: {
    table: scenarios,
    tag: scenarios.name,
    parent: scenarios.depotId,
  },
  order: { table: orders, tag: orders.orderCode, parent: orders.scenarioId },
};

function scope(entry: Parameters<FixtureLookup>[0]) {
  const { table, tag, parent } = columns[entry.kind];
  if ((parent === null) !== (entry.parentId === null))
    throw Error("Invalid fixture parent scope.");
  const exactTag = sql`BINARY ${tag} = BINARY ${entry.taggedName}`;
  const exactParent =
    parent && entry.parentId !== null
      ? eq(parent, BigInt(entry.parentId))
      : undefined;
  return { table, tag, parent, exactTag, exactParent };
}

const readback = z.object({
  rows: z.tuple([
    z.strictObject({
      row_count: z.enum(["0", "1"]),
      id: z.string().nullable(),
      tagged_name: z.string().nullable(),
      parent_id: z.string().nullable(),
    }),
  ]),
});

export function createOrderFixtureLookup(
  execute: (query: SQL) => Promise<unknown>,
): FixtureLookup {
  return async (entry) => {
    const { table, tag, parent, exactTag, exactParent } = scope(entry);
    // A mandatory aggregate row distinguishes verified absence from a missing
    // response. Known IDs are read without a parent filter to expose mismatches.
    const filter =
      entry.id === null
        ? and(exactTag, exactParent)
        : eq(table.id, BigInt(entry.id));
    const {
      rows: [row],
    } = readback.parse(
      await execute(sql`
      SELECT CAST(COUNT(*) AS CHAR) AS row_count,
        CAST(MIN(id) AS CHAR) AS id, MIN(tagged_name) AS tagged_name,
        CAST(MIN(parent_id) AS CHAR) AS parent_id
      FROM (
        SELECT ${table.id} AS id, ${tag} AS tagged_name, ${parent ?? sql`NULL`} AS parent_id
        FROM ${table} WHERE ${filter} LIMIT 2
      ) AS matched
    `),
    );
    if (
      row.row_count === "0" &&
      row.id === null &&
      row.tagged_name === null &&
      row.parent_id === null
    )
      return [];
    if (row.row_count !== "1" || row.id === null || row.tagged_name === null)
      throw Error("Invalid fixture readback.");
    return [
      { id: row.id, taggedName: row.tagged_name, parentId: row.parent_id },
    ];
  };
}

export async function deleteOrderFixture(
  db: Pick<Database, "delete">,
  entry: Parameters<FixtureLookup>[0] & { id: string },
) {
  const { table, exactTag, exactParent } = scope(entry);
  // Repeat all ownership predicates in the mutation to reject intervening
  // owner or tag changes after the read.
  const result = await db
    .delete(table)
    .where(and(eq(table.id, BigInt(entry.id)), exactTag, exactParent));
  if (result.rowsAffected !== 1) throw Error("Fixture deletion unconfirmed.");
  return result.rowsAffected;
}
