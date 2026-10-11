import "server-only";
import { connect, type Config } from "@tidbcloud/serverless";
import { drizzle } from "drizzle-orm/tidb-serverless";
import { z } from "zod";
import { parseDatabaseConfig } from "@/config/db-env";
import * as schema from "./schema";

type DatabaseFetch = NonNullable<Config["fetch"]>;

// Validate the HTTP wire result before the driver's lossy row/int conversion.
const wireResult = z
  .object({
    types: z
      .array(z.object({ name: z.string().min(1), type: z.string().min(1) }))
      .nullish(),
    rows: z.array(z.array(z.string().nullable())).nullish(),
  })
  .refine(({ types, rows }) => {
    const fields = types ?? [];
    return (
      new Set(fields.map((field) => field.name)).size === fields.length &&
      (rows ?? []).every(
        (row) =>
          row.length === fields.length &&
          row.every(
            (value, index) =>
              value === null ||
              !["INT", "UNSIGNED INT"].includes(fields[index].type) ||
              /^-?\d+$/u.test(value),
          ),
      )
    );
  });

export class DatabaseTransportError extends Error {
  constructor() {
    super("Database operation unavailable.");
    this.name = "DatabaseTransportError";
  }
}

export function createDatabase(
  rawUrl: unknown,
  transport: DatabaseFetch = fetch,
) {
  const config = parseDatabaseConfig(rawUrl);
  const boundedFetch: DatabaseFetch = async (input, init) => {
    // The same fresh signal remains attached while the driver reads the body.
    const signal = AbortSignal.timeout(5000);
    try {
      const response = await transport(input, {
        ...init,
        signal,
      } as RequestInit & NonNullable<Parameters<DatabaseFetch>[1]>);
      const read = async <T>(operation: () => Promise<T>) => {
        try {
          return await operation();
        } catch {
          throw new DatabaseTransportError();
        }
      };
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        json: () =>
          read(async () => {
            const payload: unknown = await response.json();
            if (response.ok && !wireResult.safeParse(payload).success)
              throw new DatabaseTransportError();
            return payload;
          }),
        text: () => read(() => response.text()),
      };
    } catch {
      throw new DatabaseTransportError();
    }
  };
  const connection = connect({
    url: config.url,
    fetch: boundedFetch,
    debug: false,
  });
  return drizzle(connection, { schema, logger: false });
}

export function getDatabase() {
  return createDatabase(process.env.DATABASE_URL);
}
