import { fileURLToPath } from "node:url";
import { checkServerIdentity } from "node:tls";
import { createConnection } from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

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
 * @param {"Development" | "Testing"} target
 */
export async function runMysqlMigration(loadCredentials, target) {
  let client;
  let connection;
  let failed = false;
  try {
    // Entrypoints enforce their own logical target before connection acquisition.
    const credentials = loadCredentials();
    client = createConnection({
      ...credentials,
      ssl: { rejectUnauthorized: true, verifyIdentity: true },
      connectTimeout: 10000,
      multipleStatements: false,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    client.on("error", () => {
      failed = true;
    });
    // Retain the socket even if the driver rejects the handshake.
    await new Promise((resolve, reject) => {
      client.connect((error) => {
        if (error) reject(error);
        else resolve(undefined);
      });
    });
    const stream = client.stream;
    if (
      failed ||
      stream?.encrypted !== true ||
      stream?.authorized !== true ||
      checkServerIdentity(credentials.host, stream.getPeerCertificate(true))
    )
      throw new Error("Migration TLS verification failed.");

    connection = client.promise();
    // Delegate SQL splitting, SHA-256, timestamp ordering, skip decisions and
    // ledger writes to the same installed Drizzle ORM migrator used by Kit.
    // No custom selection, ledger repair, mutation retry, or rollback engine.
    await migrate(drizzle(connection, { logger: false }), {
      migrationsFolder,
      migrationsTable: "__drizzle_migrations",
    });
  } catch {
    failed = true;
  } finally {
    try {
      if (connection) {
        if (!(await closeConnection(connection))) failed = true;
      } else {
        client?.stream?.destroy();
      }
    } catch {
      failed = true;
    }
  }
  // Driver/Drizzle errors may contain credentials, URLs, binds and SQL. Never
  // log their message, cause or stack; ambiguous/partial outcomes need review.
  if (failed) {
    console.error(
      `${target} migration stopped. Outcome may be unknown; do not retry before reconciliation.`,
    );
    return 1;
  }
  console.info(
    `${target} migration completed. Verify ledger and schema before further work.`,
  );
  return 0;
}
