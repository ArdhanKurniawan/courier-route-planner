import { describe, expect, it, vi } from "vitest";
import {
  orderInput,
  orderRowFixture as row,
  orderDtoFixture as dto,
  orderDate,
} from "../fixtures/order";
import { createOrderService } from "@/application/orders/order-service";
import type { OrderRepository } from "@/db/repositories/order-repository";
const sid = row.scenarioId,
  id = row.id;
function fixture() {
  const repo = {
    hasScenario: vi.fn<OrderRepository["hasScenario"]>(async () => true),
    list: vi.fn<OrderRepository["list"]>(async () => [row]),
    count: vi.fn<OrderRepository["count"]>(async () => BigInt("1")),
    findById: vi.fn<OrderRepository["findById"]>(async () => row),
    insert: vi.fn<OrderRepository["insert"]>(async () => id),
    update: vi.fn<OrderRepository["update"]>(async () => 0),
    remove: vi.fn<OrderRepository["remove"]>(async () => 1),
  };
  return { repo, service: createOrderService(repo, () => orderDate) };
}
describe("Order application behavior", () => {
  it("lists an actual count separately from the configured Scenario count", async () => {
    const f = fixture();
    f.repo.count.mockResolvedValue(BigInt("77"));
    expect(await f.service.listOrders(sid, { limit: 1 })).toEqual({
      data: [dto],
      nextCursor: null,
      totalCount: "77",
    });
    expect(f.repo.list).toHaveBeenCalledWith(sid, { limit: 2 });
  });
  it("creates a manual Order with context-owned Scenario and server timestamps", async () => {
    const f = fixture();
    expect(await f.service.createOrder(sid, orderInput)).toEqual(dto);
    expect(f.repo.insert).toHaveBeenCalledWith(
      sid,
      expect.objectContaining({
        orderCode: "QA-001",
        source: "manual",
        createdAt: orderDate,
      }),
    );
    expect(f.repo.insert.mock.calls[0][1]).not.toHaveProperty("customerCount");
  });
  it.each(["source", "scenarioId"])(
    "rejects injected %s before any repository access",
    async (key) => {
      const f = fixture();
      await expect(
        f.service.createOrder(sid, { ...orderInput, [key]: "dummy" }),
      ).rejects.toThrow();
      expect(f.repo.hasScenario).not.toHaveBeenCalled();
      expect(f.repo.insert).not.toHaveBeenCalled();
    },
  );
  it("preserves a dummy source and succeeds for an unchanged update", async () => {
    const f = fixture();
    f.repo.findById.mockResolvedValue({
      ...row,
      source: "dummy",
    });
    expect(await f.service.updateOrder(sid, id, orderInput)).toMatchObject({
      source: "dummy",
    });
    expect(f.repo.update).toHaveBeenCalledWith(
      sid,
      id,
      expect.not.objectContaining({ source: expect.anything() }),
    );
  });
  it("returns not found before mutation for cross-Scenario/missing Order", async () => {
    const f = fixture();
    f.repo.findById.mockResolvedValue(null);
    await expect(
      f.service.updateOrder(sid, id, orderInput),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(f.repo.update).not.toHaveBeenCalled();
  });
  it("returns not found for an absent parent instead of an empty successful list", async () => {
    const f = fixture();
    f.repo.hasScenario.mockResolvedValue(false);
    await expect(
      f.service.listOrders(sid, { limit: 50 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(f.repo.list).not.toHaveBeenCalled();
  });
  it("does not leak malformed or foreign repository rows", async () => {
    const f = fixture();
    f.repo.findById.mockResolvedValue({ ...row, scenarioId: sid + BigInt("1") });
    await expect(f.service.getOrder(sid, id)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
  it("reports failed post-insert readback as unknown and never retries insert", async () => {
    const f = fixture();
    f.repo.findById.mockResolvedValue(null);
    await expect(f.service.createOrder(sid, orderInput)).rejects.toMatchObject({
      code: "MUTATION_OUTCOME_UNKNOWN",
    });
    expect(f.repo.insert).toHaveBeenCalledTimes(1);
  });
  it("does not retry a failed mutation or issue speculative readback", async () => {
    const f = fixture();
    f.repo.remove.mockRejectedValue(new Error("synthetic secret"));
    await expect(f.service.deleteOrder(sid, id)).rejects.toMatchObject({
      code: "MUTATION_OUTCOME_UNKNOWN",
    });
    expect(f.repo.remove).toHaveBeenCalledTimes(1);
    expect(f.repo.findById).not.toHaveBeenCalled();
  });
});
