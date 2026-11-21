import "server-only";
import { sql, type SQL } from "drizzle-orm";
import type { MySqlTable } from "drizzle-orm/mysql-core";
import { z } from "zod";
import type { createDatabase } from "@/db/client";

const existenceResult = z.object({
  types: z.strictObject({ record_exists: z.enum(["CHAR", "VARCHAR"]) }),
  rows: z.tuple([z.strictObject({ record_exists: z.enum(["0", "1"]) })]),
});

export async function readRecordExists(
  db: ReturnType<typeof createDatabase>,
  table: MySqlTable,
  scope: SQL,
) {
  const result = await db.execute(
    sql`select cast(exists(select 1 from ${table} where ${scope}) as char) as record_exists`,
  );
  return existenceResult.parse(result).rows[0].record_exists === "1";
}
