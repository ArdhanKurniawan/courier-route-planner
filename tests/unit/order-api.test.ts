// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConnection } from "mysql2";
import { createDatabase, getDatabase } from "@/db/client";
import { HttpError } from "@/lib/http/request-security";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";
import {
  orderInput,
  orderWire,
  orderDtoFixture as dto,
  flag,
  countWire,
} from "../fixtures/order";
const boundary = vi.hoisted(() => ({ status: 0 }));
vi.mock("mysql2", () => ({ createConnection: vi.fn() }));
vi.mock("@/lib/security/admin", () => ({
  requireAdmin: async () => {
    if (boundary.status)
      throw new HttpError(boundary.status, "UNAUTHORIZED", "Access denied.");
    return { origin: "http://localhost:3000" };
  },
}));
vi.mock("@/db/client", async (original) => ({
  ...(await original<typeof import("@/db/client")>()),
  getDatabase: vi.fn(),
}));
import * as collection from "@/app/api/scenarios/[id]/orders/route";
import * as item from "@/app/api/scenarios/[id]/orders/[orderId]/route";
let replies: unknown[], queries: string[], countReply: unknown;
const sid = dto.scenarioId,
  id = dto.id;
const ctx = (scenarioId = sid, orderId = id) => ({
  params: Promise.resolve({ id: scenarioId, orderId }),
});
const parentWire = { types: [{ name: "id", type: "BIGINT" }], rows: [[sid]] };
function req(
  method = "GET",
  body?: unknown,
  origin = "http://localhost:3000",
  query = "",
) {
  return new Request(
    "http://localhost:3000/api/scenarios/" + sid + "/orders" + query,
    {
      method,
      headers: { origin, "content-type": "application/json" },
      ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }),
    },
  );
}
beforeEach(() => {
  boundary.status = 0;
  replies = [];
  queries = [];
  countReply = undefined;
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("DATABASE_URL", fakeDatabaseUrl);
  const transport: DatabaseFetch = async (_url, init) => {
    const query = JSON.parse(init!.body).query;
    queries.push(query);
    const next =
      query.includes("count(*)") && countReply !== undefined
        ? countReply
        : replies.shift();
    if (next === undefined) throw Error("Unexpected synthetic SQL");
    return next instanceof Response
      ? next
      : Response.json(next, { headers: { "TiDB-Session": "synthetic" } });
  };
  vi.mocked(getDatabase).mockImplementation(() =>
    createDatabase(fakeDatabaseUrl, transport),
  );
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

describe("Production Order mutation boundary", () => {
  const database = "courier_route_planner_production";
  const dummy = orderWire();
  dummy.rows[0][7] = "dummy";

  function production(mode?: string) {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_TARGET_ENV", "production");
    vi.stubEnv("DUMMY_GENERATOR_PRODUCTION_MODE", mode);
    vi.stubEnv(
      "DATABASE_URL",
      `mysql://fake_app:fake@production.invalid:4000/${database}`,
    );

    const query = vi.fn<
      (
        options: { sql: string; timeout: number },
        values: unknown[],
      ) => Promise<unknown>
    >(() => {
      throw new Error("Unexpected synthetic MySQL query");
    });
    const end = vi.fn().mockResolvedValue(undefined);
    const destroy = vi.fn();
    vi.mocked(createConnection).mockReturnValue({
      destroy,
      on: vi.fn(),
      stream: { encrypted: true, authorized: true, destroy },
      promise: () => ({
        connect: vi.fn().mockResolvedValue(undefined),
        query,
        end,
      }),
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
          {
            grants:
              "GRANT SELECT, INSERT, UPDATE, DELETE ON `courier\\_route\\_planner\\_production`.* TO 'fake_app'@'%'",
          },
        ],
      ])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([
        [
          {
            id: sid,
            depotId: "20",
            name: "Synthetic Scenario",
            distributionPattern: "random",
            status: "draft",
            customerCount: "3",
            radiusMinM: null,
            radiusMaxM: null,
            generationSeed: null,
            updatedAt: "2026-01-01 00:00:00.000000",
          },
        ],
      ]);
    return { query, end, destroy };
  }

  const methods = ["PUT", "DELETE"] as const;
  const mutate = (method: (typeof methods)[number]) =>
    item[method](req(method, method === "PUT" ? orderInput : {}), ctx());
  const httpWrites = () =>
    queries.filter((sql) => /^(update|delete)\b/i.test(sql));

  describe.each(methods)("%s", (method) => {
    const dummyWrite =
      method === "PUT" ? "UPDATE orders SET" : "DELETE FROM orders";

    it.each(["disabled", "recovery", "Enabled", undefined])(
      "denies a dummy write in mode %s with no HTTP write or TCP connection",
      async (mode) => {
        production(mode);
        replies = [
          flag("1"),
          dummy,
          flag("0"),
          { rowsAffected: 1 },
          flag("1"),
          dummy,
        ];

        const response = await mutate(method);

        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({
          error: { code: "UNAVAILABLE" },
        });
        expect(httpWrites()).toEqual([]);
        expect(createConnection).not.toHaveBeenCalled();
      },
    );

    it("denies invalid target bindings before any mutation", async () => {
      production("enabled");
      vi.stubEnv("VERCEL_TARGET_ENV", "preview");
      replies = [flag("1"), dummy];
      expect((await mutate(method)).status).toBe(503);
      expect(httpWrites()).toEqual([]);
      expect(createConnection).not.toHaveBeenCalled();

      vi.stubEnv("VERCEL_TARGET_ENV", "production");
      vi.stubEnv(
        "DATABASE_URL",
        "mysql://fake_app:fake@testing.invalid:4000/courier_route_planner_testing",
      );
      queries = [];
      expect((await mutate(method)).status).toBe(503);
      expect(queries).toEqual([]);
      expect(createConnection).not.toHaveBeenCalled();
    });

    it("in enabled mode writes dummy rows only after both locks on one TLS connection", async () => {
      const { query, end } = production("enabled");
      replies = [flag("1"), dummy, flag("1"), dummy];
      query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{}]);

      expect((await mutate(method)).status).toBe(method === "PUT" ? 200 : 204);
      expect(createConnection).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          database,
          ssl: { rejectUnauthorized: true, verifyIdentity: true },
        }),
      );
      expect(query.mock.calls.map(([options]) => options.sql).slice(2)).toEqual(
        [
          "BEGIN PESSIMISTIC",
          expect.stringMatching(/FROM scenarios.*FOR UPDATE NOWAIT/),
          expect.stringMatching(
            /FROM dummy_order_operations.*active_scenario_id.*FOR UPDATE NOWAIT/,
          ),
          expect.stringContaining(dummyWrite),
          "COMMIT",
        ],
      );
      expect(query.mock.calls[5][0].sql).toMatch(
        /WHERE scenario_id = CAST\(\? AS SIGNED\) AND id = CAST\(\? AS SIGNED\) AND source = 'dummy'$/,
      );
      expect(query.mock.calls[5][1].slice(-2)).toEqual([sid, id]);
      expect(end).toHaveBeenCalledOnce();
      expect(httpWrites()).toEqual([]);
    });

    it("rolls back and rejects an active ledger operation before Order DML", async () => {
      const { query, end } = production("enabled");
      replies = [flag("1"), dummy];
      query
        .mockResolvedValueOnce([
          [
            {
              operationId: "00000000-0000-4000-8000-000000000011",
              operationVersion: "1",
              scenarioId: sid,
              activeScenarioId: sid,
              requestHash: "a".repeat(64),
              beforeHash: "b".repeat(64),
              afterHash: null,
              status: "pending",
              savedCount: 0,
              replacedCount: 0,
            },
          ],
        ])
        .mockResolvedValueOnce([{}]);

      const response = await mutate(method);
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { code: "DUMMY_OPERATION_PENDING" },
      });
      expect(query.mock.calls.slice(4).map(([options]) => options.sql)).toEqual(
        [expect.stringContaining("FROM dummy_order_operations"), "ROLLBACK"],
      );
      expect(end).toHaveBeenCalledOnce();
      expect(httpWrites()).toEqual([]);
    });

    it("preserves manual CRUD in disabled mode through source-scoped HTTP SQL", async () => {
      production("disabled");
      replies =
        method === "PUT"
          ? [
              flag("1"),
              orderWire(),
              flag("0"),
              { rowsAffected: 0 },
              flag("1"),
              orderWire(),
            ]
          : [flag("1"), orderWire(), { rowsAffected: 1 }];

      expect((await mutate(method)).status).toBe(method === "PUT" ? 200 : 204);
      expect(httpWrites()).toEqual([
        expect.stringMatching(
          /where.*scenario_id.*and.*id.*and.*`source` = 'manual'/i,
        ),
      ]);
      expect(createConnection).not.toHaveBeenCalled();
    });

    it("rejects a manual-to-dummy race at the SQL write without a fallback", async () => {
      production("disabled");
      replies =
        method === "PUT"
          ? [
              flag("1"),
              orderWire(),
              flag("0"),
              { rowsAffected: 0 },
              flag("1"),
              dummy,
            ]
          : [flag("1"), orderWire(), { rowsAffected: 0 }];

      const response = await mutate(method);
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        error: { code: "NOT_FOUND" },
      });
      expect(httpWrites()).toEqual([
        expect.stringMatching(/where.*`source` = 'manual'/i),
      ]);
      expect(createConnection).not.toHaveBeenCalled();
    });

    it("rejects a dummy-to-manual race without switching to the HTTP path", async () => {
      const { query } = production("enabled");
      replies = [flag("1"), dummy, flag("1"), orderWire()];
      query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ affectedRows: 0 }])
        .mockResolvedValueOnce([{}]);

      const response = await mutate(method);
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        error: { code: "NOT_FOUND" },
      });
      expect(query.mock.calls[5][0].sql).toMatch(/WHERE .*source = 'dummy'$/);
      expect(httpWrites()).toEqual([]);
    });

    it("does not retry or fall back if the guarded COMMIT acknowledgement is lost", async () => {
      const { query, destroy } = production("enabled");
      replies = [flag("1"), dummy];
      query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockRejectedValueOnce(new Error("TCP acknowledgement lost"));

      const response = await mutate(method);
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { code: "MUTATION_OUTCOME_UNKNOWN" },
      });
      expect(query.mock.calls.slice(5).map(([options]) => options.sql)).toEqual(
        [
          expect.stringContaining(dummyWrite),
          "COMMIT",
        ],
      );
      expect(createConnection).toHaveBeenCalledOnce();
      expect(destroy).toHaveBeenCalled();
      expect(httpWrites()).toEqual([]);
    });
  });
});

describe("Scenario-scoped protected Order API", () => {
  it.each([401, 403, 503])(
    "denies all five handlers on auth %i before DB",
    async (status) => {
      boundary.status = status;
      const results = await Promise.all([
        collection!.GET(req(), ctx()),
        collection!.POST(req("POST", orderInput), ctx()),
        item!.GET(req(), ctx()),
        item!.PUT(req("PUT", orderInput), ctx()),
        item!.DELETE(req("DELETE"), ctx()),
      ]);
      expect(results.map((r) => r.status)).toEqual([
        status,
        status,
        status,
        status,
        status,
      ]);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
  it("lists/counts and reads lossless private no-store data", async () => {
    replies = [parentWire, orderWire(), flag("1"), orderWire()];
    countReply = countWire("88");
    const response = await collection!.GET(req(), ctx());
    expect(
      response.status,
      JSON.stringify({ queries, body: await response.clone().json() }),
    ).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      data: [dto],
      nextCursor: null,
      totalCount: "88",
    });
    expect(await (await item!.GET(req(), ctx())).json()).toEqual({ data: dto });
  });
  it("creates uppercase manual data, updates and deletes with expected envelopes", async () => {
    replies = [
      parentWire,
      flag("0"),
      { rowsAffected: 1, sLastInsertID: id },
      flag("1"),
      orderWire(),
      flag("1"),
      orderWire(),
      flag("0"),
      { rowsAffected: 0 },
      flag("1"),
      orderWire(),
      flag("1"),
      orderWire(),
      { rowsAffected: 1 },
    ];
    const created = await collection!.POST(req("POST", orderInput), ctx());
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ data: dto });
    expect((await item!.PUT(req("PUT", orderInput), ctx())).status).toBe(200);
    const deleted = await item!.DELETE(req("DELETE"), ctx());
    expect(deleted.status).toBe(204);
    expect(await deleted.text()).toBe("");
  });
  it.each(["source", "scenarioId", "id"])(
    "rejects forged %s without DB",
    async (key) => {
      expect(
        (
          await collection!.POST(
            req("POST", { ...orderInput, [key]: "dummy" }),
            ctx(),
          )
        ).status,
      ).toBe(400);
      expect(
        (await item!.PUT(req("PUT", { ...orderInput, [key]: "dummy" }), ctx()))
          .status,
      ).toBe(400);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
  it("rejects wrong Origin, invalid ids, coordinates and query before DB", async () => {
    expect(
      (
        await collection!.POST(
          req("POST", orderInput, "https://attacker.invalid"),
          ctx(),
        )
      ).status,
    ).toBe(403);
    expect(
      (await item!.DELETE(req("DELETE", {}, "https://attacker.invalid"), ctx()))
        .status,
    ).toBe(403);
    expect((await collection!.GET(req(), ctx("01"))).status).toBe(400);
    expect(
      (await item!.GET(req(), ctx(sid, "9223372036854775808"))).status,
    ).toBe(400);
    expect(
      (
        await collection!.POST(
          req("POST", { ...orderInput, latitude: 91 }),
          ctx(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await collection!.GET(
          req("GET", undefined, undefined, "?limit=101"),
          ctx(),
        )
      ).status,
    ).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { rowsAffected: 0 },
    { types: [], rows: [] },
    { types: orderWire().types },
    Response.json({ message: "synthetic provider error" }, { status: 503 }),
  ])(
    "rejects a failed or incomplete SELECT when the Order count is positive (%j)",
    async (listResponse) => {
      replies = [parentWire, listResponse];
      countReply = countWire("2");
      const response = await collection.GET(req(), ctx());
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { code: "UNAVAILABLE" },
      });
      expect(queries).toHaveLength(3);
      expect(queries.every((query) => /^\s*select\b/i.test(query))).toBe(true);
    },
  );
  it("uses a verified zero count for the Map without issuing an empty row SELECT", async () => {
    replies = [parentWire, { types: orderWire().types }];
    countReply = countWire("0");

    const response = await collection.GET(
      req("GET", undefined, undefined, "?limit=100"),
      ctx(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      data: [],
      nextCursor: null,
      totalCount: "0",
    });
    expect(queries).toHaveLength(2);
    expect(queries[1]).toMatch(/count\(\*\).*where.*scenario_id/i);
  });
  it("does not treat a zero decoded from invalid count metadata as absence", async () => {
    replies = [parentWire, { ...orderWire(), rows: [] }];
    countReply = {
      types: [{ name: "total", type: "JSON" }],
      rows: [['"0"']],
    };

    const response = await collection.GET(req(), ctx());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAVAILABLE" },
    });
    expect(queries).toHaveLength(2);
  });
  it("rejects a first page whose empty row list contradicts a positive count", async () => {
    replies = [parentWire, { ...orderWire(), rows: [] }];
    countReply = countWire("2");
    const response = await collection.GET(req(), ctx());
    expect(response.status).toBe(503);
  });
  it.each([
    { query: "", count: "0" },
    { query: "?after=" + id, count: "2" },
  ])(
    "accepts an empty first or exhausted cursor page with complete metadata",
    async ({ query, count }) => {
      replies = [parentWire, { ...orderWire(), rows: [] }];
      countReply = countWire(count);
      const response = await collection.GET(
        req("GET", undefined, undefined, query),
        ctx(),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        data: [],
        nextCursor: null,
        totalCount: count,
      });
    },
  );
  it("rejects cross-Scenario access without moving or modifying another record", async () => {
    replies = [flag("0"), flag("0"), flag("0")];
    const read = await item!.GET(req(), ctx("2"));
    expect(read.status).toBe(404);
    expect(await read.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect((await item!.PUT(req("PUT", orderInput), ctx("2"))).status).toBe(
      404,
    );
    expect((await item!.DELETE(req("DELETE"), ctx("2"))).status).toBe(404);
    expect(queries.every((q) => /scenario_id/.test(q))).toBe(true);
    expect(queries.some((q) => /^update/i.test(q))).toBe(false);
  });
  it("returns a definitive duplicate as 409 and preserves generic write uncertainty", async () => {
    replies = [parentWire, flag("1")];
    const duplicate = await collection!.POST(req("POST", orderInput), ctx());
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      error: { code: "ORDER_CODE_CONFLICT" },
    });
    replies = [
      parentWire,
      flag("0"),
      Response.json(
        { code: 61100002, message: "synthetic secret" },
        { status: 500 },
      ),
    ];
    const unknown = await collection!.POST(req("POST", orderInput), ctx());
    expect(unknown.status).toBe(503);
    const body = await unknown.text();
    expect(body).toContain("MUTATION_OUTCOME_UNKNOWN");
    expect(body).not.toContain("synthetic secret");
  });
  it("rejects invalid environment before DB", async () => {
    vi.stubEnv("APP_ENV", "production");
    expect((await collection!.GET(req(), ctx())).status).toBe(503);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it.each([
    ["text/plain", "{}", 415],
    ["application/json", "{", 400],
    ["application/json", "x".repeat(17000), 413],
  ] as const)("bounds media/body %s", async (type, body, status) => {
    const request = new Request(
      "http://localhost:3000/api/scenarios/" + sid + "/orders/" + id,
      {
        method: "DELETE",
        headers: { origin: "http://localhost:3000", "content-type": type },
        body,
      },
    );
    expect((await item!.DELETE(request, ctx())).status).toBe(status);
    expect(getDatabase).not.toHaveBeenCalled();
  });
});
