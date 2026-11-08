// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";
import {
  orderRowFixture as row,
  orderWire,
  flag,
  countWire,
} from "../fixtures/order";
import { createOrderRepository } from "@/db/repositories/order-repository";
const sid = row.scenarioId,
  id = row.id;
const input = {
  orderCode: row.orderCode,
  customerName: row.customerName,
  address: row.address,
  latitude: row.latitude,
  longitude: row.longitude,
  source: row.source,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
};
function fixture(replies: unknown[]) {
  const queries: string[] = [],
    parameters: unknown[][] = [];
  const transport = vi.fn<DatabaseFetch>(async (_url, init) => {
    const r = JSON.parse(init!.body);
    queries.push(r.query);
    parameters.push(r.params ?? []);
    if (!replies.length) throw Error("Unexpected synthetic SQL");
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return next instanceof Response
      ? next
      : Response.json(next, {
          headers: { "TiDB-Session": "synthetic-session" },
        });
  });
  const acquire = vi.fn(() => createDatabase(fakeDatabaseUrl, transport));
  return {
    repo: createOrderRepository(acquire),
    acquire,
    transport,
    queries,
    parameters,
  };
}
describe("Order repository over synthetic TiDB HTTP", () => {
  it("acquires lazily and scopes reads/pagination to the selected Scenario", async () => {
    const f = fixture([orderWire(), orderWire()]);
    expect(f.acquire).not.toHaveBeenCalled();
    expect(
      await f.repo.list(sid, { after: id - BigInt("1"), limit: 2 }),
    ).toEqual([row]);
    expect(f.queries[0]).toMatch(
      /where.*scenario_id.*and.*id.*order by.*id.*limit 2/i,
    );
    expect(await f.repo.findById(sid, id)).toEqual(row);
    expect(f.queries[1]).toMatch(/where.*scenario_id.*and.*id/i);
  });
  it("rejects a row from another Scenario or a different requested id", async () => {
    await expect(
      fixture([orderWire()]).repo.findById(sid + BigInt("1"), id),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(
      fixture([orderWire()]).repo.findById(sid, id + BigInt("1")),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
  it.each([
    {},
    { rowsAffected: 0 },
    { types: [], rows: [] },
    { types: orderWire().types },
  ])(
    "rejects SELECT without result metadata or an explicit row payload (%j)",
    async (response) => {
      const f = fixture([response]);
      await expect(f.repo.list(sid, { limit: 10 })).rejects.toMatchObject({
        code: "UNAVAILABLE",
      });
      expect(f.queries).toHaveLength(1);
    },
  );
  it("counts all scoped rows without lossy conversion or configured-count dependency", async () => {
    const f = fixture([countWire("9007199254740993")]);
    expect(await f.repo.count(sid)).toBe(BigInt("9007199254740993"));
    expect(f.queries[0]).toMatch(/count\(\*\).*orders.*where.*scenario_id/i);
    await expect(
      fixture([countWire("1junk")]).repo.count(sid),
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
  it("uses a database-collated duplicate precheck, then one parent-guarded insert", async () => {
    const f = fixture([
      flag("0"),
      { rowsAffected: 1, sLastInsertID: id.toString() },
    ]);
    expect(await f.repo.insert(sid, input)).toBe(id);
    expect(f.queries[0]).toMatch(/exists.*orders.*scenario_id.*order_code/i);
    expect(f.queries[1]).toMatch(
      /insert into.*orders.*select.*scenarios.*where/i,
    );
    expect(f.queries.join(" ")).not.toContain("customer_count");
  });
  it("rejects a definitive duplicate before issuing any mutation", async () => {
    const f = fixture([flag("1")]);
    await expect(f.repo.insert(sid, input)).rejects.toMatchObject({
      code: "ORDER_CODE_CONFLICT",
    });
    expect(f.queries).toHaveLength(1);
  });
  it("fails closed before mutation on malformed duplicate readback", async () => {
    const f = fixture([flag("unknown")]);
    await expect(f.repo.insert(sid, input)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    expect(f.queries).toHaveLength(1);
  });
  it("updates only scoped mutable fields, excludes itself from duplicate check and preserves source", async () => {
    const f = fixture([flag("0"), { rowsAffected: 0 }]);
    expect(
      await f.repo.update(sid, id, {
        orderCode: row.orderCode,
        customerName: "Edited",
        address: null,
        latitude: 0,
        longitude: 0,
        updatedAt: row.updatedAt,
      }),
    ).toBe(0);
    expect(f.queries[0]).toMatch(/order_code.*id.*<>/i);
    expect(f.queries[1]).toMatch(/update.*where.*scenario_id.*and.*id/i);
    expect(f.queries[1].split(/where/i)[0]).not.toContain("source");
  });
  it("deletes only the scoped Order and preserves affected-row semantics", async () => {
    const f = fixture([{ rowsAffected: 0 }]);
    expect(await f.repo.remove(sid, id)).toBe(0);
    expect(f.queries[0]).toMatch(/delete.*where.*scenario_id.*and.*id/i);
  });
  it.each([1062, "1062", "ER_DUP_ENTRY"])(
    "maps definitive duplicate code %s without message matching",
    async (code) => {
      const f = fixture([
        flag("0"),
        Response.json(
          { code, message: "synthetic SQL private" },
          { status: 409 },
        ),
      ]);
      await expect(f.repo.insert(sid, input)).rejects.toMatchObject({
        code: "ORDER_CODE_CONFLICT",
      });
      expect(f.queries).toHaveLength(2);
    },
  );
  it("does not infer a conflict or retry after a generic provider error", async () => {
    const f = fixture([
      flag("0"),
      Response.json(
        { code: 61100002, message: "Duplicate synthetic secret" },
        { status: 500 },
      ),
    ]);
    const error = await f.repo.insert(sid, input).catch((e: Error) => e);
    expect(error).toMatchObject({ code: "MUTATION_OUTCOME_UNKNOWN" });
    expect(String(error)).not.toContain("synthetic secret");
    expect(f.queries).toHaveLength(2);
  });
  it.each([null, "01", "9223372036854775808"])(
    "treats invalid insert id %s as an unknown write",
    async (lastId) => {
      await expect(
        fixture([
          flag("0"),
          { rowsAffected: 1, sLastInsertID: lastId },
        ]).repo.insert(sid, input),
      ).rejects.toMatchObject({ code: "MUTATION_OUTCOME_UNKNOWN" });
    },
  );
  it.each([
    [5, "2junk"],
    [6, "181"],
    [7, "forged"],
  ] as const)(
    "rejects malformed persisted column %i",
    async (column, value) => {
      const w = orderWire();
      w.rows[0][column] = value;
      await expect(fixture([w]).repo.findById(sid, id)).rejects.toMatchObject({
        code: "UNAVAILABLE",
      });
    },
  );
});
