// Collected only by the separately authorized Testing runner, never ordinary test/CI.
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { ZodError } from "zod";
import {
  createDepotRepository,
  type DepotRepository,
} from "@/db/repositories/depot-repository";
import {
  createScenarioRepository,
  type ScenarioRepository,
} from "@/db/repositories/scenario-repository";
import { createDepotService } from "@/application/depots/depot-service";
import { createScenarioService } from "@/application/scenarios/scenario-service";
import { ScenarioIntegrationFixtures } from "../fixtures/scenario-integration-fixtures";

it("round-trips one owned Scenario and guards referenced Depot deletion with bounded cleanup", async () => {
  const run = new ScenarioIntegrationFixtures(
    "scenario-integration-" + randomUUID(),
  );
  const baseDepots = createDepotRepository(),
    baseScenarios = createScenarioRepository();
  const depotRepository: DepotRepository = {
    ...baseDepots,
    insert: (input) => run.insert("depot", () => baseDepots.insert(input)),
    update: (id, input) =>
      run.change("depot", id, () => baseDepots.update(id, input)),
    remove: (id) => run.change("depot", id, () => baseDepots.remove(id)),
  };
  const scenarioRepository: ScenarioRepository = {
    ...baseScenarios,
    insert: (input) =>
      run.insert("scenario", () => baseScenarios.insert(input)),
    update: (id, input) =>
      run.change("scenario", id, () => baseScenarios.update(id, input)),
    remove: (id) => run.change("scenario", id, () => baseScenarios.remove(id)),
  };
  // A stable per-run clock lets the repeated update be an actual unchanged payload.
  const instant = new Date();
  const depots = createDepotService(depotRepository, () => instant);
  const scenarios = createScenarioService(scenarioRepository, () => instant);
  const depotInput = {
    name: run.tag + "-active",
    address: null,
    latitude: 0,
    longitude: 0,
    isActive: true,
  };
  try {
    const active = await run.mutate(() => depots.createDepot(depotInput));
    const inactive = await run.mutate(() =>
      depots.createDepot({
        ...depotInput,
        name: run.tag + "-inactive",
        isActive: false,
      }),
    );
    const activeId = BigInt(active.id);
    const input = {
      name: run.tag + "-scenario",
      depotId: active.id,
      distributionPattern: "random",
      customerCount: 3,
      radiusMinM: null,
      radiusMaxM: null,
      generationSeed: "9007199254740993",
    };

    await expect(
      run.mutate(() =>
        scenarios.createScenario({ ...input, depotId: inactive.id }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_DEPOT" });
    await expect(
      run.mutate(() =>
        scenarios.createScenario({ ...input, status: "frozen" }),
      ),
    ).rejects.toBeInstanceOf(ZodError);

    const created = await run.mutate(() => scenarios.createScenario(input)),
      id = BigInt(created.id);
    expect(typeof created.id).toBe("string");
    expect(created.id).toBe(run.snapshot().created.scenario[0]);
    expect(id.toString()).toBe(created.id);
    expect(created).toMatchObject({
      ...input,
      status: "draft",
    });
    expect(created.createdAt).toMatch(/Z$/u);
    expect(await scenarios.getScenario(id)).toEqual(created);
    // Bound the page around this id; assert/log only the owned fixture.
    const listed = await scenarios.listScenarios({
      after: id > BigInt(1) ? id - BigInt(1) : undefined,
      limit: 1,
    });
    expect(listed.data.length).toBe(1);
    const owned = listed.data.find(
      (row) => row.id === created.id && row.name.startsWith(run.tag + "-"),
    );
    // A failing list assertion must not print unrelated shared Testing rows.
    expect(owned !== undefined).toBe(true);
    expect(owned).toEqual(created);

    const editedInput = {
      ...input,
      name: run.tag + "-edited",
      distributionPattern: "directional",
      customerCount: 7,
      radiusMinM: 100,
      radiusMaxM: 500,
      generationSeed: "-9007199254740993",
    };
    const edited = await run.mutate(() =>
      scenarios.updateScenario(id, editedInput),
    );
    expect(edited).toMatchObject({
      id: created.id,
      depotId: active.id,
      name: run.tag + "-edited",
      distributionPattern: "directional",
      customerCount: 7,
      radiusMinM: 100,
      radiusMaxM: 500,
      generationSeed: "-9007199254740993",
      status: "draft",
      createdAt: created.createdAt,
    });
    expect(await scenarios.getScenario(id)).toEqual(edited);
    expect(
      await run.mutate(() => scenarios.updateScenario(id, editedInput)),
    ).toEqual(edited);
    await expect(
      run.mutate(() =>
        scenarios.updateScenario(id, { ...editedInput, status: "frozen" }),
      ),
    ).rejects.toBeInstanceOf(ZodError);
    expect((await scenarios.getScenario(id)).status).toBe("draft");

    await expect(
      run.mutate(() =>
        scenarios.updateScenario(id, { ...editedInput, depotId: inactive.id }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_DEPOT" });
    expect((await scenarios.getScenario(id)).depotId).toBe(active.id);
    await run.mutate(() =>
      depots.updateDepot(activeId, { ...depotInput, isActive: false }),
    );
    expect((await depots.getDepot(activeId)).isActive).toBe(false);
    expect((await scenarios.getScenario(id)).depotId).toBe(active.id);
    const retained = { ...editedInput, name: run.tag + "-retained-inactive" };
    expect(
      await run.mutate(() => scenarios.updateScenario(id, retained)),
    ).toMatchObject({
      name: run.tag + "-retained-inactive",
      depotId: active.id,
      status: "draft",
    });
    expect((await scenarios.getScenario(id)).name).toBe(
      run.tag + "-retained-inactive",
    );

    // Service-level precondition; schema/FK enforcement is separate evidence.
    // A child inserted after that read still relies on FK RESTRICT and fail-closed errors.
    await expect(
      run.mutate(() => depots.deleteDepot(activeId)),
    ).rejects.toMatchObject({ code: "DEPOT_IN_USE" });
    expect((await depots.getDepot(activeId)).id).toBe(active.id);
    await run.mutate(() => scenarios.deleteScenario(id));
    await expect(scenarios.getScenario(id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await run.mutate(() => depots.deleteDepot(activeId));
    await expect(depots.getDepot(activeId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  } finally {
    await run.cleanup({
      scenario: {
        read: baseScenarios.findById,
        remove: (id) => run.mutate(() => scenarios.deleteScenario(id)),
      },
      depot: {
        read: baseDepots.findById,
        remove: (id) => run.mutate(() => depots.deleteDepot(id)),
      },
    });
    // Synthetic tag and run-owned IDs only; never credential or shared-record data.
    console.info(
      "Scenario fixture cleanup receipt:",
      JSON.stringify(run.snapshot()),
    );
  }
  expect(run.snapshot()).toMatchObject({
    cleanupComplete: true,
    pending: { scenario: [], depot: [] },
  });
  // Up to 38 queries with current prechecks; 5s/query fits this 240s bounded flow.
  // Existing no-retry and uncertain-mutation STOP behavior remain unchanged.
}, 240000);
