import { fileURLToPath } from "node:url";
import { checkServerIdentity } from "node:tls";
import { createConnection } from "mysql2";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

/** @typedef {"environment" | "connection" | "tls" | "migration" | "cleanup"} MigrationPhase */

/**
 * Return fixed labels, never error text, query data, or a driver-provided code.
 * @param {MigrationPhase} phase
 * @param {unknown} [error]
 */
function describeMigrationFailure(phase, error) {
  if (phase === "environment") return { phase, category: "invalid-config" };
  if (phase === "cleanup") return { phase, category: "close-failed" };

  const cause = error instanceof DrizzleQueryError ? error.cause : error;
  const code =
    cause && typeof cause === "object" && "code" in cause ? cause.code : null;

  if (phase === "connection") {
    if (
      code === "HANDSHAKE_SSL_ERROR" ||
      code === "HANDSHAKE_NO_SSL_SUPPORT" ||
      code === "ERR_TLS_CERT_ALTNAME_INVALID" ||
      code === "CERT_HAS_EXPIRED"
    )
      return { phase: "tls", category: "verification-failed" };
    if (code === "ETIMEDOUT") return { phase, category: "timeout" };
    if (code === "ER_ACCESS_DENIED_ERROR")
      return { phase, category: "authentication" };
    return { phase, category: "connect-failed" };
  }
  if (phase === "tls") return { phase, category: "verification-failed" };

  // Drizzle wraps prepared-query failures. The ledger read can also throw a
  // direct mysql2 server error with the driver's errno and SQLSTATE fields.
  if (
    error instanceof DrizzleQueryError ||
    (error &&
      typeof error === "object" &&
      "errno" in error &&
      typeof error.errno === "number" &&
      "sqlState" in error &&
      typeof error.sqlState === "string")
  ) {
    const denied =
      code === "ER_DBACCESS_DENIED_ERROR" ||
      code === "ER_TABLEACCESS_DENIED_ERROR" ||
      code === "ER_COLUMNACCESS_DENIED_ERROR" ||
      code === "ER_SPECIFIC_ACCESS_DENIED_ERROR";
    return {
      phase: "sql",
      category: denied ? "permission-denied" : "query-failed",
    };
  }
  return { phase, category: "migration-failed" };
}

// mysql2 end() can resolve before COM_QUIT has closed the TLS socket. Never
// report completion before close; forced closure is a failure, not success.
async function closeConnection(connection) {
  const stream = connection.connection?.stream;
  if (!stream) return false;
  if (stream.closed === true) return false;
  let onClose;
  let timer;
  const closed = new Promise((resolveClose) => {
    onClose = resolveClose;
    stream.once("close", onClose);
  });
  try {
    try {
      const graceful = await Promise.race([
        Promise.resolve()
          .then(() => connection.end())
          .then(() => closed)
          .then(() => true),
        new Promise((resolveTimeout) => {
          timer = setTimeout(() => resolveTimeout(false), 5000);
        }),
      ]);
      if (graceful) return true;
    } catch {
      // Fall through to transport closure only. Never retry a migration/query.
    } finally {
      clearTimeout(timer);
    }
    stream.destroy();
    await Promise.race([
      closed,
      new Promise((resolveTimeout) => {
        timer = setTimeout(resolveTimeout, 1000);
      }),
    ]);
    return false;
  } finally {
    clearTimeout(timer);
    stream.removeListener("close", onClose);
  }
}

/**
 * @param {() => import("mysql2").ConnectionOptions & {host: string}} loadCredentials
 * @param {"Development" | "Testing" | "Production"} target
 */
export async function runMysqlMigration(loadCredentials, target) {
  let client;
  let connection;
  let failure;
  /** @type {MigrationPhase} */
  let phase = "environment";
  try {
    // Entrypoints enforce their own logical target before connection acquisition.
    const credentials = loadCredentials();
    phase = "connection";
    client = createConnection({
      ...credentials,
      ssl: { rejectUnauthorized: true, verifyIdentity: true },
      connectTimeout: 10000,
      multipleStatements: false,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    client.on("error", (error) => {
      failure ??= describeMigrationFailure(phase, error);
    });
    // Retain the socket even if the driver rejects the handshake.
    await new Promise((resolve, reject) => {
      client.connect((error) => {
        if (error) reject(error);
        else resolve(undefined);
      });
    });
    phase = "tls";
    const stream = client.stream;
    if (
      failure ||
      stream?.encrypted !== true ||
      stream?.authorized !== true ||
      checkServerIdentity(credentials.host, stream.getPeerCertificate(true))
    )
      throw new Error("Migration TLS verification failed.");

    phase = "migration";
    connection = client.promise();
    // Delegate SQL splitting, SHA-256, timestamp ordering, skip decisions and
    // ledger writes to the same installed Drizzle ORM migrator used by Kit.
    // No custom selection, ledger repair, mutation retry, or rollback engine.
    await migrate(drizzle(connection, { logger: false }), {
      migrationsFolder,
      migrationsTable: "__drizzle_migrations",
    });
  } catch (error) {
    failure ??= describeMigrationFailure(phase, error);
  } finally {
    phase = "cleanup";
    try {
      if (connection) {
        if (!(await closeConnection(connection)))
          failure ??= describeMigrationFailure(phase);
      } else {
        client?.stream?.destroy();
      }
    } catch (error) {
      failure ??= describeMigrationFailure(phase, error);
    }
  }
  // Driver/Drizzle errors may contain credentials, URLs, binds and SQL. Never
  // log their message, cause or stack; ambiguous/partial outcomes need review.
  if (failure) {
    console.error(
      `${target} migration stopped (phase=${failure.phase} category=${failure.category}). Do not retry before reconciliation.`,
    );
    return 1;
  }
  console.info(
    `${target} migration completed. Verify ledger and schema before further work.`,
  );
  return 0;
}
