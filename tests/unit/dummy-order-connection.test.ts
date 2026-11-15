// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { tracingChannel } from "node:diagnostics_channel";
import { createConnection } from "mysql2";
import { openDummyConnection } from "@/db/dummy-order-connection";
import { GET, PATCH, POST } from "@/app/api/scenarios/[id]/dummy-orders/route";

vi.mock("mysql2", () => ({ createConnection: vi.fn() }));
vi.mock("@/lib/security/admin", () => ({
  requireAdmin: async () => ({ origin: "https://production.invalid" }),
}));

const database = "courier_route_planner_testing";
const query = vi.fn();
const destroy = vi.fn();
const connect = vi.fn();
const end = vi.fn();
const stream = { encrypted: true, authorized: true, destroy };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("APP_ENV", "testing");
  vi.stubEnv("VERCEL_TARGET_ENV", undefined);
  vi.stubEnv("DUMMY_GENERATOR_PRODUCTION_MODE", undefined);
  vi.stubEnv(
    "DATABASE_URL",
    "mysql://fake_app:private@testing.invalid:4000/" + database,
  );
  connect.mockResolvedValue(undefined);
  end.mockResolvedValue(undefined);
  vi.mocked(createConnection).mockReturnValue({
    destroy,
    on: vi.fn(),
    promise: () => ({ connect, query, end }),
    stream,
  } as unknown as ReturnType<typeof createConnection>);
  query
    .mockResolvedValueOnce([
      [
        {
          db: database,
          principal: "fake_app@%",
          foreignKeys: 1,
          autocommit: 1,
          sqlMode: "STRICT_TRANS_TABLES",
        },
      ],
    ])
    .mockResolvedValueOnce([
      [
        { grants: "GRANT USAGE ON *.* TO 'fake_app'@'%'" },
        {
          grants:
            "GRANT SELECT, INSERT, UPDATE, DELETE ON `courier\\_route\\_planner\\_testing`.* TO 'fake_app'@'%'",
        },
      ],
    ]);
});

afterEach(() => vi.unstubAllEnvs());

it("uses strict TLS, exact target, a bounded connection and expected APPLICATION grants", async () => {
  await expect(openDummyConnection()).resolves.toHaveProperty("query");
  expect(createConnection).toHaveBeenCalledWith(
    expect.objectContaining({
      database,
      connectTimeout: expect.any(Number),
      ssl: { rejectUnauthorized: true, verifyIdentity: true },
    }),
  );
  expect(query.mock.calls.map(([options]) => options.sql)).toEqual([
    expect.stringContaining("CURRENT_USER()"),
    "SHOW GRANTS",
  ]);
});

const productionDatabase = "courier_route_planner_production";
const operationId = "00000000-0000-4000-8000-000000000011";
const context = { params: Promise.resolve({ id: "10" }) };
function request(method: string, body?: unknown) {
  const origin = "https://production.invalid";
  return new Request(origin + "/api/scenarios/10/dummy-orders", {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function useProduction(mode?: string) {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("DUMMY_GENERATOR_PRODUCTION_MODE", mode);
  vi.stubEnv(
    "DATABASE_URL",
    "mysql://fake_app:private@production.invalid:4000/" + productionDatabase,
  );
  query.mockReset();
  query
    .mockResolvedValueOnce([
      [{
        db: productionDatabase,
        principal: "fake_app@%",
        foreignKeys: 1,
        autocommit: 1,
        sqlMode: "STRICT_TRANS_TABLES",
      }],
    ])
    .mockResolvedValueOnce([
      [{
        grants:
          "GRANT SELECT, INSERT, UPDATE, DELETE ON `courier\\_route\\_planner\\_production`.* TO 'fake_app'@'%'",
      }],
    ]);
}

it.each([undefined, "disabled", "Enabled", "recovery"])(
  "denies new Production writes before opening a socket for mode %s",
  async (mode) => {
    useProduction(mode);
    await expect(openDummyConnection()).rejects.toThrow();
    expect(createConnection).not.toHaveBeenCalled();
  },
);

it("denies Production status reads and reconciliation while disabled", async () => {
  useProduction();
  expect((await GET(request("GET"), context)).status).toBe(503);
  expect((await PATCH(request("PATCH", { operationId }), context)).status).toBe(
    503,
  );
  expect(createConnection).not.toHaveBeenCalled();
});

it.each(["disabled", "recovery"])(
  "rejects valid Save and Regenerate requests at the handler in mode %s",
  async (mode) => {
    useProduction(mode);
    const save = {
      operationId,
      parameters: { count: 2, radiusMinM: 10, radiusMaxM: 100, seed: "32" },
      revision: "a".repeat(64),
      replaceCount: 0,
    };
    const regenerate = { ...save, replaceCount: 2, confirmReplace: true };

    for (const input of [save, regenerate]) {
      expect((await POST(request("POST", input), context)).status).toBe(503);
    }
    expect(createConnection).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  },
);

it("admits Production only with explicit enablement, strict TLS and scoped grants", async () => {
  useProduction("enabled");
  await expect(openDummyConnection()).resolves.toHaveProperty("query");
  expect(createConnection).toHaveBeenCalledWith(
    expect.objectContaining({
      database: productionDatabase,
      ssl: { rejectUnauthorized: true, verifyIdentity: true },
    }),
  );
  expect(query).toHaveBeenCalledTimes(2);
});

it("rejects Production enablement with a conflicting hosting target", async () => {
  useProduction("enabled");
  vi.stubEnv("VERCEL_TARGET_ENV", "preview");
  await expect(openDummyConnection()).rejects.toThrow();
  expect(createConnection).not.toHaveBeenCalled();
});

it("reads Production ledger status in recovery mode", async () => {
  useProduction("recovery");
  query.mockResolvedValueOnce([[]]);
  const response = await GET(request("GET"), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: null });
  expect(query.mock.calls[2][0].sql).toContain("FROM dummy_order_operations");
  expect(end).toHaveBeenCalledOnce();
});

it("releases a verified Production reservation in recovery mode using only ledger writes", async () => {
  useProduction("recovery");
  query
    .mockResolvedValueOnce([{}])
    .mockResolvedValueOnce([[
      {
        id: "10",
        depotId: "20",
        name: "Scenario A",
        distributionPattern: "random",
        status: "draft",
        customerCount: "3",
        radiusMinM: null,
        radiusMaxM: null,
        generationSeed: null,
        updatedAt: "2026-11-15 00:00:00.000000",
      },
    ]])
    .mockResolvedValueOnce([[
      {
        operationId,
        operationVersion: "1",
        scenarioId: "10",
        activeScenarioId: "10",
        requestHash: "a".repeat(64),
        beforeHash:
          "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        afterHash: null,
        status: "pending",
        savedCount: 0,
        replacedCount: 0,
      },
    ]])
    .mockResolvedValueOnce([[]])
    .mockResolvedValueOnce([{ affectedRows: 1 }])
    .mockResolvedValueOnce([{}]);

  const response = await PATCH(request("PATCH", { operationId }), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    data: { status: "rolled_back" },
  });
  expect(
    query.mock.calls.map(([options]) => options.sql).filter((sql) =>
      /^(INSERT|UPDATE|DELETE) /u.test(sql),
    ),
  ).toEqual([expect.stringContaining("UPDATE dummy_order_operations")]);
});

it("denies an IP target before the driver can skip DNS hostname verification", async () => {
  vi.stubEnv(
    "DATABASE_URL",
    "mysql://fake_app:private@192.0.2.1:4000/" + database,
  );
  await expect(openDummyConnection()).rejects.toThrow(
    "Database operation unavailable.",
  );
  expect(createConnection).not.toHaveBeenCalled();
});

it("denies a connection when mysql2 instrumentation can expose private context", async () => {
  const start = tracingChannel("mysql2:connect").start;
  const listener = vi.fn();
  start.subscribe(listener);
  try {
    await expect(openDummyConnection()).rejects.toThrow(
      "Database operation unavailable.",
    );
    expect(createConnection).not.toHaveBeenCalled();
  } finally {
    start.unsubscribe(listener);
  }
});

it("fails closed on a migrator credential and destroys the socket", async () => {
  query.mockReset();
  query
    .mockResolvedValueOnce([
      [
        {
          db: database,
          principal: "fake_app@%",
          foreignKeys: 1,
          autocommit: 1,
          sqlMode: "STRICT_TRANS_TABLES",
        },
      ],
    ])
    .mockResolvedValueOnce([
      [
        {
          grants:
            "GRANT SELECT, INSERT, CREATE ON `courier\\_route\\_planner\\_testing`.* TO 'fake_app'@'%'",
        },
      ],
    ]);
  await expect(openDummyConnection()).rejects.toThrow(
    "Database operation unavailable.",
  );
  expect(destroy).toHaveBeenCalledOnce();
});

it("sanitizes TLS failures without executing a query", async () => {
  connect.mockRejectedValueOnce(new Error("private"));
  await expect(openDummyConnection()).rejects.toThrow(
    "Database operation unavailable.",
  );
  expect(query).not.toHaveBeenCalled();
  expect(destroy).toHaveBeenCalledOnce();
});

it("fails closed before mutations if the session uses NO_BACKSLASH_ESCAPES", async () => {
  query.mockReset();
  query.mockResolvedValueOnce([
    [
      {
        db: database,
        principal: "fake_app@%",
        foreignKeys: 1,
        autocommit: 1,
        sqlMode: "STRICT_TRANS_TABLES,NO_BACKSLASH_ESCAPES",
      },
    ],
  ]);
  await expect(openDummyConnection()).rejects.toThrow(
    "Database operation unavailable.",
  );
  expect(query).toHaveBeenCalledOnce();
  expect(destroy).toHaveBeenCalledOnce();
});

it("destroys a timed-out connection and prevents ROLLBACK from queueing behind it", async () => {
  const connection = await openDummyConnection();
  const timeout = Object.assign(new Error("pending"), {
    code: "PROTOCOL_SEQUENCE_TIMEOUT",
  });
  query.mockRejectedValueOnce(timeout);
  await expect(connection.query("INSERT")).rejects.toBe(timeout);
  expect(destroy).toHaveBeenCalledOnce();
  await expect(connection.query("ROLLBACK")).rejects.toThrow(
    "Database operation unavailable.",
  );
  expect(query.mock.calls.map(([options]) => options.sql)).not.toContain(
    "ROLLBACK",
  );
});
