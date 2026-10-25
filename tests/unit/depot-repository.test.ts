// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { createDepotRepository } from "@/db/repositories/depot-repository";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";
const big = "9007199254740993",
  date = new Date("2026-01-01T00:00:00.000Z");
const input = {
  name: "Fixture Depot",
  address: null,
  latitude: 0,
  longitude: 0,
  isActive: true,
  createdAt: date,
  updatedAt: date,
};
function response(body: unknown) {
  return Response.json(body, {
    headers: { "TiDB-Session": "synthetic-session" },
  });
}
function rowReply(latitude = "0", active = "1") {
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
        big,
        "Fixture Depot",
        null,
        latitude,
        "0",
        active,
        "2026-01-01 00:00:00.000",
        "2026-01-01 00:00:00.000",
      ],
    ],
  };
}
describe("Depot Drizzle repository over synthetic HTTP transport", () => {
  it("is lazy and round-trips a large insert id without returningId arithmetic", async () => {
    const queries: string[] = [];
    const transport = vi.fn<DatabaseFetch>(async (_url, init) => {
      const query = JSON.parse(init!.body).query as string;
      queries.push(query);
      return response(
        query.startsWith("insert")
          ? { rowsAffected: 1, sLastInsertID: big }
          : rowReply(),
      );
    });
    const repo = createDepotRepository(() =>
      createDatabase(fakeDatabaseUrl, transport),
    );
    expect(transport).not.toHaveBeenCalled();
    expect(await repo.insert(input)).toBe(BigInt(big));
    expect((await repo.findById(BigInt(big)))?.id.toString()).toBe(big);
    expect(queries).toHaveLength(2);
    expect(queries[1]).toContain(big);
    expect(queries[0]).toContain("2026-01-01");
  });
  it("uses bounded id ordering/pagination and validates affected counts", async () => {
    const queries: string[] = [];
    const transport: DatabaseFetch = async (_url, init) => {
      const query = JSON.parse(init!.body).query as string;
      queries.push(query);
      return response(
        query.startsWith("select") ? rowReply() : { rowsAffected: 0 },
      );
    };
    const repo = createDepotRepository(() =>
      createDatabase(fakeDatabaseUrl, transport),
    );
    expect(await repo.list({ after: BigInt(big), limit: 2 })).toHaveLength(1);
    expect(queries[0]).toContain("order by");
    expect(queries[0]).toContain("limit 2");
    expect(queries[0]).toContain(big);
    expect(await repo.update(BigInt(big), { ...input, updatedAt: date })).toBe(
      0,
    );
    expect(await repo.remove(BigInt(big))).toBe(0);
  });
  it.each([null, 1, "01", "9223372036854775808"])(
    "rejects lost/malformed insert metadata as outcome-unknown",
    async (value) => {
      const transport = vi.fn<DatabaseFetch>(async () =>
        response({ rowsAffected: 1, sLastInsertID: value }),
      );
      const repo = createDepotRepository(() =>
        createDatabase(fakeDatabaseUrl, transport),
      );
      await expect(repo.insert(input)).rejects.toMatchObject({
        code: "MUTATION_OUTCOME_UNKNOWN",
      });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    ["1junk", "1"],
    ["0", "2"],
    ["NaN", "1"],
  ])(
    "rejects malformed numeric/boolean readbacks before coercion",
    async (lat, active) => {
      const repo = createDepotRepository(() =>
        createDatabase(fakeDatabaseUrl, async () =>
          response(rowReply(lat, active)),
        ),
      );
      await expect(repo.findById(BigInt(big))).rejects.toThrow();
    },
  );
  it("retains unknown write outcomes and does not retry a transport failure", async () => {
    const transport = vi.fn<DatabaseFetch>(async () => {
      throw new Error("synthetic private URL");
    });
    const repo = createDepotRepository(() =>
      createDatabase(fakeDatabaseUrl, transport),
    );
    await expect(repo.remove(BigInt(big))).rejects.toMatchObject({
      code: "MUTATION_OUTCOME_UNKNOWN",
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("rejects a row whose id conflicts with the requested identity", async () => {
    const repo = createDepotRepository(() =>
      createDatabase(fakeDatabaseUrl, async () => response(rowReply())),
    );
    await expect(
      repo.findById(BigInt("9007199254740994")),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
