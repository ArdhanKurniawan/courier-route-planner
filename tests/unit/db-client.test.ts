// @vitest-environment node
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDatabase,
  getDatabase,
  DatabaseTransportError,
} from "@/db/client";
import { DatabaseConfigError } from "@/config/db-env";
import {
  fakeDatabaseUrl,
  tidbResponse,
  type DatabaseFetch,
} from "../fixtures/tidb-http";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.resetModules();
});

describe("lazy HTTP database client", () => {
  it("imports without env or network and validates only on acquisition", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const network = vi.fn(() => {
      throw new Error("No network allowed");
    });
    vi.stubGlobal("fetch", network);
    const client = await import("@/db/client");
    expect(network).not.toHaveBeenCalled();
    expect(() => client.getDatabase()).toThrow(DatabaseConfigError);
    expect(() => createDatabase(undefined, network)).toThrow(
      DatabaseConfigError,
    );
    expect(network).not.toHaveBeenCalled();
  });
  it("creates the ORM without I/O and sends one static SQL request on execution", async () => {
    const transport = vi.fn<DatabaseFetch>(async () => tidbResponse());
    const db = createDatabase(fakeDatabaseUrl, transport);
    expect(transport).not.toHaveBeenCalled();
    expect((await db.execute(sql`SELECT 1 AS ok`)).rows).toEqual([{ ok: "1" }]);
    expect(transport).toHaveBeenCalledTimes(1);
    const [endpoint, init] = transport.mock.calls[0];
    expect(endpoint).toBe("https://http-fixture.invalid/v1beta/sql");
    expect(JSON.parse(init!.body)).toEqual({ query: "SELECT 1 AS ok" });
    expect(init!.method).toBe("POST");
    expect(init!.cache).toBe("no-store");
  });
  it("reads the URL at each getter call without retaining a stale config", () => {
    vi.stubEnv("DATABASE_URL", fakeDatabaseUrl);
    expect(getDatabase()).toBeDefined();
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => getDatabase()).toThrow(DatabaseConfigError);
  });
  it("uses a fresh native 5000 ms signal for each operation", async () => {
    const deadlines = vi.spyOn(AbortSignal, "timeout");
    const signals: AbortSignal[] = [];
    const transport: DatabaseFetch = async (_input, init) => {
      signals.push((init as RequestInit).signal!);
      return tidbResponse();
    };
    const db = createDatabase(fakeDatabaseUrl, transport);
    await db.execute(sql`SELECT 1 AS ok`);
    await db.execute(sql`SELECT 1 AS ok`);
    expect(deadlines.mock.calls).toEqual([[5000], [5000]]);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[0]).not.toBe(signals[1]);
  });
  it.each(["fetch", "body"])(
    "aborts a pending %s at the deadline with no retry",
    async (stage) => {
      vi.useFakeTimers();
      vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
        const controller = new AbortController();
        setTimeout(
          () => controller.abort(new DOMException("Timed out", "TimeoutError")),
          ms,
        );
        return controller.signal;
      });
      let activeSignal: AbortSignal | undefined;
      const transport = vi.fn<DatabaseFetch>(async (_input, init) => {
        const signal = (init as RequestInit).signal!;
        activeSignal = signal;
        const pending = () =>
          new Promise<never>((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            }),
          );
        if (stage === "fetch") return pending();
        const response = tidbResponse();
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          headers: response.headers,
          json: pending,
          text: pending,
        };
      });
      const operation = createDatabase(fakeDatabaseUrl, transport).execute(
        sql`SELECT 1 AS ok`,
      );
      const rejected = expect(operation).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(4999);
      expect(activeSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(activeSignal?.aborted).toBe(true);
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it("redacts transport and response parsing failures", async () => {
    for (const transport of [
      async () => {
        throw new Error(fakeDatabaseUrl);
      },
      async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers(),
        json: async () => {
          throw new Error(fakeDatabaseUrl);
        },
        text: async () => "",
      }),
    ]) {
      const db = createDatabase(fakeDatabaseUrl, transport);
      try {
        await db.$client.execute("SELECT 1 AS ok");
        throw new Error("Expected transport failure");
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseTransportError);
        expect(String(error)).toBe(
          "DatabaseTransportError: Database operation unavailable.",
        );
        expect(error).not.toHaveProperty("cause");
      }
    }
  });
});
