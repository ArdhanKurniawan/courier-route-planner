import type { Socket } from "node:net";
import type { Connection } from "mysql2/promise";

type OpenFixture = () => Promise<{ connection: Connection; socket: Socket }>;
type FailureCode =
  "duplicate-key" | "server-rejected" | "deadline" | "transport";
type Result =
  | { status: "committed" }
  | {
      status:
        | "unavailable"
        | "rolled-back"
        | "rollback-unconfirmed"
        | "commit-unknown";
      code: FailureCode;
      cleanupCode?: FailureCode;
    };

class Deadline extends Error {}

function acknowledgedRejection(error: unknown) {
  if (!(error instanceof Error)) return false;
  const { errno, sqlState, fatal } = error as Error & {
    errno?: unknown;
    sqlState?: unknown;
    fatal?: unknown;
  };
  return (
    typeof errno === "number" &&
    Number.isInteger(errno) &&
    errno > 0 &&
    typeof sqlState === "string" &&
    /^[A-Z0-9]{5}$/u.test(sqlState) &&
    fatal !== true
  );
}

function failureCode(error: unknown): FailureCode {
  if (error instanceof Deadline) return "deadline";
  if (!acknowledgedRejection(error)) return "transport";
  return (error as { errno?: number }).errno === 1062
    ? "duplicate-key"
    : "server-rejected";
}

async function withinDeadline<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Deadline()), timeoutMs);
      }),
      Promise.resolve().then(operation),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function closeSocket(socket: Socket) {
  if (socket.closed) return;
  const closed = new Promise<void>((resolve) =>
    socket.once("close", () => resolve()),
  );
  // mysql2's destroy() calls stream.end() in 3.24.5. Destroy the owned
  // transport directly so no unresolved command can keep the socket alive.
  socket.destroy();
  await closed;
}

// Test-only probe for a dedicated, unpooled connection. The opener owns the
// socket until the handshake completes and closes it on acquisition failure.
export async function replaceFixture(
  open: OpenFixture,
  timeoutMs: number,
): Promise<Result> {
  let lease: Awaited<ReturnType<OpenFixture>>;
  try {
    lease = await open();
  } catch (error) {
    return { status: "unavailable", code: failureCode(error) };
  }

  const { connection, socket } = lease;
  try {
    try {
      await withinDeadline(() => connection.beginTransaction(), timeoutMs);
    } catch (error) {
      return { status: "unavailable", code: failureCode(error) };
    }

    try {
      await withinDeadline(
        () => connection.query("DELETE FROM synthetic_orders"),
        timeoutMs,
      );
      await withinDeadline(
        () => connection.query("INSERT INTO synthetic_orders VALUES (?)", [2]),
        timeoutMs,
      );
    } catch (error) {
      const code = failureCode(error);
      if (!acknowledgedRejection(error))
        return { status: "rollback-unconfirmed", code };
      try {
        await withinDeadline(() => connection.rollback(), timeoutMs);
        return { status: "rolled-back", code };
      } catch (cleanupError) {
        return {
          status: "rollback-unconfirmed",
          code,
          cleanupCode: failureCode(cleanupError),
        };
      }
    }

    try {
      await withinDeadline(() => connection.commit(), timeoutMs);
      return { status: "committed" };
    } catch (error) {
      return { status: "commit-unknown", code: failureCode(error) };
    }
  } finally {
    await closeSocket(socket);
  }
}
