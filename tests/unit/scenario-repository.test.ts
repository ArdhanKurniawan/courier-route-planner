// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { createScenarioRepository } from "@/db/repositories/scenario-repository";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";
import { flag } from "../fixtures/order";
import {
  scenarioRowFixture as row,
  scenarioDate,
  scenarioWire,
} from "../fixtures/scenario";
const id = row.id;
const insert = {
  depotId: row.depotId,
  name: row.name,
  distributionPattern: row.distributionPattern,
  customerCount: row.customerCount,
  radiusMinM: row.radiusMinM,
  radiusMaxM: row.radiusMaxM,
  generationSeed: row.generationSeed,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
};
const update = {
  depotId: row.depotId,
  name: row.name,
  distributionPattern: row.distributionPattern,
  customerCount: row.customerCount,
  radiusMinM: row.radiusMinM,
  radiusMaxM: row.radiusMaxM,
  generationSeed: row.generationSeed,
  updatedAt: row.updatedAt,
};
function fixture(replies: unknown[]) {
  const queries: string[] = [],
    parameters: unknown[][] = [];
  const transport = vi.fn<DatabaseFetch>(async (_url, init) => {
    const request = JSON.parse(init!.body);
    queries.push(request.query);
    parameters.push(request.params ?? []);
    if (!replies.length) throw new Error("Unexpected fixture SQL");
    const next = replies.shift();
    if (next instanceof Error) throw next;
    if (next instanceof Response) return next;
    return Response.json(next, {
      headers: { "TiDB-Session": "synthetic-session" },
    });
  });
  const acquire = vi.fn(() => createDatabase(fakeDatabaseUrl, transport));
  return {
    repo: createScenarioRepository(acquire),
    acquire,
    transport,
    queries,
    parameters,
  };
}
describe("Scenario repository over synthetic TiDB HTTP", () => {
  it("is lazy, atomically inserts only from an active Depot, and preserves large generated ids", async () => {
    const f = fixture([
      { rowsAffected: 1, sLastInsertID: "9007199254740995" },
      scenarioWire(),
    ]);
    expect(f.acquire).not.toHaveBeenCalled();
    expect(await f.repo.insert(insert)).toBe(BigInt("9007199254740995"));
    expect(f.queries[0]).toMatch(
      /insert into .*scenarios.*select.*depots.*where/i,
    );
    expect(f.queries[0]).toContain("is_active");
    expect((await f.repo.findById(id))?.generationSeed).toBe(
      -BigInt("9007199254740993"),
    );
    expect(f.transport).toHaveBeenCalledTimes(2);
  });
  it("rejects a missing/inactive Depot before insert readback when insert-select affects zero rows", async () => {
    const f = fixture([{ rowsAffected: 0, sLastInsertID: null }]);
    await expect(f.repo.insert(insert)).rejects.toMatchObject({
      code: "INVALID_DEPOT",
    });
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it("pages deterministically and validates the requested row identity", async () => {
    const f = fixture([scenarioWire(), scenarioWire()]);
    expect(await f.repo.list({ after: id, limit: 2 })).toHaveLength(1);
    expect(f.queries[0]).toContain("order by");
    expect(f.queries[0]).toContain("limit 2");
    await expect(f.repo.findById(id + BigInt("1"))).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
  it("allows the existing Depot id or an active replacement in the same guarded update", async () => {
    const f = fixture([{ rowsAffected: 0 }]);
    expect(
      await f.repo.update(id, { ...update, updatedAt: scenarioDate }),
    ).toBe(0);
    expect(f.queries[0]).toMatch(/where.*id.*and.*depot_id.*or.*exists/i);
    expect(f.queries[0]).toContain("is_active");
  });
  it.each([1451, "1451", "ER_ROW_IS_REFERENCED_2"])(
    "maps SQL reference code %s to a definitive restriction",
    async (code) => {
      const f = fixture([
        flag("0"),
        Response.json(
          { code, message: "synthetic private SQL" },
          { status: 409 },
        ),
      ]);
      await expect(f.repo.remove(id)).rejects.toMatchObject({
        code: "SCENARIO_IN_USE",
      });
      expect(f.transport).toHaveBeenCalledTimes(2);
    },
  );
  it("maps missing-parent FK errors to invalid Depot without masking transport failures", async () => {
    const f = fixture([
      Response.json(
        { code: 1452, message: "synthetic private SQL" },
        { status: 409 },
      ),
    ]);
    await expect(f.repo.insert(insert)).rejects.toMatchObject({
      code: "INVALID_DEPOT",
    });
    const failure = fixture([flag("0"), new Error("synthetic private URL")]);
    await expect(failure.repo.remove(id)).rejects.toMatchObject({
      code: "MUTATION_OUTCOME_UNKNOWN",
    });
    expect(failure.transport).toHaveBeenCalledTimes(2);
  });
  it.each([null, 1, "01", "9223372036854775808"])(
    "rejects invalid insert identity %j as unknown outcome",
    async (lastId) => {
      await expect(
        fixture([{ rowsAffected: 1, sLastInsertID: lastId }]).repo.insert(
          insert,
        ),
      ).rejects.toMatchObject({ code: "MUTATION_OUTCOME_UNKNOWN" });
    },
  );
  it.each([
    [4, "25junk"],
    [5, "-1"],
    [6, "1.5"],
    [8, "frozen"],
  ] as const)(
    "rejects malformed result column %i before coercion",
    async (column, value) => {
      const wire = scenarioWire();
      wire.rows[0][column] = value;
      await expect(fixture([wire]).repo.findById(id)).rejects.toMatchObject({
        code: "UNAVAILABLE",
      });
    },
  );
  it("reports configuration failure before issuing a write as unavailable", async () => {
    const repo = createScenarioRepository(() => {
      throw new Error("synthetic config");
    });
    await expect(repo.remove(id)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
});
