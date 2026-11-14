// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DepotError } from "@/lib/validation/depot";
import { ScenarioError } from "@/lib/validation/scenario";
import {
  ScenarioIntegrationFixtures,
  type FixtureAccess,
} from "../fixtures/scenario-integration-fixtures";

const tag = "synthetic-scenario-run";
const depotId = BigInt("9007199254740993"),
  scenarioId = BigInt("9007199254740995");
function memory() {
  const rows = {
    scenario: new Map<bigint, { id: bigint; name: string }>(),
    depot: new Map<bigint, { id: bigint; name: string }>(),
  };
  const events: string[] = [];
  const access = (kind: "scenario" | "depot"): FixtureAccess => ({
    read: async (id) => {
      events.push("read:" + kind + ":" + id);
      return rows[kind].get(id) ?? null;
    },
    remove: async (id) => {
      events.push("delete:" + kind + ":" + id);
      rows[kind].delete(id);
    },
  });
  return {
    rows,
    events,
    adapters: { scenario: access("scenario"), depot: access("depot") },
  };
}
describe("Scenario integration fixture safety", () => {
  it("records lossless insert ids before the service readback can fail", async () => {
    const run = new ScenarioIntegrationFixtures(tag);
    await expect(
      run.mutate(async () => {
        await run.insert("scenario", async () => scenarioId);
        throw new ScenarioError("MUTATION_OUTCOME_UNKNOWN");
      }),
    ).rejects.toThrow(tag);
    expect(run.snapshot()).toMatchObject({
      stopped: true,
      pending: { scenario: ["9007199254740995"], depot: [] },
    });
  });
  it("cleans only recorded ids, child first, and verifies absence afterwards", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    await run.insert("depot", async () => depotId);
    await run.insert("scenario", async () => scenarioId);
    m.rows.depot.set(depotId, { id: depotId, name: tag + "-depot" });
    m.rows.scenario.set(scenarioId, {
      id: scenarioId,
      name: tag + "-scenario",
    });
    m.rows.depot.set(BigInt(7), {
      id: BigInt(7),
      name: "unrelated synthetic record",
    });
    await run.cleanup(m.adapters);
    expect(m.events).toEqual([
      "read:scenario:9007199254740995",
      "delete:scenario:9007199254740995",
      "read:scenario:9007199254740995",
      "read:depot:9007199254740993",
      "delete:depot:9007199254740993",
      "read:depot:9007199254740993",
    ]);
    expect(m.rows.scenario.size).toBe(0);
    expect(m.rows.depot.size).toBe(1);
    expect(m.rows.depot.get(BigInt(7))?.name).toBe(
      "unrelated synthetic record",
    );
    expect(run.snapshot()).toMatchObject({
      cleanupComplete: true,
      pending: { scenario: [], depot: [] },
    });
  });
  it("confirms already-deleted owned fixtures without issuing another delete", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    await run.insert("scenario", async () => scenarioId);
    await run.cleanup(m.adapters);
    expect(m.events).toEqual(["read:scenario:9007199254740995"]);
    expect(run.snapshot().cleanupComplete).toBe(true);
  });
  it("rejects mutation of an unowned id before invoking the operation", async () => {
    const run = new ScenarioIntegrationFixtures(tag);
    let writes = 0;
    await expect(
      run.change("depot", depotId, async () => ++writes),
    ).rejects.toThrow(tag);
    expect(writes).toBe(0);
  });
  it("keeps ownership after definitive FK rejection so safe cleanup remains possible", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    await run.insert("depot", async () => depotId);
    m.rows.depot.set(depotId, { id: depotId, name: tag + "-depot" });
    await expect(
      run.change("depot", depotId, async () => {
        throw new DepotError("DEPOT_IN_USE");
      }),
    ).rejects.toMatchObject({ code: "DEPOT_IN_USE" });
    expect(run.snapshot()).toMatchObject({
      stopped: false,
      pending: { depot: ["9007199254740993"] },
    });
    await run.cleanup(m.adapters);
    expect(m.rows.depot.size).toBe(0);
  });
  it("stops all further writes and cleanup after unknown mutation outcome", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    let writes = 0;
    await run.insert("depot", async () => depotId);
    await expect(
      run.change("depot", depotId, async () => {
        writes++;
        throw new DepotError("MUTATION_OUTCOME_UNKNOWN");
      }),
    ).rejects.toThrow(tag);
    await expect(
      run.change("depot", depotId, async () => ++writes),
    ).rejects.toThrow(tag);
    await expect(run.cleanup(m.adapters)).rejects.toThrow(tag);
    expect(writes).toBe(1);
    expect(m.events).toEqual([]);
    expect(run.snapshot().pending.depot).toEqual(["9007199254740993"]);
  });
  it("reports unknown insert ownership without leaking unexpected error contents", async () => {
    const run = new ScenarioIntegrationFixtures(tag);
    let error: unknown;
    try {
      await run.insert("scenario", async () => {
        throw new Error("synthetic-private-connection-detail");
      });
    } catch (caught) {
      error = caught;
    }
    expect(String(error)).toContain(tag);
    expect(String(error)).not.toContain("synthetic-private-connection-detail");
    expect(run.snapshot()).toMatchObject({
      stopped: true,
      unrecordedInserts: ["scenario"],
    });
  });
  it.each([BigInt(0), BigInt(-1), BigInt("9223372036854775808")])(
    "stops after invalid insert identity %s",
    async (id) => {
      const run = new ScenarioIntegrationFixtures(tag);
      await expect(run.insert("scenario", async () => id)).rejects.toThrow(tag);
      expect(run.snapshot()).toMatchObject({
        stopped: true,
        unrecordedInserts: ["scenario"],
      });
    },
  );
  it("refuses cleanup of a recorded id whose readback belongs to another run", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    await run.insert("scenario", async () => scenarioId);
    await run.insert("depot", async () => depotId);
    m.rows.scenario.set(scenarioId, {
      id: scenarioId,
      name: "another-run-fixture",
    });
    await expect(run.cleanup(m.adapters)).rejects.toThrow(tag);
    expect(m.events).toEqual(["read:scenario:9007199254740995"]);
    expect(m.rows.scenario.has(scenarioId)).toBe(true);
  });
  it("retains unresolved child ids and stops before parent cleanup on read failure", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    await run.insert("scenario", async () => scenarioId);
    await run.insert("depot", async () => depotId);
    m.adapters.scenario.read = async () => {
      throw new Error("synthetic-private-read-detail");
    };
    await expect(run.cleanup(m.adapters)).rejects.toThrow(tag);
    expect(run.snapshot().pending.scenario).toEqual(["9007199254740995"]);
    expect(m.events).toEqual([]);
  });
  it("does not retry a delete when absence cannot be confirmed", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    let deletes = 0;
    await run.insert("scenario", async () => scenarioId);
    m.rows.scenario.set(scenarioId, {
      id: scenarioId,
      name: tag + "-scenario",
    });
    m.adapters.scenario.remove = async () => {
      deletes++;
    };
    await expect(run.cleanup(m.adapters)).rejects.toThrow(tag);
    await expect(run.cleanup(m.adapters)).rejects.toThrow(tag);
    expect(deletes).toBe(1);
    expect(run.snapshot().pending.scenario).toEqual(["9007199254740995"]);
  });
  it("prevents new writes after cleanup has completed", async () => {
    const run = new ScenarioIntegrationFixtures(tag),
      m = memory();
    let writes = 0;
    await run.cleanup(m.adapters);
    await expect(run.mutate(async () => ++writes)).rejects.toThrow(tag);
    expect(writes).toBe(0);
  });
});
