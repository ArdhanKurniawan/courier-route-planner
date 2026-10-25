import { describe, expect, it, vi } from "vitest";
import { createDepotService } from "@/application/depots/depot-service";
import { DepotError } from "@/lib/validation/depot";
import type {
  DepotRepository,
  DepotRow,
} from "@/db/repositories/depot-repository";
const id = BigInt("9007199254740993"),
  date = new Date("2026-01-01T00:00:00.000Z");
const input = {
  name: "Fixture Depot",
  address: null,
  latitude: 0,
  longitude: 0,
  isActive: true,
};
const row: DepotRow = { id, ...input, createdAt: date, updatedAt: date };
function repository(): DepotRepository {
  return {
    list: vi.fn(async () => [row]),
    findById: vi.fn(async () => row),
    insert: vi.fn(async () => id),
    update: vi.fn(async () => 1),
    remove: vi.fn(async () => 1),
  };
}
describe("Depot application service", () => {
  it("serializes BIGINT and UTC timestamps and creates cursor pages", async () => {
    const repo = repository(),
      service = createDepotService(repo, () => date);
    expect(await service.getDepot(id)).toEqual({
      ...input,
      id: "9007199254740993",
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    });
    repo.list = vi.fn(async () => [row, { ...row, id: id + BigInt(1) }]);
    expect(await service.listDepots({ limit: 1 })).toMatchObject({
      data: [{ id: "9007199254740993" }],
      nextCursor: "9007199254740993",
    });
    expect(repo.list).toHaveBeenCalledWith({ limit: 2 });
  });
  it("creates with server timestamps then reads by the exact validated insert id", async () => {
    const repo = repository(),
      service = createDepotService(repo, () => date);
    expect((await service.createDepot(input)).id).toBe("9007199254740993");
    expect(repo.insert).toHaveBeenCalledWith({
      ...input,
      createdAt: date,
      updatedAt: date,
    });
    expect(repo.findById).toHaveBeenCalledWith(id);
  });
  it("rejects invalid mutation data before repository operations", async () => {
    const repo = repository(),
      service = createDepotService(repo);
    await expect(
      service.createDepot({ ...input, latitude: 100 }),
    ).rejects.toThrow();
    expect(repo.insert).not.toHaveBeenCalled();
  });
  it("does not turn an unchanged existing PUT into 404 or alter createdAt", async () => {
    const repo = repository();
    repo.update = vi.fn(async () => 0);
    const service = createDepotService(repo, () => date);
    expect((await service.updateDepot(id, input)).createdAt).toBe(
      date.toISOString(),
    );
    expect(repo.update).toHaveBeenCalledWith(id, { ...input, updatedAt: date });
    expect(vi.mocked(repo.update).mock.calls[0][1]).not.toHaveProperty(
      "createdAt",
    );
  });
  it("returns not-found for missing or concurrently deleted rows", async () => {
    const repo = repository();
    repo.findById = async () => null;
    repo.remove = async () => 0;
    const service = createDepotService(repo, () => date);
    await expect(service.getDepot(id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.updateDepot(id, input)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.deleteDepot(id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("maps any post-insert readback failure to an unknown mutation outcome", async () => {
    const repo = repository();
    repo.findById = async () => {
      throw new Error("synthetic private URL");
    };
    await expect(
      createDepotService(repo).createDepot(input),
    ).rejects.toMatchObject({ code: "MUTATION_OUTCOME_UNKNOWN" });
    expect(repo.insert).toHaveBeenCalledTimes(1);
  });
  it("preserves definitive FK conflicts without retrying delete", async () => {
    const repo = repository();
    repo.remove = vi.fn(async () => {
      throw new DepotError("DEPOT_IN_USE");
    });
    await expect(
      createDepotService(repo).deleteDepot(id),
    ).rejects.toMatchObject({ code: "DEPOT_IN_USE" });
    expect(repo.remove).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed rows and redacts read failures", async () => {
    const repo = repository();
    repo.findById = async () => ({ ...row, latitude: NaN });
    await expect(createDepotService(repo).getDepot(id)).rejects.toMatchObject({
      code: "UNAVAILABLE",
      message: "Depot unavailable.",
    });
    repo.findById = async () => {
      throw new Error("synthetic private SQL");
    };
    await expect(createDepotService(repo).getDepot(id)).rejects.toMatchObject({
      code: "UNAVAILABLE",
      message: "Depot unavailable.",
    });
  });
});
