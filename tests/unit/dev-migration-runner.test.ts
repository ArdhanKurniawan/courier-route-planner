// @vitest-environment node
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runDevelopmentMigration } from "../../scripts/migrate-development.mjs";
import { runProductionMigration } from "../../scripts/migrate-production.mjs";
import { runTestingMigration } from "../../scripts/migrate-testing.mjs";

const mysql = vi.hoisted(() => ({ createConnection: vi.fn() }));
vi.mock("mysql2", () => mysql);

const environment = {
  APP_ENV: "development",
  DATABASE_URL:
    "mysql://fixture_migrator:fixture_password@fixture.invalid:4000/courier_route_planner_dev",
};
type LedgerRow = { id: number; hash: string; created_at: string | number };
const initialLedger = (): LedgerRow[] => [
  {
    id: 1,
    hash: "557fbc895d535904f390f99cc3cc7b41b7e0659c1b155b205c1987d8bdb9ba29",
    created_at: "1791072707266",
  },
  {
    id: 2,
    hash: "9162d5dc275fab627e7511ff1075c4e5a40d30606e8d6bf07b379d1e227fd729",
    created_at: "1793441266963",
  },
];
const testingEnvironment = {
  APP_ENV: "testing",
  DATABASE_URL:
    "mysql://fixture_migrator:fixture_password@fixture.invalid:4000/courier_route_planner_testing",
};
const productionEnvironment = {
  APP_ENV: "production",
  DATABASE_URL:
    "mysql://fixture_migrator:fixture_password@fixture.invalid:4000/courier_route_planner_production",
};
const testingLedger = () => {
  const rows = initialLedger();
  rows[0].hash =
    "64a93fe15a0962c33009f345f59610ecd9ce1d9cd34f9b22f8d99dd21b967577";
  return rows;
};

// Only the mysql2 transport is replaced. The installed Drizzle driver, migrator,
// SQL splitter, hashing, timestamp selection and ledger insert remain real.
class FakeStream extends EventEmitter {
  encrypted = true;
  authorized = true;
  closed = false;
  ignoreDestroy = false;
  certificate = { subjectaltname: "DNS:fixture.invalid" };
  getPeerCertificate() {
    return this.certificate;
  }
  destroy() {
    if (this.ignoreDestroy) return;
    this.closed = true;
    this.emit("close");
  }
}

class FakeConnection extends EventEmitter {
  connection = { stream: new FakeStream() };
  handshakeError?: Error;
  queries: string[] = [];
  endCalls = 0;
  failAtForeignKey = false;
  failAfterLedgerWrite = false;
  failClosing = false;
  stallClosing = false;
  pendingClosing = false;
  constructor(readonly ledger: LedgerRow[] = initialLedger()) {
    super();
  }
  get stream() {
    return this.connection.stream;
  }
  connect(callback: (error?: Error) => void) {
    if (this.handshakeError) this.emit("error", this.handshakeError);
    callback(this.handshakeError);
  }
  promise() {
    return this;
  }
  async execute(query: string) {
    this.queries.push(query);
    if (
      !/select id, hash, created_at .*order by created_at desc limit 1/i.test(
        query,
      )
    )
      throw new Error("Unexpected metadata read in offline transport");
    return [[this.ledger.at(-1)].filter(Boolean), []];
  }
  async query(query: { sql: string }, params: unknown[] = []) {
    const statement = query.sql.trim();
    this.queries.push(statement);
    if (this.failAtForeignKey && statement.startsWith("ALTER TABLE `orders`"))
      throw new Error(
        `Ambiguous transport failure: ${environment.DATABASE_URL}`,
      );
    if (statement.startsWith("insert into `__drizzle_migrations`")) {
      if (typeof params[0] !== "string" || typeof params[1] !== "number")
        throw new Error("Unexpected ledger bind types");
      this.ledger.push({
        id: this.ledger.length + 1,
        hash: params[0],
        created_at: params[1],
      });
      if (this.failAfterLedgerWrite)
        throw new Error(`Lost acknowledgement: ${environment.DATABASE_URL}`);
    }
    return [{ insertId: this.ledger.length, affectedRows: 1 }, []];
  }
  async end() {
    this.endCalls++;
    if (this.failClosing) throw new Error(environment.DATABASE_URL);
    if (this.pendingClosing) return new Promise<void>(() => {});
    if (this.stallClosing) return;
    // mysql2 end() may resolve before the underlying socket closes.
    setImmediate(() => this.connection.stream.destroy());
  }
}

let connection: FakeConnection;
let info: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  mysql.createConnection.mockReset();
  connection = new FakeConnection();
  mysql.createConnection.mockReturnValue(connection);
  info = vi.spyOn(console, "info").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Development migration TLS boundary", () => {
  it("passes chain and hostname verification directly to mysql2", async () => {
    expect(await runDevelopmentMigration(environment)).toBe(0);
    expect(mysql.createConnection).toHaveBeenCalledExactlyOnceWith({
      host: "fixture.invalid",
      port: 4000,
      user: "fixture_migrator",
      password: "fixture_password",
      database: "courier_route_planner_dev",
      ssl: { rejectUnauthorized: true, verifyIdentity: true },
      connectTimeout: 10000,
      multipleStatements: false,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    expect(connection.connection.stream.closed).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });

  it("rejects a certificate hostname mismatch before any migration query", async () => {
    connection.connection.stream.certificate = {
      subjectaltname: "DNS:other-fixture.invalid",
    };
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(connection.queries).toEqual([]);
    expect(connection.connection.stream.closed).toBe(true);
  });

  it("rejects an unauthorized certificate before any migration query", async () => {
    connection.connection.stream.authorized = false;
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(connection.queries).toEqual([]);
  });

  it("rejects a connection without TLS before any migration query", async () => {
    connection.connection.stream.encrypted = false;
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(connection.queries).toEqual([]);
  });

  it.each(["ERR_TLS_CERT_ALTNAME_INVALID", "CERT_HAS_EXPIRED"])(
    "stops on mysql2 handshake rejection %s without retry or secret logs",
    async (code) => {
      connection.handshakeError = Object.assign(
        new Error(environment.DATABASE_URL),
        { code },
      );
      expect(await runDevelopmentMigration(environment)).toBe(1);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);
      expect(connection.queries).toEqual([]);
      expect(JSON.stringify([info.mock.calls, error.mock.calls])).not.toContain(
        "mysql://",
      );
    },
  );

  it.each([undefined, "testing", "production"])(
    "rejects environment %s before acquiring a connection",
    async (APP_ENV) => {
      expect(await runDevelopmentMigration({ ...environment, APP_ENV })).toBe(
        1,
      );
      expect(mysql.createConnection).not.toHaveBeenCalled();
    },
  );

  it.each([
    "courier_route_planner_testing",
    "courier_route_planner_production",
  ])("rejects database %s before acquiring a connection", async (database) => {
    expect(
      await runDevelopmentMigration({
        ...environment,
        DATABASE_URL: environment.DATABASE_URL.replace(
          "courier_route_planner_dev",
          database,
        ),
      }),
    ).toBe(1);
    expect(mysql.createConnection).not.toHaveBeenCalled();
  });

  it("rejects URL TLS overrides without exposing the URL", async () => {
    expect(
      await runDevelopmentMigration({
        ...environment,
        DATABASE_URL: `${environment.DATABASE_URL}?ssl=false`,
      }),
    ).toBe(1);
    expect(mysql.createConnection).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain("mysql://");
  });

  it("imports without starting migration or reading ambient credentials", async () => {
    vi.stubEnv("APP_ENV", environment.APP_ENV);
    vi.stubEnv("DATABASE_URL", environment.DATABASE_URL);
    vi.resetModules();
    await import("../../scripts/migrate-development.mjs");
    expect(mysql.createConnection).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("Testing migration runner", () => {
  beforeEach(() => {
    connection = new FakeConnection(testingLedger());
    mysql.createConnection.mockReturnValue(connection);
  });

  it("opens one Testing connection with both mysql2 TLS checks enabled", async () => {
    expect(await runTestingMigration(testingEnvironment)).toBe(0);
    expect(mysql.createConnection).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        host: "fixture.invalid",
        port: 4000,
        database: "courier_route_planner_testing",
        ssl: { rejectUnauthorized: true, verifyIdentity: true },
        multipleStatements: false,
      }),
    );
    expect(connection.connection.stream.closed).toBe(true);
  });

  it.each([
    ["wrong environment", "development", testingEnvironment.DATABASE_URL],
    ["Development database", "testing", environment.DATABASE_URL],
    [
      "Production database",
      "testing",
      testingEnvironment.DATABASE_URL.replace("_testing", "_production"),
    ],
    ["missing URL", "testing", undefined],
    ["TLS override", "testing", testingEnvironment.DATABASE_URL + "?ssl=false"],
  ])(
    "rejects %s before acquiring a connection",
    async (_, APP_ENV, DATABASE_URL) => {
      expect(await runTestingMigration({ APP_ENV, DATABASE_URL })).toBe(1);
      expect(mysql.createConnection).not.toHaveBeenCalled();
      expect(JSON.stringify(error.mock.calls)).not.toMatch(
        /fixture_password|mysql:\/\//,
      );
    },
  );

  it.each(["hostname mismatch", "untrusted chain", "missing TLS"] as const)(
    "rejects %s before issuing queries",
    async (failure) => {
      const stream = connection.connection.stream;
      if (failure === "hostname mismatch")
        stream.certificate = { subjectaltname: "DNS:other-fixture.invalid" };
      if (failure === "untrusted chain") stream.authorized = false;
      if (failure === "missing TLS") stream.encrypted = false;
      expect(await runTestingMigration(testingEnvironment)).toBe(1);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);
      expect(connection.queries).toEqual([]);
      expect(stream.closed).toBe(true);
      expect(info).not.toHaveBeenCalled();
    },
  );

  it("redacts a driver handshake error and stops without retry", async () => {
    connection.handshakeError = new Error(testingEnvironment.DATABASE_URL);
    expect(await runTestingMigration(testingEnvironment)).toBe(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(connection.queries).toEqual([]);
    expect(connection.stream.closed).toBe(true);
    expect(JSON.stringify([info.mock.calls, error.mock.calls])).not.toMatch(
      /fixture_password|mysql:\/\//,
    );
  });

  it("applies only 0002 with the historical CRLF ledger row preserved", async () => {
    expect(await runTestingMigration(testingEnvironment)).toBe(0);
    expect(
      connection.queries.filter((sql) =>
        /^(CREATE TABLE|ALTER TABLE|CREATE INDEX) /.test(sql),
      ),
    ).toEqual([
      expect.stringMatching(/^CREATE TABLE `orders`/),
      expect.stringMatching(/^ALTER TABLE `orders`/),
      expect.stringMatching(/^CREATE INDEX `orders_scenario_id_id_idx`/),
    ]);
    expect(connection.ledger).toEqual([
      ...testingLedger(),
      {
        id: 3,
        hash: "78ca3ee6092934f6d6d1583f76fff71fb0a546dc1921c99c87df40d0f7a349a2",
        created_at: 1793514725884,
      },
    ]);
  });

  it("does not retry a lost 0002 ledger acknowledgement", async () => {
    connection.failAfterLedgerWrite = true;
    expect(await runTestingMigration(testingEnvironment)).toBe(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(
      connection.queries.filter((sql) => sql.startsWith("insert into")),
    ).toHaveLength(1);
    expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toMatch(
      /fixture_password|mysql:\/\//,
    );
  });

  it("imports without connecting even when Testing env is present", async () => {
    vi.stubEnv("APP_ENV", testingEnvironment.APP_ENV);
    vi.stubEnv("DATABASE_URL", testingEnvironment.DATABASE_URL);
    vi.resetModules();
    await import("../../scripts/migrate-testing.mjs");
    expect(mysql.createConnection).not.toHaveBeenCalled();
  });
});

describe("Production migration runner", () => {
  beforeEach(() => {
    connection = new FakeConnection(testingLedger().slice(0, 1));
    mysql.createConnection.mockReturnValue(connection);
  });

  it("enables both TLS checks and delegates pending migrations to Drizzle", async () => {
    const initial = [...connection.ledger];
    expect(await runProductionMigration(productionEnvironment)).toBe(0);
    expect(mysql.createConnection).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        host: "fixture.invalid",
        port: 4000,
        database: "courier_route_planner_production",
        ssl: { rejectUnauthorized: true, verifyIdentity: true },
      }),
    );
    expect(
      connection.queries.filter((sql) => /^CREATE TABLE `/.test(sql)),
    ).toEqual([
      expect.stringMatching(/^CREATE TABLE `scenarios`/),
      expect.stringMatching(/^CREATE TABLE `orders`/),
    ]);
    expect(connection.ledger).toHaveLength(3);
    expect(connection.ledger[0]).toEqual(initial[0]);
    expect(connection.stream.closed).toBe(true);
  });

  it.each(["hostname mismatch", "untrusted chain", "missing TLS"] as const)(
    "rejects %s before any migration query",
    async (failure) => {
      const stream = connection.stream;
      if (failure === "hostname mismatch")
        stream.certificate = { subjectaltname: "DNS:other-fixture.invalid" };
      if (failure === "untrusted chain") stream.authorized = false;
      if (failure === "missing TLS") stream.encrypted = false;
      expect(await runProductionMigration(productionEnvironment)).toBe(1);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);
      expect(connection.queries).toEqual([]);
      expect(stream.closed).toBe(true);
      expect(info).not.toHaveBeenCalled();
    },
  );

  it("stops on a failed handshake before queries and redacts the driver error", async () => {
    connection.handshakeError = new Error(productionEnvironment.DATABASE_URL);
    expect(await runProductionMigration(productionEnvironment)).toBe(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(connection.queries).toEqual([]);
    expect(connection.stream.closed).toBe(true);
    expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toMatch(
      /fixture_password|mysql:\/\//,
    );
  });

  it.each([
    { ...productionEnvironment, APP_ENV: "testing" },
    { ...productionEnvironment, DATABASE_URL: testingEnvironment.DATABASE_URL },
    {
      ...productionEnvironment,
      DATABASE_URL: productionEnvironment.DATABASE_URL + "?ssl=false",
    },
  ])("rejects unsafe Production input before connecting", async (input) => {
    expect(await runProductionMigration(input)).toBe(1);
    expect(mysql.createConnection).not.toHaveBeenCalled();
  });

  it("can be imported with Production env present without connecting", async () => {
    vi.stubEnv("APP_ENV", productionEnvironment.APP_ENV);
    vi.stubEnv("DATABASE_URL", productionEnvironment.DATABASE_URL);
    vi.resetModules();
    await import("../../scripts/migrate-production.mjs");
    expect(mysql.createConnection).not.toHaveBeenCalled();
  });
});

describe("installed Drizzle migration parity through the Development runner", () => {
  it("selects only pending 0002 and preserves hashes, breakpoints and ledger history", async () => {
    expect(await runDevelopmentMigration(environment)).toBe(0);
    const ddl = connection.queries.filter((s) =>
      /^(?:CREATE TABLE `orders`|ALTER TABLE `orders`|CREATE INDEX `orders_)/.test(
        s,
      ),
    );
    expect(ddl).toHaveLength(3);
    expect(ddl[0]).toMatch(/^CREATE TABLE `orders`/);
    expect(ddl[1]).toContain("FOREIGN KEY (`scenario_id`)");
    expect(ddl[2]).toContain("`orders_scenario_id_id_idx`");
    expect(connection.queries.join("\n")).not.toContain(
      "CREATE TABLE `depots`",
    );
    expect(connection.queries.join("\n")).not.toContain(
      "CREATE TABLE `scenarios`",
    );
    expect(connection.ledger).toEqual([
      ...initialLedger(),
      {
        id: 3,
        hash: "78ca3ee6092934f6d6d1583f76fff71fb0a546dc1921c99c87df40d0f7a349a2",
        created_at: 1793514725884,
      },
    ]);
  });

  it("does not reapply a migration already recorded by Drizzle", async () => {
    connection.ledger.push({
      id: 3,
      hash: "78ca3ee6092934f6d6d1583f76fff71fb0a546dc1921c99c87df40d0f7a349a2",
      created_at: "1793514725884",
    });
    expect(await runDevelopmentMigration(environment)).toBe(0);
    expect(connection.ledger).toHaveLength(3);
    expect(
      connection.queries.some((s) => s.startsWith("CREATE TABLE `orders`")),
    ).toBe(false);
    expect(connection.queries.some((s) => s.startsWith("insert into"))).toBe(
      false,
    );
  });

  it("stops after failed DDL without retry or custom ledger repair", async () => {
    connection.failAtForeignKey = true;
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(
      connection.queries.filter((s) => s.startsWith("ALTER TABLE `orders`")),
    ).toHaveLength(1);
    expect(
      connection.queries.some((s) => s.startsWith("CREATE INDEX `orders_")),
    ).toBe(false);
    expect(connection.ledger).toEqual(initialLedger());
    expect(connection.queries).toContain("rollback"); // Drizzle control flow, not a DDL rollback guarantee.
    expect(connection.connection.stream.closed).toBe(true);
    expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain("fixture_password");
  });

  it("reports failure after a lost ledger acknowledgement without mutation retry", async () => {
    connection.failAfterLedgerWrite = true;
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(connection.ledger).toHaveLength(3); // The outcome can already be committed.
    expect(
      connection.queries.filter((s) => s.startsWith("insert into")),
    ).toHaveLength(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain("mysql://");
  });

  it("does not report success when connection closure fails", async () => {
    connection.failClosing = true;
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(connection.ledger).toHaveLength(3);
    expect(connection.connection.stream.closed).toBe(true);
    expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain("mysql://");
  });

  it.each(["resolved without close", "pending end"])(
    "reports failure after graceful-close timeout: %s",
    async (mode) => {
      vi.useFakeTimers();
      connection.stallClosing = mode === "resolved without close";
      connection.pendingClosing = mode === "pending end";
      const result = runDevelopmentMigration(environment);
      await vi.advanceTimersByTimeAsync(5001);
      expect(await result).toBe(1);
      expect(connection.connection.stream.closed).toBe(true);
      expect(connection.endCalls).toBe(1);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);
      expect(info).not.toHaveBeenCalled();
    },
  );

  it("stops after forced-close timeout without claiming socket closure or success", async () => {
    vi.useFakeTimers();
    connection.stallClosing = true;
    connection.connection.stream.ignoreDestroy = true;
    const result = runDevelopmentMigration(environment);
    await vi.advanceTimersByTimeAsync(6001);
    expect(await result).toBe(1);
    expect(connection.connection.stream.closed).toBe(false);
    expect(connection.endCalls).toBe(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain("mysql://");
  });
});
