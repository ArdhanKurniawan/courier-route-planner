// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase, getDatabase } from "@/db/client";
import { HttpError } from "@/lib/http/request-security";
import { GET, POST } from "@/app/api/scenarios/route";
import { GET as detail, PUT, DELETE } from "@/app/api/scenarios/[id]/route";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";
import { flag } from "../fixtures/order";
import {
  scenarioInput as input,
  scenarioWire,
  scenarioDtoFixture,
} from "../fixtures/scenario";
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
let replies: unknown[], queries: string[];
const id = "9007199254740995",
  context = () => ({ params: Promise.resolve({ id }) });
function request(
  method = "GET",
  body?: unknown,
  url = "http://localhost:3000/api/scenarios",
  origin = "http://localhost:3000",
) {
  return new Request(url, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }),
  });
}
beforeEach(() => {
  boundary.status = 0;
  replies = [];
  queries = [];
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("DATABASE_URL", fakeDatabaseUrl);
  const transport: DatabaseFetch = async (_url, init) => {
    queries.push(JSON.parse(init!.body).query);
    if (!replies.length) throw new Error("Unexpected fixture SQL");
    const value = replies.shift();
    return value instanceof Response
      ? value
      : Response.json(value, {
          headers: { "TiDB-Session": "synthetic-session" },
        });
  };
  vi.mocked(getDatabase).mockImplementation(() =>
    createDatabase(fakeDatabaseUrl, transport),
  );
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
describe("Scenario protected HTTP contracts", () => {
  it.each([401, 403, 503])(
    "denies all five handlers on auth %i before DB acquisition",
    async (status) => {
      boundary.status = status;
      const result = await Promise.all([
        GET(request()),
        POST(request("POST", input)),
        detail(request(), context()),
        PUT(request("PUT", input), context()),
        DELETE(request("DELETE"), context()),
      ]);
      expect(result.map((r) => r.status)).toEqual([
        status,
        status,
        status,
        status,
        status,
      ]);
      expect(getDatabase).not.toHaveBeenCalled();
      expect(queries).toEqual([]);
    },
  );
  it("lists and reads protected no-store JSON with lossless ids and seeds", async () => {
    replies = [scenarioWire(), scenarioWire()];
    const list = await GET(request());
    expect(list.status).toBe(200);
    expect(list.headers.get("cache-control")).toBe("private, no-store");
    expect(await list.json()).toEqual({
      data: [scenarioDtoFixture],
      nextCursor: null,
    });
    const response = await detail(request(), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: scenarioDtoFixture });
  });
  it("creates/updates/deletes only its selected Scenario and returns expected envelopes", async () => {
    replies = [
      { rowsAffected: 1, sLastInsertID: id },
      scenarioWire(),
      { rowsAffected: 0 },
      scenarioWire(),
      flag("0"),
      { rowsAffected: 1 },
    ];
    const create = await POST(request("POST", input));
    expect(create.status).toBe(201);
    expect(await create.json()).toEqual({ data: scenarioDtoFixture });
    expect((await PUT(request("PUT", input), context())).status).toBe(200);
    const remove = await DELETE(request("DELETE"), context());
    expect(remove.status).toBe(204);
    expect(await remove.text()).toBe("");
    expect(remove.headers.get("cache-control")).toBe("private, no-store");
    expect(queries).toHaveLength(6);
    expect(queries[5]).toContain(id);
  });
  it("rejects Origin violations, invalid lifecycle/config and malformed query before DB", async () => {
    expect(
      (
        await POST(
          request("POST", input, undefined, "https://attacker.invalid"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await PUT(
          request("PUT", input, undefined, "https://attacker.invalid"),
          context(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await DELETE(
          request("DELETE", {}, undefined, "https://attacker.invalid"),
          context(),
        )
      ).status,
    ).toBe(403);
    expect(
      (await POST(request("POST", { ...input, status: "draft" }))).status,
    ).toBe(400);
    expect(
      (await POST(request("POST", { ...input, radiusMaxM: -1 }))).status,
    ).toBe(400);
    expect(
      (
        await GET(
          request(
            "GET",
            undefined,
            "http://localhost:3000/api/scenarios?limit=101",
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (await detail(request(), { params: Promise.resolve({ id: "01" }) }))
        .status,
    ).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it.each([
    ["text/plain", "{}", 415],
    ["application/json", "{", 400],
    ["application/json", "x".repeat(17000), 413],
  ] as const)(
    "rejects invalid body/media %s before DB",
    async (media, body, status) => {
      const response = await DELETE(
        new Request("http://localhost:3000/api/scenarios/" + id, {
          method: "DELETE",
          body,
          headers: { origin: "http://localhost:3000", "content-type": media },
        }),
        context(),
      );
      expect(response.status).toBe(status);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
  it("rejects cross-environment configuration without acquiring the DB", async () => {
    vi.stubEnv("APP_ENV", "production");
    expect((await GET(request())).status).toBe(503);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it("returns 409 for definitive Depot/child conflicts and never leaks SQL details", async () => {
    replies = [
      { rowsAffected: 0, sLastInsertID: null },
      flag("0"),
      Response.json(
        { code: 1451, message: "synthetic private SQL" },
        { status: 409 },
      ),
    ];
    const create = await POST(request("POST", input));
    expect(create.status).toBe(409);
    expect(await create.json()).toMatchObject({
      error: { code: "INVALID_DEPOT" },
    });
    const remove = await DELETE(request("DELETE"), context());
    expect(remove.status).toBe(409);
    const body = await remove.text();
    expect(body).toContain("SCENARIO_IN_USE");
    expect(body).not.toContain("synthetic private SQL");
  });
  it("preserves missing-id responses and unknown mutation outcomes without automatic retry", async () => {
    replies = [
      { types: [{ name: "id", type: "BIGINT" }], rows: [] },
      flag("0"),
      { rowsAffected: 0 },
    ];
    expect((await detail(request(), context())).status).toBe(404);
    expect((await DELETE(request("DELETE"), context())).status).toBe(404);
    replies = [
      { rowsAffected: 1, sLastInsertID: id },
      Response.json({ message: "synthetic secret" }, { status: 500 }),
    ];
    const response = await POST(request("POST", input));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "MUTATION_OUTCOME_UNKNOWN" },
    });
    expect(queries).toHaveLength(5);
  });
});
