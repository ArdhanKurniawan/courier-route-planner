import type { ScenarioRepository } from "@/db/repositories/scenario-repository";
import {
  ScenarioError,
  parseScenarioInput,
  serializeScenario,
  type ScenarioListQuery,
} from "@/lib/validation/scenario";

export function createScenarioService(
  repo: ScenarioRepository,
  clock: () => Date = () => new Date(),
) {
  async function read<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ScenarioError) throw error;
      throw new ScenarioError("UNAVAILABLE");
    }
  }
  async function write<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ScenarioError) throw error;
      throw new ScenarioError("MUTATION_OUTCOME_UNKNOWN");
    }
  }
  function parse(raw: unknown) {
    const input = parseScenarioInput(raw);
    return {
      ...input,
      depotId: BigInt(input.depotId),
      generationSeed:
        input.generationSeed === null ? null : BigInt(input.generationSeed),
    };
  }
  return {
    listScenarios: (query: ScenarioListQuery) =>
      read(async () => {
        const rows = await repo.list({ ...query, limit: query.limit + 1 });
        const data = rows.slice(0, query.limit).map(serializeScenario);
        return {
          data,
          nextCursor: rows.length > query.limit ? data.at(-1)!.id : null,
        };
      }),
    getScenario: (id: bigint) =>
      read(async () => {
        const row = await repo.findById(id);
        if (!row) throw new ScenarioError("NOT_FOUND");
        return serializeScenario(row);
      }),
    createScenario: async (raw: unknown) => {
      const input = parse(raw),
        now = clock();
      const id = await write(() =>
        repo.insert({
          ...input,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        }),
      );
      try {
        const row = await repo.findById(id);
        if (!row) throw new Error("Readback absent");
        return serializeScenario(row);
      } catch {
        throw new ScenarioError("MUTATION_OUTCOME_UNKNOWN");
      }
    },
    updateScenario: async (id: bigint, raw: unknown) => {
      const input = parse(raw);
      const count = await write(() =>
        repo.update(id, { ...input, updatedAt: clock() }),
      );
      try {
        const row = await repo.findById(id);
        if (!row) throw new ScenarioError("NOT_FOUND");
        if (count === 0 && row.depotId !== input.depotId)
          throw new ScenarioError("INVALID_DEPOT");
        return serializeScenario(row);
      } catch (error) {
        if (
          error instanceof ScenarioError &&
          ["NOT_FOUND", "INVALID_DEPOT"].includes(error.code)
        )
          throw error;
        throw new ScenarioError("MUTATION_OUTCOME_UNKNOWN");
      }
    },
    deleteScenario: async (id: bigint) => {
      if ((await write(() => repo.remove(id))) === 0)
        throw new ScenarioError("NOT_FOUND");
    },
  };
}
