// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase, getDatabase } from "@/db/client";
import { HttpError } from "@/lib/http/request-security";
import { GET, POST } from "@/app/api/depots/route";
import { GET as detail, PUT, DELETE } from "@/app/api/depots/[id]/route";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";
const boundary = vi.hoisted(() => ({ status: 0 }));
vi.mock("@/lib/security/admin", () => ({
  requireAdmin: async () => {
    if (boundary.status)
      throw new HttpError(boundary.status, "UNAUTHORIZED", "Access denied.");
    return { origin: "http://localhost:3000" };
  },
}));
vi.mock("@/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db/client")>()),
  getDatabase: vi.fn(),
}));
const id = "9007199254740993";
const input = {
  name: "Fixture Depot",
  address: null,
  latitude: 0,
  longitude: 0,
  isActive: true,
};
let replies: unknown[], queries: string[];
function rows() {
  return {
    types: [
      ["id", "BIGINT"],
      ["name", "VARCHAR"],
      ["address", "TEXT"],
      ["latitude", "VARCHAR"],
      ["longitude", "VARCHAR"],
      ["is_active", "VARCHAR"],
      ["created_at", "DATETIME"],
      ["updated_at", "DATETIME"],
    ].map(([name, type]) => ({ name, type })),
    rows: [
      [
        id,
        "Fixture Depot",
        null,
        "0",
        "0",
        "1",
        "2026-01-01 00:00:00.000",
        "2026-01-01 00:00:00.000",
      ],
    ],
  };
}
function request(
  method = "GET",
  body?: unknown,
  url = "http://localhost:3000/api/depots",
  origin = "http://localhost:3000",
) {
  const payload = method === "DELETE" && body === undefined ? {} : body;
  return new Request(url, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
}
const context = () => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  boundary.status = 0;
  replies = [];
  queries = [];
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("DATABASE_URL", fakeDatabaseUrl);
  const transport: DatabaseFetch = async (_url, init) => {
    queries.push(JSON.parse(init!.body).query);
    if (!replies.length) throw new Error("Unexpected synthetic SQL");
    const next = replies.shift();
    return next instanceof Response
      ? next
      : Response.json(next, {
          headers: { "TiDB-Session": "synthetic-session" },
        });
  };
  vi.mocked(getDatabase).mockImplementation(() =>
    createDatabase(fakeDatabaseUrl, transport),
  );
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
describe("protected Depot HTTP contracts", () => {
  it("rejects DELETE media/body violations before DB acquisition", async () => {
    for (const [media, body, status] of [
      ["text/plain", "{}", 415],
      [undefined, "{}", 415],
      ["application/json", "{", 400],
      ["application/json", undefined, 400],
      ["application/json", JSON.stringify({ value: "x".repeat(17000) }), 413],
    ] as const) {
      const headers = new Headers({ origin: "http://localhost:3000" });
      if (media) headers.set("content-type", media);
      const response = await DELETE(
        new Request("http://localhost:3000/api/depots/" + id, {
          method: "DELETE",
          headers,
          body,
        }),
        context(),
      );
      expect(response.status).toBe(status);
    }
    expect(getDatabase).not.toHaveBeenCalled();
    expect(queries).toEqual([]);
  });
  it.each([401, 403, 503])(
    "rejects every entry before DB acquisition on auth %i",
    async (status) => {
      boundary.status = status;
      const responses = await Promise.all([
        GET(request()),
        POST(request("POST", input)),
        detail(request(), context()),
        PUT(request("PUT", input), context()),
        DELETE(request("DELETE"), context()),
      ]);
      expect(responses.map((r) => r.status)).toEqual([
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
  it("lists and reads lossless string ids with private no-store envelopes", async () => {
    replies = [rows(), rows()];
    const list = await GET(request());
    expect(list.status).toBe(200);
    expect(await list.json()).toMatchObject({
      data: [{ id }],
      nextCursor: null,
    });
    expect(list.headers.get("cache-control")).toBe("private, no-store");
    const found = await detail(request(), context());
    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({ data: { id } });
  });
  it("creates, no-op updates and deletes with their exact status contracts", async () => {
    replies = [{ rowsAffected: 1, sLastInsertID: id }, rows()];
    const created = await POST(request("POST", input));
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ data: { id } });
    replies = [{ rowsAffected: 0 }, rows()];
    expect((await PUT(request("PUT", input), context())).status).toBe(200);
    replies = [{ rowsAffected: 1 }];
    const removed = await DELETE(request("DELETE"), context());
    expect(removed.status).toBe(204);
    expect(await removed.text()).toBe("");
  });
  it("maps missing rows to 404 without inventing child relations", async () => {
    replies = [{ types: [], rows: [] }];
    expect((await detail(request(), context())).status).toBe(404);
    replies = [{ rowsAffected: 0 }];
    expect((await DELETE(request("DELETE"), context())).status).toBe(404);
    expect(queries.every((q) => !q.includes("scenarios"))).toBe(true);
  });
  it("validates origin, id, query and fields before DB construction", async () => {
    expect(
      (
        await POST(
          request("POST", input, undefined, "https://attacker.invalid"),
        )
      ).status,
    ).toBe(403);
    expect(
      (await POST(request("POST", { ...input, latitude: "0" }))).status,
    ).toBe(400);
    expect(
      (
        await GET(
          request(
            "GET",
            undefined,
            "http://localhost:3000/api/depots?limit=101",
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
  it("rejects a Production logical target in local Dev with zero SQL", async () => {
    vi.stubEnv("DATABASE_URL", fakeDatabaseUrl.replace("_dev", "_production"));
    expect((await GET(request())).status).toBe(503);
    expect(getDatabase).not.toHaveBeenCalled();
    expect(queries).toEqual([]);
  });
  it("returns 400 for a nonnumeric id without acquiring the DB", async () => {
    expect(
      (
        await detail(request(), {
          params: Promise.resolve({ id: "not-an-id" }),
        })
      ).status,
    ).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it("maps only a definitive structured FK rejection to 409 and redacts other provider failures", async () => {
    replies = [
      Response.json(
        { message: "synthetic private SQL detail", code: 1451 },
        { status: 409 },
      ),
    ];
    const conflict = await DELETE(request("DELETE"), context());
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      error: { code: "DEPOT_IN_USE", message: "Depot is referenced." },
    });
    replies = [
      Response.json(
        { message: "synthetic private SQL detail", code: 9999 },
        { status: 500 },
      ),
    ];
    const failure = await DELETE(request("DELETE"), context());
    expect(failure.status).toBe(503);
    expect(JSON.stringify(await failure.json())).not.toContain(
      "synthetic private SQL detail",
    );
    expect(queries).toHaveLength(2);
  });
  it("labels committed-insert/readback failure as unknown, without automatic retry or SQL leakage", async () => {
    replies = [{ rowsAffected: 1, sLastInsertID: id }];
    const response = await POST(request("POST", input));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "MUTATION_OUTCOME_UNKNOWN",
        message:
          "Mutation outcome unknown. Refresh the list before another attempt.",
      },
    });
    expect(queries).toHaveLength(2);
  });
});
