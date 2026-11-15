import "server-only";
import {
  openDummyConnection,
  type DummyConnection,
} from "@/db/dummy-order-connection";
import { HttpError } from "@/lib/http/request-security";

export type OpenDummyConnection = () => Promise<DummyConnection>;

export class DummyTransactionUnknown extends HttpError {
  constructor(
    readonly phase: "commit" | "rollback",
    options: ErrorOptions = {},
  ) {
    super(
      503,
      phase === "commit" ? "COMMIT_UNKNOWN" : "ROLLBACK_UNKNOWN",
      "The transaction outcome is unknown. Verify the operation before trying again.",
    );
    this.cause = options.cause;
  }
}

export function mysqlErrorNumber(error: unknown) {
  return error && typeof error === "object" && "errno" in error
    ? error.errno
    : undefined;
}

export async function withDummyConnection<T>(
  open: OpenDummyConnection,
  work: (connection: DummyConnection) => Promise<T>,
) {
  const connection = await open();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await work(connection);
  } finally {
    try {
      await Promise.race([
        connection.close(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Close timeout.")), 500);
        }),
      ]);
    } catch {
      connection.destroy();
    } finally {
      clearTimeout(timer);
    }
  }
}

export function withDummyTransaction<T>(
  work: (connection: DummyConnection) => Promise<T>,
  open = openDummyConnection,
) {
  return withDummyConnection(open, async (connection) => {
    await connection.query("BEGIN PESSIMISTIC");
    let result: T;
    try {
      result = await work(connection);
    } catch (error) {
      try {
        await connection.query("ROLLBACK");
      } catch {
        connection.destroy();
        throw new DummyTransactionUnknown("rollback", { cause: error });
      }
      throw error;
    }
    try {
      await connection.query("COMMIT");
    } catch (error) {
      connection.destroy();
      throw new DummyTransactionUnknown("commit", { cause: error });
    }
    return result;
  });
}
