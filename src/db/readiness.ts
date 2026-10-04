import "server-only";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { DatabaseConfigError } from "@/config/db-env";
import { getDatabase } from "./client";

// The pinned driver keeps BIGINT as text; never coerce it through JS Number.
const probeResult = z.union([
  z.object({
    types: z.object({ ok: z.enum(["INT", "UNSIGNED INT"]) }).strict(),
    rows: z.array(z.object({ ok: z.literal(1) }).strict()).length(1),
  }),
  z.object({
    types: z.object({ ok: z.enum(["BIGINT", "UNSIGNED BIGINT"]) }).strict(),
    rows: z.array(z.object({ ok: z.literal("1") }).strict()).length(1),
  }),
]);
type DatabaseProbe = Pick<ReturnType<typeof getDatabase>, "execute">;

export async function checkDatabaseReadiness(
  acquire: () => DatabaseProbe = getDatabase,
): Promise<{ status: "ok" | "error" }> {
  let db: DatabaseProbe;
  try {
    db = acquire();
  } catch (error) {
    if (error instanceof DatabaseConfigError) return { status: "error" };
    throw error;
  }
  // The client bounds the HTTP request and body with a fresh 5-second signal.
  // Provider/transport/decoding details stop at this infrastructure boundary.
  try {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    return { status: probeResult.safeParse(result).success ? "ok" : "error" };
  } catch {
    return { status: "error" };
  }
}
