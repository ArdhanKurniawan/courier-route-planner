import { describe, expect, it, vi } from "vitest";
import { createScenarioService } from "@/application/scenarios/scenario-service";
import { ScenarioError } from "@/lib/validation/scenario";
import type { ScenarioRepository } from "@/db/repositories/scenario-repository";
import {
  scenarioInput as input,
  scenarioRowFixture as row,
  scenarioDtoFixture as dto,
  scenarioDate as date,
} from "../fixtures/scenario";
function repository(): ScenarioRepository {
  return {
    list: vi.fn(async () => [row]),
    findById: vi.fn(async () => row),
    insert: vi.fn(async () => row.id),
    update: vi.fn(async () => 1),
    remove: vi.fn(async () => 1),
  };
}
describe("Scenario application behavior", () => {
  it("serializes the selected row without lossy id/seed conversion and pages by id", async () => {
    const repo = repository(),
      service = createScenarioService(repo, () => date);
    expect(await service.getScenario(row.id)).toEqual(dto);
    repo.list = vi.fn(async () => [row, { ...row, id: row.id + BigInt("1") }]);
    expect(await service.listScenarios({ limit: 1 })).toEqual({
      data: [dto],
      nextCursor: "9007199254740995",
    });
    expect(repo.list).toHaveBeenCalledWith({ limit: 2 });
  });
  it("creates only draft with server timestamps and reads the exact returned id", async () => {
    const repo = repository();
    expect(
      await createScenarioService(repo, () => date).createScenario(input),
    ).toEqual(dto);
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        depotId: row.depotId,
        generationSeed: row.generationSeed,
        status: "draft",
        createdAt: date,
        updatedAt: date,
      }),
    );
    expect(vi.mocked(repo.insert).mock.calls[0][0]).not.toHaveProperty("id");
    expect(repo.findById).toHaveBeenCalledWith(BigInt("9007199254740995"));
  });
  it("rejects invalid inputs and client lifecycle claims before repository access", async () => {
    const repo = repository(),
      service = createScenarioService(repo);
    for (const change of [
      { customerCount: -1 },
      { depotId: "0" },
      { status: "frozen" },
    ])
      await expect(
        service.createScenario({ ...input, ...change }),
      ).rejects.toThrow();
    expect(repo.insert).not.toHaveBeenCalled();
  });
  it("preserves a definitive inactive/missing Depot rejection without retry", async () => {
    const repo = repository();
    repo.insert = vi.fn(async () => {
      throw new ScenarioError("INVALID_DEPOT");
    });
    await expect(
      createScenarioService(repo).createScenario(input),
    ).rejects.toMatchObject({ code: "INVALID_DEPOT" });
    expect(repo.insert).toHaveBeenCalledTimes(1);
  });
  it("keeps an unchanged existing update successful, including an existing inactive Depot reference", async () => {
    const repo = repository();
    repo.update = vi.fn(async () => 0);
    expect(
      await createScenarioService(repo, () => date).updateScenario(
        row.id,
        input,
      ),
    ).toEqual(dto);
    expect(vi.mocked(repo.update).mock.calls[0][1]).not.toHaveProperty(
      "createdAt",
    );
    expect(vi.mocked(repo.update).mock.calls[0][1]).not.toHaveProperty(
      "status",
    );
  });
  it("reports a rejected Depot switch when the atomic update affected no row", async () => {
    const repo = repository();
    repo.update = vi.fn(async () => 0);
    await expect(
      createScenarioService(repo).updateScenario(row.id, {
        ...input,
        depotId: "9007199254740994",
      }),
    ).rejects.toMatchObject({ code: "INVALID_DEPOT" });
  });
  it("returns 404 for missing detail, missing update and missing delete", async () => {
    const repo = repository();
    repo.findById = async () => null;
    repo.remove = async () => 0;
    const service = createScenarioService(repo);
    await expect(service.getScenario(row.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.updateScenario(row.id, input)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.deleteScenario(row.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it.each(["create", "update"])(
    "keeps %s readback failure outcome unknown without mutation retry",
    async (method) => {
      const repo = repository();
      repo.findById = vi.fn(async () => {
        throw new Error("synthetic private detail");
      });
      const service = createScenarioService(repo);
      await expect(
        method === "create"
          ? service.createScenario(input)
          : service.updateScenario(row.id, input),
      ).rejects.toMatchObject({ code: "MUTATION_OUTCOME_UNKNOWN" });
      expect(
        method === "create" ? repo.insert : repo.update,
      ).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves reference restrictions and redacts unexpected repository errors", async () => {
    const repo = repository();
    repo.remove = async () => {
      throw new ScenarioError("SCENARIO_IN_USE");
    };
    await expect(
      createScenarioService(repo).deleteScenario(row.id),
    ).rejects.toMatchObject({ code: "SCENARIO_IN_USE" });
    repo.findById = async () => {
      throw new Error("synthetic secret");
    };
    await expect(
      createScenarioService(repo).getScenario(row.id),
    ).rejects.toMatchObject({
      code: "UNAVAILABLE",
      message: "Scenario unavailable.",
    });
  });
});
