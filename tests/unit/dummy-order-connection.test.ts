// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { tracingChannel } from "node:diagnostics_channel";
import { createConnection } from "mysql2";
import { openDummyConnection } from "@/db/dummy-order-connection";

vi.mock("mysql2", () => ({ createConnection: vi.fn() }));

const database = "courier_route_planner_testing";
const query = vi.fn();
const destroy = vi.fn();
const connect = vi.fn();
const stream = { encrypted: true, authorized: true, destroy };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("APP_ENV", "testing");
  vi.stubEnv(
    "DATABASE_URL",
    "mysql://fake_app:private@testing.invalid:4000/" + database,
  );
  connect.mockResolvedValue(undefined);
  vi.mocked(createConnection).mockReturnValue({
    destroy,
    on: vi.fn(),
    promise: () => ({ connect, query }),
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

it("denies Production before acquiring a socket", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("APP_ENV", "production");
  await expect(openDummyConnection()).rejects.toThrow();
  expect(createConnection).not.toHaveBeenCalled();
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
