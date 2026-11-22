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

// Pin the SQL hashes and journal timestamps independently of Drizzle.
const ordersEntry: LedgerRow = {
  id: 3,
  hash: "78ca3ee6092934f6d6d1583f76fff71fb0a546dc1921c99c87df40d0f7a349a2",
  created_at: 1793514725884,
};
const dummyOperationsEntry: LedgerRow = {
  id: 4,
  hash: "37bf2a6115126b82fba46214711f16b75814b752a22a5cea3535fd5e62ebb4ab",
  created_at: 1794716866549,
};
const benchmarkCasesEntry: LedgerRow = {
  id: 5,
  hash: "eeae3260e989dd0f5ac70b6ef5a2fac2257191b30cf557f08e368a0a92fced54",
  created_at: 1795345815271,
};
const asRecorded = (row: LedgerRow): LedgerRow => ({
  ...row,
  created_at: String(row.created_at),
});
const ledgerInsert = expect.stringMatching(
  /^insert into `__drizzle_migrations`/i,
);
const scenariosWrites = [
  expect.stringMatching(/^CREATE TABLE `scenarios`/),
  expect.stringMatching(
    /^ALTER TABLE `scenarios` .*FOREIGN KEY \(`depot_id`\)/,
  ),
  expect.stringMatching(/^CREATE INDEX `scenarios_depot_id_idx`/),
  ledgerInsert,
];
const ordersWrites = [
  expect.stringMatching(/^CREATE TABLE `orders`/),
  expect.stringMatching(
    /^ALTER TABLE `orders` .*FOREIGN KEY \(`scenario_id`\)/,
  ),
  expect.stringMatching(/^CREATE INDEX `orders_scenario_id_id_idx`/),
  ledgerInsert,
];
const dummyOperationsWrites = [
  expect.stringMatching(
    /^CREATE TABLE `dummy_order_operations`[\s\S]*UNIQUE\(`active_scenario_id`\)[\s\S]*UNIQUE\(`scenario_id`,`operation_version`\)/,
  ),
  expect.stringMatching(
    /^ALTER TABLE `dummy_order_operations` .*FOREIGN KEY \(`active_scenario_id`\) REFERENCES `scenarios`\(`id`\)/,
  ),
  ledgerInsert,
];
const benchmarkCasesWrites = [
  expect.stringMatching(
    /^CREATE TABLE `benchmark_case_points`[\s\S]*UNIQUE\(`case_id`,`node_index`\)[\s\S]*UNIQUE\(`case_id`,`kind`,`source_id`\)/,
  ),
  expect.stringMatching(
    /^CREATE TABLE `benchmark_cases`[\s\S]*UNIQUE\(`request_id`\)/,
  ),
  expect.stringMatching(
    /^ALTER TABLE `benchmark_case_points` .*FOREIGN KEY \(`case_id`\) REFERENCES `benchmark_cases`\(`id`\) ON DELETE restrict ON UPDATE restrict;/,
  ),
  expect.stringMatching(
    /^ALTER TABLE `benchmark_cases` .*FOREIGN KEY \(`scenario_id`\) REFERENCES `scenarios`\(`id`\) ON DELETE restrict ON UPDATE restrict;/,
  ),
  expect.stringMatching(/^CREATE INDEX `benchmark_cases_scenario_id_idx`/),
  ledgerInsert,
];

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

function migrationWrites(connection: FakeConnection) {
  // Drizzle ensures its ledger table exists even when no migration is pending.
  return connection.queries.filter(
    (sql) =>
      /^(?:CREATE|ALTER|DROP|INSERT)\b/i.test(sql) &&
      !/^create table if not exists `__drizzle_migrations`/i.test(sql),
  );
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
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining("phase=tls category=verification-failed"),
      );
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

  it("reports empty inherited environment values before opening a connection", async () => {
    expect(await runTestingMigration({ APP_ENV: "", DATABASE_URL: "" })).toBe(1);
    expect(mysql.createConnection).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("phase=environment category=invalid-config"),
    );
  });

  it.each([
    ["ETIMEDOUT", "connection", "timeout"],
    ["ER_ACCESS_DENIED_ERROR", "connection", "authentication"],
    ["HANDSHAKE_SSL_ERROR", "tls", "verification-failed"],
  ])(
    "classifies handshake failure %s without logging the raw error",
    async (code, phase, category) => {
      connection.handshakeError = Object.assign(
        new Error(testingEnvironment.DATABASE_URL),
        { code, stack: "private stack trace" },
      );
      expect(await runTestingMigration(testingEnvironment)).toBe(1);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);
      expect(connection.queries).toEqual([]);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining(`phase=${phase} category=${category}`),
      );
      expect(JSON.stringify(error.mock.calls)).not.toMatch(
        /fixture_password|private stack trace/,
      );
    },
  );

  it("classifies a direct mysql2 ledger read rejection as SQL", async () => {
    vi.spyOn(connection, "execute").mockRejectedValueOnce(
      Object.assign(new Error("private server message"), {
        code: "ER_TABLEACCESS_DENIED_ERROR",
        errno: 1142,
        sqlState: "42000",
      }),
    );
    expect(await runTestingMigration(testingEnvironment)).toBe(1);
    expect(migrationWrites(connection)).toEqual([]);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("phase=sql category=permission-denied"),
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain(
      "private server message",
    );
  });

  it("applies pending 0002 through 0004 in order while preserving the historical CRLF ledger row", async () => {
    expect(await runTestingMigration(testingEnvironment)).toBe(0);
    expect(migrationWrites(connection)).toEqual([
      ...ordersWrites,
      ...dummyOperationsWrites,
      ...benchmarkCasesWrites,
    ]);
    expect(connection.ledger).toEqual([
      ...testingLedger(),
      ordersEntry,
      dummyOperationsEntry,
      benchmarkCasesEntry,
    ]);
  });

  it("does not retry a lost 0002 ledger acknowledgement", async () => {
    connection.failAfterLedgerWrite = true;
    expect(await runTestingMigration(testingEnvironment)).toBe(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(migrationWrites(connection)).toEqual(ordersWrites);
    expect(connection.ledger).toEqual([...testingLedger(), ordersEntry]);
    expect(connection.stream.closed).toBe(true);
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
    expect(migrationWrites(connection)).toEqual([
      ...scenariosWrites,
      ...ordersWrites,
      ...dummyOperationsWrites,
      ...benchmarkCasesWrites,
    ]);
    expect(connection.ledger).toEqual([
      ...initial,
      { ...initialLedger()[1], created_at: 1793441266963 },
      ordersEntry,
      dummyOperationsEntry,
      benchmarkCasesEntry,
    ]);
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
  it("applies only pending 0002 through 0004 with their DDL, hashes, and journal timestamps in order", async () => {
    expect(await runDevelopmentMigration(environment)).toBe(0);
    expect(migrationWrites(connection)).toEqual([
      ...ordersWrites,
      ...dummyOperationsWrites,
      ...benchmarkCasesWrites,
    ]);
    expect(connection.ledger).toEqual([
      ...initialLedger(),
      ordersEntry,
      dummyOperationsEntry,
      benchmarkCasesEntry,
    ]);
  });

  it("applies only 0003 and 0004 when the ledger already contains 0000 through 0002", async () => {
    connection.ledger.push(asRecorded(ordersEntry));
    expect(await runDevelopmentMigration(environment)).toBe(0);
    expect(migrationWrites(connection)).toEqual([
      ...dummyOperationsWrites,
      ...benchmarkCasesWrites,
    ]);
    expect(connection.ledger).toEqual([
      ...initialLedger(),
      asRecorded(ordersEntry),
      dummyOperationsEntry,
      benchmarkCasesEntry,
    ]);
  });

  it("applies only 0004 when the ledger already contains 0000 through 0003", async () => {
    const recorded = [
      asRecorded(ordersEntry),
      asRecorded(dummyOperationsEntry),
    ];
    connection.ledger.push(...recorded);
    expect(await runDevelopmentMigration(environment)).toBe(0);
    expect(migrationWrites(connection)).toEqual(benchmarkCasesWrites);
    expect(connection.ledger).toEqual([
      ...initialLedger(),
      ...recorded,
      benchmarkCasesEntry,
    ]);
  });

  it("does not run migration DDL or insert a ledger row when 0004 is already recorded", async () => {
    const recorded = [
      ...initialLedger(),
      asRecorded(ordersEntry),
      asRecorded(dummyOperationsEntry),
      asRecorded(benchmarkCasesEntry),
    ];
    connection.ledger.push(...recorded.slice(2));
    expect(await runDevelopmentMigration(environment)).toBe(0);
    expect(migrationWrites(connection)).toEqual([]);
    expect(connection.ledger).toEqual(recorded);
    expect(connection.stream.closed).toBe(true);
  });

  it("stops after failed DDL without retry or custom ledger repair", async () => {
    connection.failAtForeignKey = true;
    connection.failClosing = true;
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    expect(migrationWrites(connection)).toEqual(ordersWrites.slice(0, 2));
    expect(connection.ledger).toEqual(initialLedger());
    expect(connection.queries).toContain("rollback"); // Drizzle control flow, not a DDL rollback guarantee.
    expect(connection.connection.stream.closed).toBe(true);
    expect(info).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("phase=sql category=query-failed"),
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain("ALTER TABLE");
    expect(JSON.stringify(error.mock.calls)).not.toContain("fixture_password");
  });

  it.each([
    {
      migration: "0002",
      recorded: [],
      entry: ordersEntry,
      writes: ordersWrites,
    },
    {
      migration: "0003",
      recorded: [asRecorded(ordersEntry)],
      entry: dummyOperationsEntry,
      writes: dummyOperationsWrites,
    },
    {
      migration: "0004",
      recorded: [asRecorded(ordersEntry), asRecorded(dummyOperationsEntry)],
      entry: benchmarkCasesEntry,
      writes: benchmarkCasesWrites,
    },
  ])(
    "stops after a lost $migration ledger acknowledgement without mutation retry",
    async ({ recorded, entry, writes }) => {
      connection.ledger.push(...recorded);
      connection.failAfterLedgerWrite = true;
      expect(await runDevelopmentMigration(environment)).toBe(1);
      expect(migrationWrites(connection)).toEqual(writes);
      expect(connection.ledger).toEqual([
        ...initialLedger(),
        ...recorded,
        entry,
      ]);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);
      expect(connection.stream.closed).toBe(true);
      expect(info).not.toHaveBeenCalled();
      expect(JSON.stringify(error.mock.calls)).not.toContain("mysql://");
    },
  );

  it("does not report success when connection closure fails", async () => {
    connection.failClosing = true;
    expect(await runDevelopmentMigration(environment)).toBe(1);
    expect(connection.ledger).toEqual([
      ...initialLedger(),
      ordersEntry,
      dummyOperationsEntry,
      benchmarkCasesEntry,
    ]);
    expect(migrationWrites(connection)).toEqual([
      ...ordersWrites,
      ...dummyOperationsWrites,
      ...benchmarkCasesWrites,
    ]);
    expect(connection.connection.stream.closed).toBe(true);
    expect(info).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("phase=cleanup category=close-failed"),
    );
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
