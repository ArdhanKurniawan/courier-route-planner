import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { tracingChannel } from "node:diagnostics_channel";
import { isIP } from "node:net";
import { checkServerIdentity, type TLSSocket } from "node:tls";
import { createConnection, type Connection } from "mysql2";
import type { Connection as PromiseConnection } from "mysql2/promise";
import { z } from "zod";
import { parseDatabaseConfig } from "@/config/db-env";
import { HttpError } from "@/lib/http/request-security";

const database = "courier_route_planner_testing";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/u;
const commitSha = /^[0-9a-f]{40}$/u;
const databaseTracing = ["mysql2:connect", "mysql2:query"].map(tracingChannel);
const approvalSchema = z.strictObject({
  projectId: z.string().regex(/^prj_[A-Za-z0-9]+$/u),
  host: z
    .string()
    .max(253)
    .regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/u),
  port: z.number().int().min(1).max(65535),
  username: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[^@\s\p{Cc}]+$/u),
  principal: z
    .string()
    .max(512)
    .regex(/^[^@\s\p{Cc}]+@[^@\s\p{Cc}]+$/u),
});

type Approval = z.infer<typeof approvalSchema>;
type Target = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  principal: string;
};

export function readDiagnosticApproval(
  permit: string | null,
  env = process.env,
): Approval | null {
  if (
    env.VERCEL !== "1" ||
    env.VERCEL_ENV !== "preview" ||
    env.VERCEL_TARGET_ENV !== "preview" ||
    env.APP_ENV !== "testing" ||
    env.VERCEL_GIT_COMMIT_REF !== "testing" ||
    !env.VERCEL_GIT_COMMIT_SHA ||
    !commitSha.test(env.VERCEL_GIT_COMMIT_SHA) ||
    !env.VERCEL_DEPLOYMENT_ID ||
    !/^dpl_[A-Za-z0-9]+$/u.test(env.VERCEL_DEPLOYMENT_ID) ||
    !env.TIDB_DIAGNOSTIC_PERMIT_KEY ||
    !tokenPattern.test(env.TIDB_DIAGNOSTIC_PERMIT_KEY) ||
    !env.TIDB_DIAGNOSTIC_APPROVAL ||
    env.TIDB_DIAGNOSTIC_APPROVAL.length > 2048
  )
    return null;
  try {
    const approval = approvalSchema.safeParse(
      JSON.parse(env.TIDB_DIAGNOSTIC_APPROVAL),
    );
    if (
      !approval.success ||
      approval.data.projectId !== env.VERCEL_PROJECT_ID ||
      isIP(approval.data.host) !== 0
    )
      return null;
    const match = permit?.match(/^(\d{10})\.([A-Za-z0-9_-]{43})$/u);
    if (!match) return null;
    const expires = Number(match[1]);
    const now = Math.floor(Date.now() / 1_000);
    if (expires <= now || expires > now + 900) return null;
    const key = Buffer.from(env.TIDB_DIAGNOSTIC_PERMIT_KEY, "base64url");
    if (key.toString("base64url") !== env.TIDB_DIAGNOSTIC_PERMIT_KEY)
      return null;
    const signature = createHmac("sha256", key)
      .update(
        JSON.stringify([
          "tidb-testing-diagnostic",
          approval.data.projectId,
          env.VERCEL_GIT_COMMIT_SHA,
          env.VERCEL_DEPLOYMENT_ID,
          expires,
          approval.data.host,
          approval.data.port,
          approval.data.username,
          approval.data.principal,
        ]),
      )
      .digest("base64url");
    if (!timingSafeEqual(Buffer.from(match[2]), Buffer.from(signature)))
      return null;
    return approval.data;
  } catch {
    return null;
  }
}

function unavailable(code: string) {
  return new HttpError(503, code, "Testing database diagnostic did not pass.");
}

function approvedTarget(approval: Approval): Target {
  try {
    const url = new URL(parseDatabaseConfig(process.env.DATABASE_URL).url);
    const target = {
      host: url.hostname.toLowerCase(),
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      principal: approval.principal,
    };
    if (
      target.host === approval.host &&
      target.port === approval.port &&
      target.user === approval.username &&
      target.database === database &&
      process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0"
    )
      return target;
  } catch {
    // Keep parse errors (which can contain the URL) inside this boundary.
  }
  throw unavailable("TARGET_REJECTED");
}

class DeadlineExceeded extends Error {}

async function within<T>(operation: () => Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new DeadlineExceeded()), timeoutMs);
      }),
      operation(),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// mysql2 3.24.5 replaces the underlying socket after TLS negotiation. Keep
// the core connection so the currently owned socket can be closed even if
// the handshake fails. Use its mysql2/promise facade for mysql commands.
function socketOf(connection: Connection) {
  return (connection as Connection & { stream?: TLSSocket }).stream;
}

async function closeConnection(
  socket: TLSSocket,
  connection?: PromiseConnection,
) {
  if (socket.closed) {
    if (connection) throw unavailable("CLOSE_FAILED");
    return;
  }
  let onClose: (hadError: boolean) => void = () => {};
  const closed = new Promise<boolean>((resolve) => {
    onClose = resolve;
    socket.once("close", onClose);
  });
  try {
    if (connection) {
      try {
        await within(async () => {
          await connection.end();
          if (await closed) throw unavailable("CLOSE_FAILED");
        }, 1_000);
        return;
      } catch {
        if (!socket.closed) socket.destroy();
        await within(() => closed, 1_000);
        throw unavailable("CLOSE_FAILED");
      }
    }
    socket.destroy();
    await within(() => closed, 1_000);
  } finally {
    socket.off("close", onClose);
  }
}

async function connect(host: string, client: Connection) {
  try {
    await within(
      () =>
        new Promise<void>((resolve, reject) => {
          client.connect((error) => (error ? reject(error) : resolve()));
        }),
      5_000,
    );
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (error instanceof DeadlineExceeded || code === "ETIMEDOUT")
      throw unavailable("CONNECTION_TIMEOUT");
    if (code === "HANDSHAKE_SSL_ERROR" || code === "HANDSHAKE_NO_SSL_SUPPORT")
      throw unavailable("TLS_FAILED");
    throw unavailable("CONNECTION_FAILED");
  }
  try {
    const stream = socketOf(client);
    if (
      stream?.encrypted !== true ||
      stream.authorized !== true ||
      checkServerIdentity(host, stream.getPeerCertificate(true))
    )
      throw unavailable("TLS_FAILED");
  } catch {
    throw unavailable("TLS_FAILED");
  }
  return client.promise();
}

async function verifyReadback(
  connection: PromiseConnection,
  databaseName: string,
  principal: string,
) {
  const read = async (sql: string, column: string) => {
    if (databaseTracing.some((channel) => channel.hasSubscribers))
      throw unavailable("INSTRUMENTATION_ENABLED");
    try {
      const [rows] = await within(() => connection.query(sql), 2_000);
      if (
        !Array.isArray(rows) ||
        rows.length !== 1 ||
        !rows[0] ||
        !Object.hasOwn(rows[0], column)
      )
        throw unavailable("QUERY_FAILED");
      return (rows[0] as Record<string, unknown>)[column];
    } catch (error) {
      throw unavailable(
        error instanceof DeadlineExceeded ? "QUERY_TIMEOUT" : "QUERY_FAILED",
      );
    }
  };
  if (
    (await read("SELECT DATABASE() AS database_name", "database_name")) !==
      databaseName ||
    (await read("SELECT CURRENT_USER() AS principal", "principal")) !==
      principal
  )
    throw unavailable("IDENTITY_MISMATCH");
  if ((await read("SELECT 1 AS ok", "ok")) !== 1)
    throw unavailable("QUERY_FAILED");
}

export async function runTidbPreviewDiagnostic(approval: Approval) {
  const { principal, ...target } = approvedTarget(approval);
  // The pinned driver sends raw connection metadata into these channels.
  if (databaseTracing.some((channel) => channel.hasSubscribers))
    throw unavailable("INSTRUMENTATION_ENABLED");
  let client: Connection;
  try {
    client = createConnection({
      ...target,
      ssl: { rejectUnauthorized: true, verifyIdentity: true },
      connectTimeout: 5_000,
      multipleStatements: false,
      flags: ["-LOCAL_FILES"],
      debug: false,
      trace: false,
    });
  } catch {
    throw unavailable("CONNECTION_FAILED");
  }
  client.on("error", () => {});

  let connection: PromiseConnection | undefined;
  let error: unknown;
  try {
    connection = await connect(target.host, client);
    await verifyReadback(connection, target.database, principal);
  } catch (failure) {
    error = failure;
  }
  try {
    const socket = socketOf(client);
    if (!socket) throw unavailable("CLOSE_FAILED");
    // A failed read may have left a command in flight. Destroy that socket
    // instead of enqueuing COM_QUIT behind a command that may never return.
    await closeConnection(
      socket,
      connection &&
        (!error ||
          (error instanceof HttpError && error.code === "IDENTITY_MISMATCH"))
        ? connection
        : undefined,
    );
  } catch {
    throw unavailable("CLOSE_FAILED");
  }
  if (error) throw error;
}
