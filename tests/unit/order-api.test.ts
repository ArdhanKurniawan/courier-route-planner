// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
let replies: unknown[], queries: string[], parallelCount: unknown;
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
  parallelCount = undefined;
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("DATABASE_URL", fakeDatabaseUrl);
  const transport: DatabaseFetch = async (_url, init) => {
    const query = JSON.parse(init!.body).query;
    queries.push(query);
    const next =
      query.includes("count(*)") && parallelCount !== undefined
        ? parallelCount
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
    replies = [parentWire, orderWire(), orderWire()];
    parallelCount = countWire("88");
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
      orderWire(),
      orderWire(),
      flag("0"),
      { rowsAffected: 0 },
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
  it.each([{}, { rowsAffected: 0 }, { types: [], rows: [] }])(
    "rejects an incomplete HTTP success when the Order count is positive (%j)",
    async (listResponse) => {
      replies = [parentWire, listResponse];
      parallelCount = countWire("2");
      const response = await collection.GET(req(), ctx());
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { code: "UNAVAILABLE" },
      });
      expect(queries).toHaveLength(3);
      expect(queries.every((query) => /^\s*select\b/i.test(query))).toBe(true);
    },
  );
  it("rejects a first page whose empty row list contradicts a positive count", async () => {
    replies = [parentWire, { ...orderWire(), rows: [] }];
    parallelCount = countWire("2");
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
      parallelCount = countWire(count);
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
    replies = [
      { ...orderWire(), rows: [] },
      { ...orderWire(), rows: [] },
      { rowsAffected: 0 },
    ];
    expect((await item!.GET(req(), ctx("2"))).status).toBe(404);
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
