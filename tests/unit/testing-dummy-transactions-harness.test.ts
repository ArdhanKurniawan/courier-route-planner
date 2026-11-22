// @vitest-environment node
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  fixturePlan,
  runAcceptance,
  resolveCommitWithoutReply,
} from "../../scripts/testing-dummy-transaction-acceptance.mjs";
import {
  parseTestingTransactionTarget,
  requireTestingTransactionRun,
  testingTransactionCommandLimit,
} from "../../scripts/testing-dummy-transaction-target.mjs";

vi.mock("mysql2", () => {
  throw new Error("The offline harness must not load the live driver.");
});

const runId = "6c264085-a13d-45b9-a02a-e4fa34897b1b";

describe("Testing transaction operator gate", () => {
  const host = "fixture-test.tidbcloud.com";
  const user = "fake123.testing_app";
  const database = "courier_route_planner_testing";
  const pin = createHash("sha256")
    .update(JSON.stringify([host, 4000, database, user])).digest("hex");
  const localEnvironment = { TESTING_DUMMY_DB_TARGET_SHA256: pin };
  const args = [
    "--run", runId, resolve("synthetic-receipt.jsonl"), "APPROVED-TESTING-TRANSACTIONS",
  ];
  const credentials = {
    APP_ENV: "testing",
    DATABASE_URL: `mysql://${user}:fake-password@${host}:4000/${database}`,
  };

  it("requires the explicit run arguments and an independently configured pin", () => {
    expect(requireTestingTransactionRun(args, localEnvironment, [])).toEqual({
      receiptPath: args[2], pin,
    });
    expect(() => requireTestingTransactionRun(args.slice(0, -1), localEnvironment, []))
      .toThrow("EXPLICIT_APPROVAL_REQUIRED");
    expect(() => requireTestingTransactionRun(
      [args[0], runId, "relative.jsonl", args[3]], localEnvironment, [],
    )).toThrow("EXPLICIT_APPROVAL_REQUIRED");
    expect(() => requireTestingTransactionRun(args, {}, []))
      .toThrow("TESTING_TARGET_PIN_REQUIRED");
  });

  it.each([
    { CI: "true" }, { GITHUB_ACTIONS: "true" }, { VITEST: "true" },
    { NODE_ENV: "test" }, { npm_lifecycle_event: "test:coverage" },
    { npm_lifecycle_event: "pretest" }, { npm_lifecycle_event: "posttest" },
    { VERCEL_ENV: "preview" }, { VERCEL_TARGET_ENV: "production" },
    { APP_ENV: "production" }, { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
  ])("blocks live execution for %j", (environment) => {
    expect(() => requireTestingTransactionRun(args, { ...localEnvironment, ...environment }, []))
      .toThrow("LOCAL_TESTING_OPERATOR_REQUIRED");
  });

  it("blocks startup hooks and key logs before credentials are read", () => {
    expect(() => requireTestingTransactionRun(args, localEnvironment, ["--require", "hook.js"]))
      .toThrow("LOCAL_TESTING_OPERATOR_REQUIRED");
    expect(() => requireTestingTransactionRun(
      args, { ...localEnvironment, SSLKEYLOGFILE: "key.log" }, [],
    )).toThrow("LOCAL_TESTING_OPERATOR_REQUIRED");
  });

  it("accepts only credentials pointing to the pinned Testing host and principal", () => {
    expect(parseTestingTransactionTarget(credentials, pin)).toMatchObject({
      host, port: 4000, database, user,
    });
    expect(() => parseTestingTransactionTarget({ ...credentials, APP_ENV: "production" }, pin))
      .toThrow("TESTING_ENV_REQUIRED");
    for (const url of [
      credentials.DATABASE_URL.replace(host, "different-test.tidbcloud.com"),
      credentials.DATABASE_URL.replace(user, "fake456.testing_app"),
      credentials.DATABASE_URL.replace(".testing_app", ".testing_migrator"),
      credentials.DATABASE_URL.replace(database, "courier_route_planner_production"),
      credentials.DATABASE_URL.replace(":4000", ":3306"),
    ]) {
      expect(() => parseTestingTransactionTarget({ ...credentials, DATABASE_URL: url }, pin))
        .toThrow("TESTING_IDENTITY_REJECTED");
    }
  });
});

describe("Testing transaction acceptance safety", () => {
  it("preassigns exact fixture tags and rejects a non-v4 run ID", () => {
    const plan = fixturePlan(runId);
    expect(plan).toEqual(fixturePlan(runId));
    const tags = [
      plan.depot.name,
      ...plan.scenarios.map(({ name }) => name),
      ...plan.orders.map(({ code }) => code),
    ];
    expect(tags).toHaveLength(13);
    expect(new Set(tags).size).toBe(13);
    expect(
      tags.every(
        (tag) => tag.length <= 64 && tag.toLowerCase().includes(runId),
      ),
    ).toBe(true);
    expect(plan.scenarios.every(({ name }) => name.includes(runId))).toBe(true);
    expect(plan.orders.every(({ code }) => code === code.toUpperCase())).toBe(
      true,
    );
    expect(plan.orders.find(({ label }) => label === "MANUAL")?.source).toBe(
      "manual",
    );
    expect(plan.orders.find(({ label }) => label === "SENTINEL")?.source).toBe(
      "dummy",
    );
    expect(() => fixturePlan("90001")).toThrow();
  });

  it("stops on an occupied tag before any fixture mutation", async () => {
    const fixture = fixturePlan(runId);
    const query = vi.fn<(sql: string) => Promise<{ id: string }[]>>(
      async () => [{ id: "1" }],
    );
    const open = vi.fn(async () => ({ query, close: vi.fn() }));
    const report = vi.fn();
    await expect(runAcceptance(open, fixture, report)).rejects.toThrow(
      "FIXTURE_COLLISION",
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toMatch(/^SELECT /u);
  });

  it("stops before setup when TiDB would defer the duplicate check", async () => {
    const select = vi.fn<(sql: string) => Promise<object[]>>(async () => []);
    const checkUniqueness = vi.fn(async () => [{ enabled: 0 }]);
    const open = vi
      .fn()
      .mockResolvedValueOnce({ query: select, close: vi.fn() })
      .mockResolvedValueOnce({ query: checkUniqueness, close: vi.fn() });
    const report = vi.fn();
    await expect(
      runAcceptance(open, fixturePlan(runId), report),
    ).rejects.toThrow("INSERT_CONFLICT_CHECK_DEFERRED");
    expect(open).toHaveBeenCalledTimes(2);
    expect(report).not.toHaveBeenCalledWith(
      expect.objectContaining({ stage: "fixture-intent" }),
    );
  });

  it("sends COMMIT once while paused and requires independent positive evidence before returning", async () => {
    const order: string[] = [];
    const close = vi.fn(async () => {
      order.push("close");
    });
    const commit = vi.fn(() => {
      order.push("commit");
      return new Promise(() => {});
    });
    const pause = vi.fn(() => {
      order.push("pause");
    });
    const observe = vi.fn(async () => {
      order.push("observe");
      return true;
    });
    await resolveCommitWithoutReply({ pause, commit, close }, observe);
    expect(order).toEqual(["pause", "commit", "observe", "close"]);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("closes and stops if the observer cannot prove the outcome", async () => {
    const writer = {
      pause: vi.fn(),
      commit: vi.fn(() => new Promise(() => {})),
      close: vi.fn(async () => {}),
    };
    const observe = vi.fn(async () => {
      throw new Error("unexpected observation");
    });
    await expect(resolveCommitWithoutReply(writer, observe)).rejects.toThrow(
      "COMMIT_UNKNOWN",
    );
    expect(writer.commit).toHaveBeenCalledTimes(1);
    expect(writer.close).toHaveBeenCalledWith(true);
  });

  it("does not report the lost-reply case as exercised when COMMIT already settled", async () => {
    const writer = {
      pause: vi.fn(),
      commit: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    };
    await expect(
      resolveCommitWithoutReply(writer, async () => true),
    ).rejects.toThrow("COMMIT_UNKNOWN");
    expect(writer.close).toHaveBeenCalledWith(true);
  });

  it("accepts a socket-close rejection only after the pending commit has been independently proven", async () => {
    let rejectCommit: (error: Error) => void = () => {};
    const writer = {
      pause: vi.fn(),
      commit: vi.fn(
        () =>
          new Promise((_resolve, reject) => {
            rejectCommit = reject;
          }),
      ),
      close: vi.fn(async () => {
        rejectCommit(new Error("socket closed"));
      }),
    };
    await expect(
      resolveCommitWithoutReply(writer, async () => true),
    ).resolves.toBeUndefined();
    expect(writer.commit).toHaveBeenCalledTimes(1);
  });

  it("completes the planned cases against a synthetic store with independent snapshots and owned cleanup", async () => {
    type Row = Record<string, string | number | null>;
    const store = {
      depots: [] as Row[],
      scenarios: [] as Row[],
      orders: [] as Row[],
    };
    const statements: string[] = [];
    const time = "2026-01-01 00:00:00.000";
    let nextId = BigInt("9007199254740991");
    let lock = 0;
    let openCount = 0;
    let transactionCommands = 0;
    let staleReads = 0;
    let previousOrders: Row[] = [];
    const open = async () => {
      const session = ++openCount;
      let paused = false;
      let staged: typeof store | undefined;
      let lastId: string;
      const discard = () => {
        staged = undefined;
        if (lock === session) lock = 0;
      };
      function reject(errno: number) {
        throw Object.assign(new Error("mock rejection"), {
          errno,
          sqlState: "HY000",
        });
      }
      return {
        query: async (sql: string, params: (string | number)[] = []) => {
          statements.push(sql);
          const boundIds = params.filter((value) =>
            typeof value === "string" && /^\d+$/u.test(value),
          );
          expect(sql.match(/CAST\(\? AS SIGNED\)/gu) ?? []).toHaveLength(boundIds.length);
          const data = staged ?? store;
          if (sql === "BEGIN PESSIMISTIC") {
            staged = structuredClone(store);
            return {};
          }
          if (
            sql ===
            "SELECT @@SESSION.tidb_constraint_check_in_place_pessimistic AS enabled"
          )
            return [{ enabled: 1 }];
          if (sql.startsWith("SELECT id FROM ")) {
            const [, table, field] =
              /FROM (\w+) WHERE (\w+) IN/u.exec(sql) ?? [];
            return data[table as keyof typeof store].filter((row) =>
              params.includes(
                String(row[field === "order_code" ? "code" : field]),
              ),
            );
          }
          if (sql.startsWith("INSERT INTO ")) {
            const table = /^INSERT INTO (\w+)/u.exec(
              sql,
            )?.[1] as keyof typeof store;
            if (
              table === "orders" &&
              data.orders.some(
                (row) => row.scenarioId === params[0] && row.code === params[1],
              )
            )
              reject(1062);
            lastId = String(++nextId);
            data[table].push(
              table === "orders"
                ? {
                    id: lastId,
                    scenarioId: params[0],
                    code: params[1],
                    name: params[1],
                    address: null,
                    latitude: -6.2,
                    longitude: 106.8,
                    source: params[5],
                    createdAt: time,
                    updatedAt: time,
                  }
                : table === "scenarios"
                  ? { id: lastId, depotId: params[0], name: params[1] }
                  : { id: lastId, name: params[0] },
            );
            return { affectedRows: 1 };
          }
          if (sql.includes("LAST_INSERT_ID()")) return [{ id: lastId }];
          if (
            sql.startsWith("SELECT ") &&
            sql.includes("FROM depots WHERE id = CAST(? AS SIGNED)")
          )
            return data.depots.filter(({ id }) => id === params[0]);
          if (
            sql.startsWith("SELECT ") &&
            sql.includes("FROM scenarios WHERE depot_id = CAST(? AS SIGNED)")
          )
            return data.scenarios.filter(
              ({ depotId }) => depotId === params[0],
            );
          if (
            sql.startsWith("SELECT ") &&
            sql.includes("FROM scenarios WHERE id = CAST(? AS SIGNED)")
          ) {
            if (lock && lock !== session) reject(3572);
            lock = session;
            return data.scenarios.filter(({ id }) => id === params[0]);
          }
          if (
            sql.startsWith("SELECT CAST(id AS CHAR) AS id,") &&
            sql.includes("FROM orders WHERE scenario_id")
          ) {
            // The independent observer can see the old snapshot before COMMIT
            // becomes visible on its sixth allowed read.
            let rows = data.orders;
            if (sql.includes("WHERE scenario_id IN (") && staleReads > 0) {
              staleReads--;
              rows = previousOrders;
            }
            return rows
              .filter(({ scenarioId }) => params.includes(String(scenarioId)))
              .map((row) => ({ ...row }));
          }
          if (sql.startsWith("DELETE FROM ")) {
            const table = sql.split(" ")[2] as keyof typeof store;
            const ids = sql.includes(" AND id IN (")
              ? params.slice(1)
              : params.slice(0, 1);
            const count = data[table].length;
            data[table] = data[table].filter(
              ({ id }) => !ids.includes(String(id)),
            );
            return { affectedRows: count - data[table].length };
          }
          throw new Error("Unexpected query in mock");
        },
        close: async () => {
          discard();
        },
        pause: () => {
          paused = true;
        },
        commit: async () => {
          transactionCommands++;
          if (!staged) throw new Error("Missing transaction");
          if (paused) {
            previousOrders = store.orders;
            staleReads = 5;
          }
          Object.assign(store, staged);
          discard();
          if (paused) await new Promise(() => {});
        },
        rollback: async () => {
          transactionCommands++;
          discard();
        },
      };
    };
    const report = vi.fn();
    await runAcceptance(open, fixturePlan(runId), report);
    expect(report.mock.calls.map(([event]) => event.stage)).toEqual([
      "fixture-intent",
      "setup-before-commit",
      "baseline",
      "rollback-after-insert-conflict",
      "before-commit-B",
      "commit-acknowledged-B",
      "concurrent-writer-rejected",
      "before-commit-C",
      "commit-acknowledged-C",
      "before-commit-D",
      "commit-reconciled",
      "commit-confirmed-by-observer",
      "cleanup-verified",
    ]);
    expect(openCount).toBe(8);
    // Every live connection runs one session-identity SELECT before these queries.
    expect(statements.length + transactionCommands + openCount).toBe(testingTransactionCommandLimit);
    expect(
      statements.every((sql) => /^(?:SELECT|INSERT|DELETE|BEGIN)\b/u.test(sql)),
    ).toBe(true);
    expect(store).toEqual({ depots: [], scenarios: [], orders: [] });
  });
});
