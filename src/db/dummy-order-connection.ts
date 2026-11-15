import "server-only";
import { tracingChannel } from "node:diagnostics_channel";
import { isIP } from "node:net";
import type { TLSSocket } from "node:tls";
import { createConnection, type ConnectionOptions } from "mysql2";
import type { Connection as PromiseConnection } from "mysql2/promise";
import { z } from "zod";
import { assertDepotEnvironment } from "@/config/depot-env";
import { parseDatabaseConfig } from "@/config/db-env";
import { DatabaseTransportError } from "@/db/client";

type Parameter = string | number | null;
export type DummyConnection = {
  query: (sql: string, values?: Parameter[]) => Promise<unknown>;
  close: () => Promise<void>;
  destroy: () => void;
};

const connectTimeout = 3000;
const statementTimeout = 2000;
const databaseTracing = ["mysql2:connect", "mysql2:query"].map(tracingChannel);
function assertPrivateTransport() {
  if (databaseTracing.some((channel) => channel.hasSubscribers))
    throw new DatabaseTransportError();
}
const enabled = z.union([z.literal(1), z.literal("1")]);
const session = z.tuple([
  z.object({
    db: z.string(),
    principal: z.string(),
    foreignKeys: enabled,
    autocommit: enabled,
    sqlMode: z.string(),
  }),
]);

function isApplicationGrantSet(raw: unknown, database: string) {
  const grants = z.array(z.record(z.string(), z.string())).min(1).parse(raw);
  const scope = "`" + database.replaceAll("_", "\\_") + "`.*";
  const expected = ["DELETE", "INSERT", "SELECT", "UPDATE"];
  let found = false;
  for (const row of grants) {
    const entries = Object.values(row);
    if (entries.length !== 1 || /WITH GRANT OPTION/i.test(entries[0]))
      return false;
    const grant = /^GRANT (.+) ON (\S+) TO .+$/i.exec(entries[0]);
    if (!grant) return false;
    const [, privileges, target] = grant;
    if (privileges === "USAGE" && target === "*.*") continue;
    if (
      found ||
      target !== scope ||
      privileges.split(/,\s*/).sort().join(",") !== expected.join(",")
    )
      return false;
    found = true;
  }
  return found;
}

function databaseOptions(): ConnectionOptions & {
  database: string;
  user: string;
} {
  // Production promotion requires separate acceptance of the deployed writer.
  if (
    process.env.APP_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  )
    throw new DatabaseTransportError();
  assertDepotEnvironment();
  const url = new URL(parseDatabaseConfig(process.env.DATABASE_URL).url);
  if (isIP(url.hostname)) throw new DatabaseTransportError();
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, verifyIdentity: true },
    connectTimeout,
    charset: "UTF8MB4_UNICODE_CI",
    flags: ["-LOCAL_FILES"],
    debug: false,
    trace: false,
    multipleStatements: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
  };
}

async function waitForHandshake(connection: PromiseConnection) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      connection.connect(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new DatabaseTransportError()),
          connectTimeout,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function openDummyConnection(): Promise<DummyConnection> {
  let abort: (() => void) | undefined;
  try {
    assertPrivateTransport();
    const options = databaseOptions();
    // Keep ownership of the transport even when the Promise handshake rejects.
    const core = createConnection(options);
    const socket = () => (core as typeof core & { stream?: TLSSocket }).stream;
    let destroyed = false;
    const destroy = () => {
      if (destroyed) return;
      destroyed = true;
      const current = socket();
      if (current) current.destroy();
      else core.destroy();
    };
    abort = destroy;
    core.on("error", destroy);
    const connection = core.promise();
    await waitForHandshake(connection);
    const secure = socket();
    if (destroyed || secure?.encrypted !== true || secure.authorized !== true)
      throw new DatabaseTransportError();
    const query = async (sql: string, values: Parameter[] = []) => {
      if (destroyed) throw new DatabaseTransportError();
      assertPrivateTransport();
      try {
        const [result] = await connection.query(
          { sql, timeout: statementTimeout },
          values,
        );
        return result;
      } catch (error) {
        const driver = error as { fatal?: unknown; code?: unknown } | undefined;
        if (
          driver?.fatal === true ||
          (typeof driver?.code === "string" &&
            driver.code.startsWith("PROTOCOL_"))
        ) {
          // mysql2's statement timeout reports an error without cancelling the command.
          destroy();
        }
        throw error;
      }
    };
    const [identity] = session.parse(
      await query(
        "SELECT DATABASE() AS db, CURRENT_USER() AS principal, @@SESSION.foreign_key_checks AS foreignKeys, @@SESSION.autocommit AS autocommit, @@SESSION.sql_mode AS sqlMode",
      ),
    );
    if (
      identity.db !== options.database ||
      identity.principal.slice(0, identity.principal.lastIndexOf("@")) !==
        options.user ||
      identity.sqlMode
        .split(",")
        .some((mode) => mode.trim().toUpperCase() === "NO_BACKSLASH_ESCAPES") ||
      !isApplicationGrantSet(await query("SHOW GRANTS"), options.database)
    )
      throw new DatabaseTransportError();
    return {
      query,
      close: async () => {
        if (!destroyed) await connection.end();
      },
      destroy,
    };
  } catch {
    abort?.();
    throw new DatabaseTransportError();
  }
}
