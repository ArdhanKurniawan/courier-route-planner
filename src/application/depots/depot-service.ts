import type { DepotRepository } from "@/db/repositories/depot-repository";
import {
  DepotError,
  parseDepotInput,
  serializeDepot,
  type DepotListQuery,
} from "@/lib/validation/depot";

export function createDepotService(
  repo: DepotRepository,
  clock: () => Date = () => new Date(),
) {
  async function read<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DepotError) throw error;
      throw new DepotError("UNAVAILABLE");
    }
  }
  async function write<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DepotError) throw error;
      throw new DepotError("MUTATION_OUTCOME_UNKNOWN");
    }
  }
  return {
    listDepots: (query: DepotListQuery) =>
      read(async () => {
        const rows = await repo.list({ ...query, limit: query.limit + 1 });
        const data = rows.slice(0, query.limit).map(serializeDepot);
        return {
          data,
          nextCursor: rows.length > query.limit ? data.at(-1)!.id : null,
        };
      }),
    getDepot: (id: bigint) =>
      read(async () => {
        const row = await repo.findById(id);
        if (!row) throw new DepotError("NOT_FOUND");
        return serializeDepot(row);
      }),
    createDepot: async (raw: unknown) => {
      const input = parseDepotInput(raw),
        now = clock();
      const id = await write(() =>
        repo.insert({ ...input, createdAt: now, updatedAt: now }),
      );
      try {
        const row = await repo.findById(id);
        if (!row) throw new Error("Readback absent.");
        return serializeDepot(row);
      } catch {
        throw new DepotError("MUTATION_OUTCOME_UNKNOWN");
      }
    },
    updateDepot: async (id: bigint, raw: unknown) => {
      const input = parseDepotInput(raw, true);
      await write(() => repo.update(id, { ...input, updatedAt: clock() }));
      try {
        const row = await repo.findById(id);
        if (!row) throw new DepotError("NOT_FOUND");
        return serializeDepot(row);
      } catch (error) {
        if (error instanceof DepotError && error.code === "NOT_FOUND")
          throw error;
        throw new DepotError("MUTATION_OUTCOME_UNKNOWN");
      }
    },
    deleteDepot: async (id: bigint) => {
      const count = await write(() => repo.remove(id));
      if (count === 0) throw new DepotError("NOT_FOUND");
    },
  };
}
