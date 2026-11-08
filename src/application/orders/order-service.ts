import type { OrderRepository } from "@/db/repositories/order-repository";
import {
  OrderError,
  parseOrderInput,
  serializeOrder,
  type OrderListQuery,
  type OrderRow,
} from "@/lib/validation/order";

export function createOrderService(
  repo: OrderRepository,
  clock: () => Date = () => new Date(),
) {
  async function read<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OrderError) throw error;
      throw new OrderError("UNAVAILABLE");
    }
  }
  async function write<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OrderError) throw error;
      throw new OrderError("MUTATION_OUTCOME_UNKNOWN");
    }
  }
  function scoped(row: OrderRow, scenarioId: bigint, id?: bigint) {
    if (row.scenarioId !== scenarioId || (id !== undefined && row.id !== id))
      throw new OrderError("UNAVAILABLE");
    return serializeOrder(row);
  }
  async function parent(scenarioId: bigint) {
    if (!(await repo.hasScenario(scenarioId)))
      throw new OrderError("NOT_FOUND");
  }
  return {
    listOrders: (scenarioId: bigint, query: OrderListQuery) =>
      read(async () => {
        await parent(scenarioId);
        const [rows, total] = await Promise.all([
          repo.list(scenarioId, { ...query, limit: query.limit + 1 }),
          repo.count(scenarioId),
        ]);
        if (
          typeof total !== "bigint" ||
          total < BigInt("0") ||
          (query.after === undefined &&
            rows.length === 0 &&
            total > BigInt("0"))
        )
          throw new OrderError("UNAVAILABLE");
        const data = rows
          .slice(0, query.limit)
          .map((row) => scoped(row, scenarioId));
        return {
          data,
          nextCursor: rows.length > query.limit ? data.at(-1)!.id : null,
          totalCount: total.toString(),
        };
      }),
    getOrder: (scenarioId: bigint, id: bigint) =>
      read(async () => {
        const row = await repo.findById(scenarioId, id);
        if (!row) throw new OrderError("NOT_FOUND");
        return scoped(row, scenarioId, id);
      }),
    createOrder: async (scenarioId: bigint, raw: unknown) => {
      const input = parseOrderInput(raw);
      await read(() => parent(scenarioId));
      const now = clock();
      const id = await write(() =>
        repo.insert(scenarioId, {
          ...input,
          source: "manual",
          createdAt: now,
          updatedAt: now,
        }),
      );
      try {
        const row = await repo.findById(scenarioId, id);
        if (!row) throw Error();
        return scoped(row, scenarioId, id);
      } catch {
        throw new OrderError("MUTATION_OUTCOME_UNKNOWN");
      }
    },
    updateOrder: async (scenarioId: bigint, id: bigint, raw: unknown) => {
      const input = parseOrderInput(raw);
      await read(async () => {
        const row = await repo.findById(scenarioId, id);
        if (!row) throw new OrderError("NOT_FOUND");
        scoped(row, scenarioId, id);
      });
      const affected = await write(() =>
        repo.update(scenarioId, id, { ...input, updatedAt: clock() }),
      );
      try {
        const row = await repo.findById(scenarioId, id);
        if (!row && affected === 0) throw new OrderError("NOT_FOUND");
        if (!row) throw Error();
        return scoped(row, scenarioId, id);
      } catch (error) {
        if (error instanceof OrderError && error.code === "NOT_FOUND")
          throw error;
        throw new OrderError("MUTATION_OUTCOME_UNKNOWN");
      }
    },
    deleteOrder: async (scenarioId: bigint, id: bigint) => {
      if ((await write(() => repo.remove(scenarioId, id))) === 0)
        throw new OrderError("NOT_FOUND");
    },
  };
}
