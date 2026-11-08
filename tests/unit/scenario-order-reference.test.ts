// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { createScenarioRepository } from "@/db/repositories/scenario-repository";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";
import { flag } from "../fixtures/order";
function fixture(replies: unknown[]) {
  const queries: string[] = [];
  const transport = vi.fn<DatabaseFetch>(async (_url, init) => {
    queries.push(JSON.parse(init!.body).query);
    const r = replies.shift();
    return Response.json(r, { headers: { "TiDB-Session": "synthetic" } });
  });
  return {
    repo: createScenarioRepository(() =>
      createDatabase(fakeDatabaseUrl, transport),
    ),
    queries,
  };
}
it("rejects Scenario deletion before DELETE when any Order references it", async () => {
  const f = fixture([flag("1")]);
  await expect(f.repo.remove(BigInt("9007199254740995"))).rejects.toMatchObject({
    code: "SCENARIO_IN_USE",
  });
  expect(f.queries).toHaveLength(1);
  expect(f.queries[0]).toMatch(/exists.*orders.*scenario_id/i);
});
it("fails closed on a malformed reference flag without issuing DELETE", async () => {
  const f = fixture([flag("malformed")]);
  await expect(f.repo.remove(BigInt("1"))).rejects.toMatchObject({
    code: "UNAVAILABLE",
  });
  expect(f.queries).toHaveLength(1);
});
it("retains the final FK guard and performs one DELETE when no Order exists", async () => {
  const f = fixture([flag("0"), { rowsAffected: 1 }]);
  expect(await f.repo.remove(BigInt("1"))).toBe(1);
  expect(f.queries).toHaveLength(2);
});
