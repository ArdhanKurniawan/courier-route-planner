// Only the separately authorized, opt-in Testing runner collects this file.
import { randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import {
  createDepotRepository,
  type DepotRepository,
} from "@/db/repositories/depot-repository";
import { createDepotService } from "@/application/depots/depot-service";
import { DepotError } from "@/lib/validation/depot";

const base = createDepotRepository();
const owned = new Set<bigint>();
const tag = "integration-" + randomUUID();
let unresolved = false;
const repository: DepotRepository = {
  ...base,
  insert: async (input) => {
    try {
      const id = await base.insert(input);
      owned.add(id);
      return id;
    } catch (error) {
      if (
        error instanceof DepotError &&
        error.code === "MUTATION_OUTCOME_UNKNOWN"
      )
        unresolved = true;
      throw error;
    }
  },
  remove: async (id) => {
    try {
      const count = await base.remove(id);
      owned.delete(id);
      return count;
    } catch (error) {
      owned.delete(id);
      unresolved = true;
      throw error;
    }
  },
};
afterEach(async () => {
  // Only exact recorded run-owned ids; no name-based delete, retry, DDL or broad reset.
  for (const id of [...owned]) await repository.remove(id);
  if (unresolved)
    throw new Error(
      "Unresolved fixture outcome; stop and review run tag privately: " + tag,
    );
});
it("round-trips one owned fixture through Depot CRUD without schema changes", async () => {
  const service = createDepotService(repository);
  const input = {
    name: tag,
    address: null,
    latitude: 0,
    longitude: 0,
    isActive: true,
  };
  const created = await service.createDepot(input);
  expect(created.id).toMatch(/^[1-9]\d*$/u);
  expect(created.createdAt).toMatch(/Z$/u);
  const id = BigInt(created.id);
  expect((await service.getDepot(id)).name).toBe(tag);
  const edited = await service.updateDepot(id, {
    ...input,
    address: "Synthetic integration address",
    isActive: false,
  });
  expect(edited).toMatchObject({
    id: created.id,
    isActive: false,
    createdAt: created.createdAt,
  });
  expect(
    (await service.updateDepot(id, { ...input, isActive: true })).isActive,
  ).toBe(true);
  expect((await service.updateDepot(id, input)).id).toBe(created.id);
  await service.deleteDepot(id);
  await expect(service.getDepot(id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(service.deleteDepot(id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});
