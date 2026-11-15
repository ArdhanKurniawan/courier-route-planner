// @vitest-environment node
import { expect, it, vi } from "vitest";
import { buildDummyPreview } from "@/application/generator/dummy-dataset";
import {
  getActiveDummyOperation,
  reconcileDummyOperation,
  saveDummyOrders,
} from "@/db/dummy-order-writer";
import { guardedDummyOrderMutations } from "@/db/guarded-dummy-order-mutations";
import type {
  DummyOperationView,
  DummySaveInput,
} from "@/lib/validation/dummy-preview";

const date = "2026-11-15 00:00:00.000000";
const now = new Date("2026-11-15T00:00:00.000Z");
const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
const scenario = {
  id: "10",
  depotId: "100",
  name: "Synthetic Scenario",
  distributionPattern: "random",
  status: "draft",
  customerCount: "25",
  radiusMinM: null,
  radiusMaxM: null,
  generationSeed: null,
  updatedAt: date,
};
const depot = {
  id: "100",
  name: "Synthetic Depot",
  isActive: "1" as const,
  latitude: "-6.2",
  longitude: "106.8",
  updatedAt: date,
};
const old = {
  id: "9007199254740993",
  scenarioId: "10",
  orderCode: "DUMMY-OLD",
  customerName: "Before",
  address: "Synthetic",
  latitude: "-6.2",
  longitude: "106.8",
  createdAt: date,
  updatedAt: date,
  source: "dummy" as const,
};
type RawOrder = Omit<typeof old, "source" | "address"> & {
  source: "dummy" | "manual";
  address: string | null;
};
type Receipt = DummyOperationView & {
  beforeHash: string;
  afterHash: string | null;
  requestHash: string;
  activeScenarioId: string | null;
  operationVersion: string;
};
const parameters = { count: 2, radiusMinM: 10, radiusMaxM: 100, seed: "32" };
const untouched: RawOrder[] = [
  { ...old, id: "4", source: "manual", orderCode: "MANUAL" },
  { ...old, id: "5", scenarioId: "20", orderCode: "OTHER" },
];

function database(
  options: {
    replace?: boolean;
    insertError?: boolean;
    rollbackLost?: boolean;
    commitLost?: "applied" | "aborted";
    reservationLost?: boolean;
    corruptObserver?: boolean;
    stopAfterCommit?: boolean;
    waitForInsert?: Promise<void>;
  } = {},
) {
  let persisted = {
    rows: [...(options.replace ? [old] : []), ...untouched],
    ledger: [] as Receipt[],
  };
  let owner: number | undefined;
  let connectionId = 0;
  let observerDown = false;
  let nextId = BigInt("9007199254741008");
  const commands: { id: number; sql: string }[] = [];
  const writes = () =>
    commands.filter(({ sql }) =>
      /^(DELETE|INSERT INTO orders|UPDATE orders)/.test(sql),
    );
  const afterBatchCommit = vi.fn();
  const destroy = vi.fn();
  const connect = vi.fn(async () => {
    if (observerDown) throw new Error("new socket unavailable");
    const id = ++connectionId;
    let transaction = false;
    let work: typeof persisted | undefined;
    let changedOrders = false;
    let reserved = false;
    function abandon() {
      if (owner === id) owner = undefined;
      work = undefined;
      transaction = false;
    }
    const query = async (
      sql: string,
      args: (string | number | null)[] = [],
    ) => {
      commands.push({ sql, id });
      if (sql === "BEGIN PESSIMISTIC") {
        transaction = true;
        return {};
      }
      if (sql === "ROLLBACK") {
        abandon();
        if (changedOrders && options.rollbackLost)
          throw Error("lost rollback response");
        return {};
      }
      if (sql === "COMMIT") {
        if (work && !(changedOrders && options.commitLost === "aborted"))
          persisted = work;
        abandon();
        if (changedOrders) {
          afterBatchCommit();
          if (options.corruptObserver) {
            const row = persisted.rows.find(
              (order) => order.source === "dummy" && order.scenarioId === "10",
            )!;
            row.id = "9007199254741001";
          }
          if (options.stopAfterCommit) observerDown = true;
          if (options.commitLost) throw Error("lost commit response");
        }
        if (reserved && options.reservationLost)
          throw Error("lost reservation response");
        return {};
      }
      if (sql.includes("FROM scenarios s")) {
        expect(transaction).toBe(true);
        expect(sql).toContain("FOR UPDATE NOWAIT");
        if (owner !== undefined && owner !== id)
          throw Object.assign(Error("busy"), { errno: 3572 });
        owner = id;
        work = structuredClone(persisted);
        return args[0] === "10" ? [scenario] : [];
      }
      if (sql.includes("FROM depots d"))
        return args[0] === "100" ? [depot] : [];
      if (sql.includes("FROM orders o")) {
        expect(sql).toContain("o.source = 'dummy'");
        return (work ?? persisted).rows
          .filter(
            (order) => order.scenarioId === args[0] && order.source === "dummy",
          )
          .sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
      }
      if (sql.includes("FROM dummy_order_operations")) {
        if (sql.includes("FOR UPDATE")) expect(owner).toBe(id);
        if (sql.includes("ORDER BY operation_version"))
          return (work ?? persisted).ledger
            .filter((row) => row.scenarioId === args[0])
            .slice(-1);
        return (work ?? persisted).ledger.filter((row) =>
          args.length === 1
            ? row.activeScenarioId === args[0]
            : row.operationId === args[0] && row.scenarioId === args[1],
        );
      }
      if (sql.startsWith("INSERT INTO dummy_order_operations")) {
        const [
          operationId,
          scenarioId,
          activeScenarioId,
          requestHash,
          beforeHash,
          replacedCount,
          operationVersion,
        ] = args as [string, string, string, string, string, number, string];
        expect(owner).toBe(id);
        if (
          work!.ledger.some(
            (row) =>
              row.operationId === operationId ||
              row.activeScenarioId === activeScenarioId,
          )
        )
          throw Object.assign(Error("unique"), { errno: 1062 });
        work!.ledger.push({
          operationId,
          scenarioId,
          activeScenarioId,
          requestHash,
          beforeHash,
          replacedCount,
          operationVersion,
          savedCount: 0,
          afterHash: null,
          status: "pending",
        });
        reserved = true;
        return { affectedRows: 1 };
      }
      if (sql.startsWith("UPDATE dummy_order_operations")) {
        expect(owner).toBe(id);
        if (sql.includes("SET status = 'committed'")) {
          const [hash, count, op, scope, active] = args as [
            string,
            number,
            string,
            string,
            string,
          ];
          const receipt = work!.ledger.find(
            (row) =>
              row.operationId === op &&
              row.scenarioId === scope &&
              row.activeScenarioId === active &&
              row.status === "pending",
          );
          if (!receipt) return { affectedRows: 0 };
          Object.assign(receipt, {
            status: "committed",
            afterHash: hash,
            savedCount: count,
          });
          return { affectedRows: 1 };
        }
        const [status, op, scope, active, previous] = args as [
          Receipt["status"],
          string,
          string,
          string,
          Receipt["status"]?,
        ];
        const receipt = work!.ledger.find(
          (row) =>
            row.operationId === op &&
            row.scenarioId === scope &&
            row.activeScenarioId === active &&
            row.status === (previous ?? "pending"),
        );
        if (!receipt) return { affectedRows: 0 };
        receipt.status = status;
        if (sql.includes("active_scenario_id = NULL"))
          receipt.activeScenarioId = null;
        return { affectedRows: 1 };
      }
      if (sql.startsWith("DELETE FROM orders")) {
        expect(owner).toBe(id);
        expect(sql).toContain("source = 'dummy'");
        expect(args[0]).toBe("10");
        if (sql.includes("id IN")) {
          expect(
            persisted.ledger.some((row) => row.activeScenarioId === "10"),
          ).toBe(true);
          expect(args.slice(1)).toEqual([old.id]);
        }
        const count = work!.rows.length;
        work!.rows = work!.rows.filter(
          (order) =>
            order.source !== "dummy" ||
            order.scenarioId !== args[0] ||
            !args.slice(1).includes(order.id),
        );
        changedOrders = true;
        return { affectedRows: count - work!.rows.length };
      }
      if (sql.startsWith("INSERT INTO orders")) {
        expect(owner).toBe(id);
        expect(
          persisted.ledger.some((row) => row.activeScenarioId === "10"),
        ).toBe(true);
        changedOrders = true;
        if (options.waitForInsert) await options.waitForInsert;
        if (options.insertError)
          throw Object.assign(new Error("duplicate"), { errno: 1062 });
        for (let i = 0; i < args.length; i += 7) {
          const [sid, code, customerName, lat, lon, createdAt, updatedAt] =
            args.slice(i, i + 7);
          work!.rows.push({
            id: (++nextId).toString(),
            scenarioId: String(sid),
            orderCode: String(code),
            customerName: String(customerName),
            address: null,
            latitude: String(lat),
            longitude: String(lon),
            createdAt: createdAt + "000",
            updatedAt: updatedAt + "000",
            source: "dummy",
          });
        }
        return { affectedRows: args.length / 7 };
      }
      if (sql.startsWith("UPDATE orders")) return { affectedRows: 1 };
      throw new Error("Unexpected test SQL");
    };
    return {
      query,
      close: async () => abandon(),
      destroy: () => {
        destroy();
        abandon();
      },
    };
  });
  function input(operationId = first): DummySaveInput {
    const orders = persisted.rows
      .filter((row) => row.scenarioId === "10" && row.source === "dummy")
      .map((row) => ({ ...row, source: "dummy" as const }));
    return {
      operationId,
      parameters,
      revision: buildDummyPreview(
        { scenario, depot, orders },
        parameters,
        persisted.ledger.at(-1)?.operationVersion ?? "0",
      ).revision,
      replaceCount: orders.length,
      ...(orders.length ? { confirmReplace: true } : {}),
    };
  }
  return {
    connect,
    commands,
    writes,
    destroy,
    afterBatchCommit,
    input,
    data: () => persisted,
    restart: () => {
      observerDown = false;
      return () => connect();
    },
    run: (value = input()) => saveDummyOrders("10", value, connect, now),
  };
}

it("persists a reservation first and commits orders and receipt together on the same writer", async () => {
  const db = database({ replace: true });
  const input = db.input();
  await expect(db.run(input)).resolves.toEqual({
    operationId: first,
    scenarioId: "10",
    savedCount: 2,
    replacedCount: 1,
    status: "committed",
  });
  expect(db.data().rows).not.toContainEqual(old);
  expect(db.data().rows).toEqual(expect.arrayContaining(untouched));
  expect(new Set(db.writes().map(({ id }) => id)).size).toBe(1);
  const writer = db.writes()[0].id;
  expect(
    db.commands.find(({ sql }) => sql.includes("SET status = 'committed'"))?.id,
  ).toBe(writer);
  expect(
    db.commands.find(({ sql }) =>
      sql.startsWith("INSERT INTO dummy_order_operations"),
    )?.id,
  ).not.toBe(writer);
  await expect(db.run(db.input(second))).rejects.toMatchObject({
    code: "OPERATION_PENDING",
  });
  await expect(
    reconcileDummyOperation("10", first, db.connect),
  ).resolves.toMatchObject({ status: "confirmed" });
  await expect(getActiveDummyOperation("10", db.connect)).resolves.toBeNull();
  await expect(db.run(input)).resolves.toMatchObject({ status: "confirmed" });
  expect(db.afterBatchCommit).toHaveBeenCalledOnce();
  await expect(
    db.run({ ...input, revision: "f".repeat(64) }),
  ).rejects.toMatchObject({ code: "OPERATION_ID_CONFLICT" });
});

it("recovers an applied commit after request interruption and restart; a second tab cannot replace it", async () => {
  const db = database({ commitLost: "applied", stopAfterCommit: true });
  await expect(db.run()).rejects.toMatchObject({ code: "COMMIT_UNKNOWN" });
  const otherWorker = db.restart();
  await expect(
    getActiveDummyOperation("10", otherWorker),
  ).resolves.toMatchObject({
    status: "committed",
    operationId: first,
    savedCount: 2,
  });
  await expect(
    saveDummyOrders("10", db.input(second), otherWorker, now),
  ).rejects.toMatchObject({ code: "OPERATION_PENDING" });
  expect(db.afterBatchCommit).toHaveBeenCalledOnce();
  await expect(
    reconcileDummyOperation("10", first, otherWorker),
  ).resolves.toMatchObject({ status: "confirmed" });
});

it("independently verifies a lost COMMIT acknowledgement and leaves its receipt active", async () => {
  const db = database({ commitLost: "applied" });
  await expect(db.run()).resolves.toMatchObject({ status: "committed" });
  expect(db.connect).toHaveBeenCalledTimes(3);
  expect(db.afterBatchCommit).toHaveBeenCalledOnce();
  expect(db.data().ledger[0].activeScenarioId).toBe("10");
});

it("survives an aborted COMMIT, blocks forever without verification, then releases on full before-data proof", async () => {
  const db = database({ replace: true, commitLost: "aborted" });
  const oldPreview = db.input(second);
  await expect(db.run()).rejects.toMatchObject({ code: "COMMIT_UNKNOWN" });
  expect(db.data().rows).toContainEqual(old);
  const restarted = db.restart();
  await expect(getActiveDummyOperation("10", restarted)).resolves.toMatchObject(
    { status: "commit_unknown" },
  );
  await expect(
    saveDummyOrders("10", db.input(second), restarted, new Date("2035-01-01")),
  ).rejects.toMatchObject({ code: "OPERATION_PENDING" });
  await expect(
    reconcileDummyOperation("10", first, restarted),
  ).resolves.toMatchObject({ status: "rolled_back" });
  await expect(
    saveDummyOrders("10", oldPreview, restarted, now),
  ).rejects.toMatchObject({ code: "STALE_PREVIEW" });
  expect(db.data().rows).toContainEqual(old);
});

it("treats the same count with a different Order ID as inconclusive and keeps the barrier", async () => {
  const db = database({
    replace: true,
    commitLost: "applied",
    corruptObserver: true,
  });
  await expect(db.run()).rejects.toMatchObject({ code: "COMMIT_UNKNOWN" });
  await expect(
    reconcileDummyOperation("10", first, db.connect),
  ).rejects.toMatchObject({ code: "RECONCILIATION_INCONCLUSIVE" });
  expect(db.data().ledger[0].activeScenarioId).toBe("10");
});

it.each([false, true])(
  "recovers INSERT failure atomically even if ROLLBACK acknowledgement is lost: %s",
  async (rollbackLost) => {
    const db = database({ replace: true, insertError: true, rollbackLost });
    await expect(db.run()).rejects.toMatchObject({
      code: rollbackLost ? "ROLLBACK_UNKNOWN" : "ORDER_CODE_CONFLICT",
    });
    expect(db.data().rows).toEqual([old, ...untouched]);
    expect(db.afterBatchCommit).not.toHaveBeenCalled();
    if (rollbackLost) {
      await expect(
        getActiveDummyOperation("10", db.connect),
      ).resolves.toMatchObject({ status: "rollback_unknown" });
      await expect(
        reconcileDummyOperation("10", first, db.connect),
      ).resolves.toMatchObject({ status: "rolled_back" });
    } else {
      await expect(
        getActiveDummyOperation("10", db.connect),
      ).resolves.toBeNull();
      expect(db.data().ledger[0].status).toBe("rolled_back");
    }
  },
);

it("can never start DML after a lost reservation acknowledgement", async () => {
  const db = database({ replace: true, reservationLost: true });
  await expect(db.run()).rejects.toMatchObject({ code: "COMMIT_UNKNOWN" });
  expect(db.writes()).toHaveLength(0);
  await expect(
    getActiveDummyOperation("10", db.connect),
  ).resolves.toMatchObject({ status: "pending" });
  await expect(
    reconcileDummyOperation("10", first, db.connect),
  ).resolves.toMatchObject({ status: "rolled_back" });
});

it("serializes two writers and denies a reconcile request while a batch still holds the Scenario lock", async () => {
  let resume!: () => void;
  const db = database({
    waitForInsert: new Promise<void>((done) => {
      resume = done;
    }),
  });
  const initialInput = db.input();
  const writing = db.run(initialInput);
  await vi.waitFor(() => expect(db.writes()).toHaveLength(1));
  try {
    await expect(
      db.run({ ...initialInput, operationId: second }),
    ).rejects.toMatchObject({ code: "BATCH_CONFLICT" });
    await expect(
      reconcileDummyOperation("10", first, db.connect),
    ).rejects.toMatchObject({ code: "BATCH_CONFLICT" });
    await expect(
      getActiveDummyOperation("10", db.connect),
    ).resolves.toMatchObject({ status: "pending" });
  } finally {
    resume();
    await writing;
  }
  expect(db.afterBatchCommit).toHaveBeenCalledOnce();
});

it("rejects stale preview before recording a reservation", async () => {
  const db = database();
  await expect(
    db.run({ ...db.input(), revision: "f".repeat(64) }),
  ).rejects.toMatchObject({ code: "STALE_PREVIEW" });
  expect(db.data().ledger).toHaveLength(0);
  expect(db.writes()).toHaveLength(0);
});

it("blocks dummy Order CRUD behind the same lease and allows edits after proof", async () => {
  const db = database({ replace: true });
  await db.run();
  const [dummy] = db
    .data()
    .rows.filter((row) => row.scenarioId === "10" && row.source === "dummy");
  const crud = guardedDummyOrderMutations(db.connect);
  const edited = {
    orderCode: dummy.orderCode,
    customerName: "Edited",
    address: null,
    latitude: 0,
    longitude: 0,
    updatedAt: now,
  };
  await expect(
    crud.update(BigInt(10), BigInt(dummy.id), edited),
  ).rejects.toMatchObject({ code: "DUMMY_OPERATION_PENDING" });
  await expect(crud.remove(BigInt(10), BigInt(dummy.id))).rejects.toMatchObject(
    { code: "DUMMY_OPERATION_PENDING" },
  );
  expect(db.writes()).toHaveLength(2);
  await reconcileDummyOperation("10", first, db.connect);
  await expect(crud.update(BigInt(10), BigInt(dummy.id), edited)).resolves.toBe(
    1,
  );
  await expect(crud.remove(BigInt(10), BigInt(dummy.id))).resolves.toBe(1);
  expect(db.data().rows).toEqual(expect.arrayContaining(untouched));
});
