// Prepared only. Runs solely after separate Testing migration and one-run approval.
import { expect, it } from "vitest";
import { createDatabase } from "@/db/client";
import { createDepotRepository } from "@/db/repositories/depot-repository";
import { createScenarioRepository } from "@/db/repositories/scenario-repository";
import {
  createOrderRepository,
  type OrderRepository,
} from "@/db/repositories/order-repository";
import { createDepotService } from "@/application/depots/depot-service";
import { createScenarioService } from "@/application/scenarios/scenario-service";
import { createOrderService } from "@/application/orders/order-service";
import {
  fixtureTarget,
  OrderIntegrationFixtures,
  readFixtureReceipt,
  reconcileOrderRun,
} from "../fixtures/order-integration-fixtures";

import {
  createOrderFixtureLookup,
  deleteOrderFixture,
} from "../fixtures/order-integration-lookup";

const reconciliationRun = process.env.ORDER_INTEGRATION_RECONCILE_RUN;
const receiptDirectory = process.env.ORDER_INTEGRATION_RECEIPT_DIR;

async function execute() {
  const target = fixtureTarget(process.env.DATABASE_URL);
  let queries = 0;
  const acquire = () =>
    createDatabase(process.env.DATABASE_URL, async (input, init) => {
      if (++queries > 100)
        throw Error("Owned integration query budget exhausted");
      return fetch(input, init as RequestInit);
    });
  const lookup = createOrderFixtureLookup((query) => acquire().execute(query));
  if (reconciliationRun !== undefined) {
    const absent = await reconcileOrderRun(
      receiptDirectory,
      reconciliationRun,
      target,
      lookup,
    );
    if (!absent)
      throw Error(
        "Private reconciliation found unresolved or present fixtures.",
      );
    return;
  }

  const run = new OrderIntegrationFixtures(receiptDirectory, target);
  const baseDepots = createDepotRepository(acquire),
    baseScenarios = createScenarioRepository(acquire),
    baseOrders = createOrderRepository(acquire);
  const depots = createDepotService({
    ...baseDepots,
    insert: (input) =>
      run.insert("depot", input.name, null, () => baseDepots.insert(input)),
  });
  const scenarios = createScenarioService({
    ...baseScenarios,
    insert: (input) =>
      run.insert("scenario", input.name, input.depotId, () =>
        baseScenarios.insert(input),
      ),
  });
  const repo: OrderRepository = {
    ...baseOrders,
    insert: (sid, input) =>
      run.insert("order", input.orderCode, sid, () =>
        baseOrders.insert(sid, input),
      ),
    update: (sid, id, input) =>
      run.change("order", id, () => baseOrders.update(sid, id, input)),
  };
  const instant = new Date(),
    orders = createOrderService(repo, () => instant);
  try {
    const depot = await run.mutate(() =>
      depots.createDepot({
        name: run.tag + "-depot",
        address: null,
        latitude: 0,
        longitude: 0,
        isActive: true,
      }),
    );
    const scenarioInput = {
      depotId: depot.id,
      name: run.tag + "-scenario",
      distributionPattern: "random" as const,
      customerCount: 0,
      radiusMinM: null,
      radiusMaxM: null,
      generationSeed: null,
    };
    const a = await run.mutate(() => scenarios.createScenario(scenarioInput)),
      b = await run.mutate(() =>
        scenarios.createScenario({
          ...scenarioInput,
          name: run.tag + "-other",
        }),
      );
    const aid = BigInt(a.id),
      bid = BigInt(b.id);
    const input = {
      orderCode: run.tag + "-café",
      customerName: run.tag + "-customer",
      address: null,
      latitude: 0,
      longitude: 0,
    };
    const first = await run.mutate(() => orders.createOrder(aid, input));
    expect(first).toMatchObject({
      scenarioId: a.id,
      source: "manual",
      orderCode: input.orderCode.toUpperCase(),
    });
    // Actual equality must use the live column's reviewed collation, not a JS mock.
    await expect(
      run.mutate(() =>
        orders.createOrder(aid, { ...input, orderCode: run.tag + "-CAFE" }),
      ),
    ).rejects.toMatchObject({ code: "ORDER_CODE_CONFLICT" });
    await run.mutate(() => orders.createOrder(bid, input));
    await expect(orders.getOrder(bid, BigInt(first.id))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const dummyId = await run.mutate(() =>
      repo.insert(aid, {
        ...input,
        orderCode: (run.tag + "-dummy").toUpperCase(),
        source: "dummy",
        createdAt: instant,
        updatedAt: instant,
      }),
    );
    const dummy = await run.mutate(() =>
      orders.updateOrder(aid, dummyId, {
        ...input,
        orderCode: run.tag + "-dummy",
        latitude: 1,
      }),
    );
    expect(dummy.source).toBe("dummy");
    expect(await orders.listOrders(aid, { limit: 100 })).toMatchObject({
      totalCount: "2",
    });
    expect((await scenarios.getScenario(aid)).customerCount).toBe(0);
    const referenceCheck = createScenarioService(
      createScenarioRepository(() =>
        Object.assign(acquire(), {
          delete: () => {
            throw Error("Unexpected Scenario delete.");
          },
        }),
      ),
    );
    await expect(
      run.mutate(() => referenceCheck.deleteScenario(aid)),
    ).rejects.toMatchObject({ code: "SCENARIO_IN_USE" });
    const edit = {
      ...input,
      customerName: run.tag + "-edited",
      latitude: 2,
      longitude: 3,
    };
    const edited = await run.mutate(() =>
      orders.updateOrder(aid, BigInt(first.id), edit),
    );
    expect(edited).toMatchObject({
      customerName: run.tag + "-edited",
      latitude: 2,
      longitude: 3,
      source: "manual",
    });
    expect(
      await run.mutate(() => orders.updateOrder(aid, BigInt(first.id), edit)),
    ).toEqual(edited);
    await run.remove("order", BigInt(first.id), lookup, (entry) => {
      const guardedOrder = createOrderService(
        {
          ...baseOrders,
          remove: (sid, id) => {
            if (entry.parentId !== String(sid) || entry.id !== String(id))
              throw Error("Fixture scope mismatch.");
            return run.mutate(() => deleteOrderFixture(acquire(), entry));
          },
        },
        () => instant,
      );
      return guardedOrder.deleteOrder(aid, BigInt(first.id));
    });
    await expect(orders.getOrder(aid, BigInt(first.id))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  } finally {
    await run.cleanup(lookup, (entry) => deleteOrderFixture(acquire(), entry));
  }
  expect(readFixtureReceipt(run.receiptFile).cleanupComplete).toBe(true);
}

it(
  reconciliationRun === undefined
    ? "round-trips owned Orders, proves scoped CI uniqueness and blocks referenced Scenario deletion"
    : "reads the private Order fixture receipt and verifies absence without mutations",
  async () => {
    try {
      await execute();
    } catch {
      // Assertion/driver errors can carry private fixture data. Keep the
      // detailed evidence in the receipt directory, outside public output.
      throw Error(
        "Order integration incomplete. Inspect the private receipt directory.",
      );
    }
  },
  600000,
);
