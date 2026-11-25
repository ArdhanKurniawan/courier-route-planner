import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parseEnv } from "node:util";
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { z } from "zod";
import {
  BenchmarkCaseError,
  createBenchmarkCaseService,
  type BenchmarkCaseRepository,
  type BenchmarkCaseSource,
} from "@/application/benchmark-cases/benchmark-case-service";
import { createDepotService } from "@/application/depots/depot-service";
import { createOrderService } from "@/application/orders/order-service";
import { createScenarioService } from "@/application/scenarios/scenario-service";
import { createDatabase } from "@/db/client";
import { createBenchmarkCaseRepository } from "@/db/repositories/benchmark-case-repository";
import { createDepotRepository } from "@/db/repositories/depot-repository";
import { createOrderRepository } from "@/db/repositories/order-repository";
import { createScenarioRepository } from "@/db/repositories/scenario-repository";
import { benchmarkCasePoints, benchmarkCases } from "@/db/schema";
import type { BenchmarkInputSnapshot } from "@/domain/benchmark-input";
import { parseTestingTransactionTarget } from "../../scripts/testing-dummy-transaction-target.mjs";
import { assertIntegrationTarget } from "../../vitest.integration.config";
import { createOrderFixtureLookup } from "../fixtures/order-integration-lookup";
import {
  fixtureTarget,
  OrderIntegrationFixtures,
  readFixtureReceipt,
  readStoppedOrderRun,
} from "../fixtures/order-integration-fixtures";

// Operator-only cleanup, under separate Testing approval:
// Bind the private receipt pair to the verified Testing target, confirm the
// recorded writer has stopped, and resolve every write intent. Match the exact
// UUIDs, IDs, source tags, parent links,
// stored hash and point identities. Stop on missing evidence or any foreign
// reference. A null recovery is not proof of rollback after an unknown outcome.
// In one operator transaction, use bound, exact fixture predicates to remove
// points, case, Orders, Scenario and Depot in that order. Keep FK checks on.
// Roll back on row-count or ownership mismatch. Independently verify absence
// by the recorded IDs and UUIDs after commit. Reconcile any ambiguous outcome
// read-only. This test leaves both receipts and all committed fixtures in place.

const databaseName = "courier_route_planner_testing";
const protectedScenarios = new Set(["90001", "300001"]);
const identifier = z.string().regex(/^[1-9]\d{0,18}$/u);
const count = z.string().regex(/^(?:0|[1-9]\d*)$/u);
const identity = z.tuple([z.object({ db: z.string(), principal: z.string() })]);
const counts = z.object({
  rows: z.tuple([z.object({ cases: count, points: count })]),
});
const targetedRun = process.env.BENCHMARK_CASE_TARGETED_ACCEPTANCE_RUN;

type FreezeRequest = {
  scenarioId: string;
  requestId: string;
  expectedInputHash: string;
};
type Service = ReturnType<typeof createBenchmarkCaseService>;
type ReceiptWriter = (event: Record<string, unknown>) => void;

async function freezeWithReceipt(
  service: Service,
  observer: Service,
  record: ReceiptWriter,
  step: string,
  request: FreezeRequest,
) {
  record({ event: "freeze-intent", step, ...request });
  let saved: BenchmarkInputSnapshot;
  try {
    saved = await service.freeze(request);
  } catch (error) {
    const code =
      error instanceof BenchmarkCaseError ? error.code : "UNCLASSIFIED";
    record({ event: "freeze-error", step, ...request, code });
    if (code === "COMMIT_UNKNOWN") {
      let recovered: BenchmarkInputSnapshot | null;
      try {
        recovered = await observer.recover(request);
      } catch {
        record({ event: "recovery-unavailable", step, ...request });
        throw error;
      }
      const caseId = recovered?.provenance.benchmarkCaseId;
      record({
        event: "recovery-observed",
        step,
        ...request,
        caseId: caseId ?? null,
      });
      if (step === "commit" && recovered && caseId) return recovered;
    }
    throw error;
  }
  record({
    event: "committed",
    step,
    ...request,
    caseId: saved.provenance.benchmarkCaseId,
  });
  return saved;
}

async function runTargetedAcceptance(
  acquire: () => ReturnType<typeof createDatabase>,
  target: string,
  runId: string,
  setPhase: (phase: string) => void,
) {
  const { file, receipt } = readStoppedOrderRun(
    process.env.ORDER_INTEGRATION_RECEIPT_DIR,
    runId,
    target,
  );
  const sidecar = join(dirname(file), "benchmark-case.jsonl");
  const info = lstatSync(sidecar);
  if (!info.isFile() || info.size > 32768 || receipt.cleanupComplete)
    throw Error("Invalid acceptance receipt.");
  const entry = z.object({
    event: z.string(),
    step: z.string().optional(),
    runId: z.uuidv4().optional(),
    target: z.string().optional(),
    requestId: z.uuidv4().optional(),
    scenarioId: identifier.optional(),
    caseId: identifier.nullable().optional(),
    expectedInputHash: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
    code: z.string().optional(),
    requests: z.object({
      commit: z.uuidv4(),
      stale: z.uuidv4(),
      rollback: z.uuidv4(),
    }).optional(),
  });
  const [initial, ...events] = readFileSync(sidecar, "utf8")
    .trim().split(/\r?\n/u).map((line) => entry.parse(JSON.parse(line)));
  const commit = events.find((event) => event.event === "committed" && event.step === "commit");
  const intent = events.find((event) => event.event === "freeze-intent" && event.step === "commit");
  const [depot, scenario, ...orders] = receipt.fixtures;
  if (
    initial.event !== "run" || initial.runId !== runId || initial.target !== target ||
    !initial.requests || new Set(Object.values(initial.requests)).size !== 3 ||
    !commit?.expectedInputHash || !commit.requestId || !commit.caseId ||
    commit.requestId !== initial.requests.commit || intent?.requestId !== commit.requestId ||
    intent.expectedInputHash !== commit.expectedInputHash ||
    events.some((event) => event.step === "rollback" || event.event === "verified" ||
      event.code === "COMMIT_UNKNOWN" || event.code === "ROLLBACK_UNKNOWN") ||
    events.filter((event) => event.event === "committed").length !== 1 ||
    depot?.kind !== "depot" || !depot.id || scenario?.kind !== "scenario" ||
    !scenario.id || scenario.parentId !== depot.id || scenario.id !== commit.scenarioId ||
    scenario.id !== intent.scenarioId || protectedScenarios.has(scenario.id) ||
    orders.length !== 2 || orders.some((order) => order.kind !== "order" || order.parentId !== scenario.id)
  )
    throw Error("Targeted fixture scope mismatch.");

  const lookup = createOrderFixtureLookup((query) => acquire().execute(query));
  for (const row of receipt.fixtures) {
    const [live, ...others] = await lookup(row);
    if (
      row.state !== "created" || !live || others.length ||
      live.id !== row.id || live.taggedName !== row.taggedName || live.parentId !== row.parentId
    )
      throw Error("Targeted fixture ownership mismatch.");
  }

  const scenarioId = scenario.id;
  const caseId = commit.caseId;
  const original = {
    scenarioId, requestId: commit.requestId, expectedInputHash: commit.expectedInputHash,
  };
  const real = createBenchmarkCaseRepository(acquire);
  async function ownSource(id: string, read: (id: string) => Promise<BenchmarkCaseSource>) {
    if (id !== scenarioId) throw Error("Unowned Scenario read.");
    const source = await read(id);
    if (
      source.scenario.depotId !== depot.id || source.scenario.name !== scenario.taggedName ||
      source.scenario.status !== "draft" || source.depot.id !== depot.id ||
      source.depot.name !== depot.taggedName || source.depot.isActive !== true ||
      source.orders.length !== orders.length ||
      !orders.every((order) => source.orders.some((row) =>
        row.id === order.id && row.scenarioId === scenarioId &&
        row.orderCode === order.taggedName && row.source === "manual"))
    )
      throw Error("Targeted source ownership mismatch.");
    return source;
  }
  let writerAttempted = false;
  const guarded: BenchmarkCaseRepository = {
    ...real,
    readSource: (id) => ownSource(id, real.readSource),
    transact: (requestId, work) => {
      writerAttempted = true;
      return real.transact(requestId, (writer) =>
        work({ ...writer, readSource: (id) => ownSource(id, writer.readSource) }),
      );
    },
  };
  const service = createBenchmarkCaseService(guarded);
  const observer = createBenchmarkCaseService(real);
  const targetedCounts = z.object({
    rows: z.tuple([z.object({ cases: count, headers: count, points: count })]),
  });
  const inspect = async (candidateId: string) => targetedCounts.parse(
    await acquire().execute(sql`
      SELECT CAST((SELECT COUNT(*) FROM ${benchmarkCases}
        WHERE ${benchmarkCases.scenarioId} = ${BigInt(scenarioId)}) AS CHAR) AS cases,
        CAST((SELECT COUNT(*) FROM ${benchmarkCases}
        WHERE ${benchmarkCases.id} = ${BigInt(identifier.parse(candidateId))}) AS CHAR) AS headers,
        CAST((SELECT COUNT(*) FROM ${benchmarkCasePoints}
        WHERE ${benchmarkCasePoints.caseId} = ${BigInt(identifier.parse(candidateId))}) AS CHAR) AS points
    `),
  ).rows[0];
  const committed = await observer.recover(original);
  expect(committed?.provenance.benchmarkCaseId).toBe(caseId);
  expect(committed?.nodes.map((node) => [node.kind, node.id])).toEqual([
    ["depot", depot.id],
    ...orders.map((order) => ["order", identifier.parse(order.id)]).sort(
      (a, b) => BigInt(a[1]) < BigInt(b[1]) ? -1 : 1,
    ),
  ]);
  const committedCounts = { cases: "1", headers: "1", points: "3" };
  expect(await inspect(caseId)).toEqual(committedCounts);
  const latest = await service.preview(scenarioId);
  expect(latest.inputHash).not.toBe(original.expectedInputHash);
  const duplicate = { ...original, expectedInputHash: latest.inputHash };
  const rollback = { ...duplicate, requestId: randomUUID() };
  expect(Object.values(initial.requests)).not.toContain(rollback.requestId);
  expect(await observer.recover(rollback)).toBeNull();

  // Exclusive sidecar blocks a second targeted invocation on the same fixture.
  const fd = openSync(join(dirname(file), "benchmark-case-targeted.jsonl"), "wx", 0o600);
  const record: ReceiptWriter = (event) => {
    writeFileSync(fd, JSON.stringify(event) + "\n", "utf8");
    fsyncSync(fd);
  };
  const attempt = async (service: Service, step: string, request: FreezeRequest) => {
    try {
      await freezeWithReceipt(service, observer, record, step, request);
      return "COMMITTED";
    } catch (error) {
      return error instanceof BenchmarkCaseError ? error.code : "UNCLASSIFIED";
    }
  };
  try {
    record({ event: "targeted-run", runId, target, writerPid: process.pid, caseId });
    setPhase("duplicate");
    const duplicateCode = await attempt(service, "duplicate", duplicate);
    if (["COMMIT_UNKNOWN", "ROLLBACK_UNKNOWN", "UNCLASSIFIED"].includes(duplicateCode))
      throw Error("Ambiguous duplicate outcome.");
    expect(await inspect(caseId)).toEqual(committedCounts);
    expect(await observer.recover(original)).toEqual(committed);
    const duplicatePassed = duplicateCode === "FREEZE_REQUEST_CONFLICT" && !writerAttempted;
    record({ event: "duplicate-result", code: duplicateCode, passed: duplicatePassed });
    console.info("Targeted duplicate:", duplicateCode, duplicatePassed ? "PASS" : "FAIL");

    setPhase("controlled-rollback");
    let rolledBackCaseId: string | undefined;
    const rollbackService = createBenchmarkCaseService({
      ...guarded,
      transact: (key, work) => guarded.transact(key, (writer) =>
        work({
          ...writer,
          async insert(id, snapshot) {
            const saved = await writer.insert(id, snapshot);
            rolledBackCaseId = identifier.parse(saved.provenance.benchmarkCaseId);
            record({ event: "rollback-candidate", ...rollback, caseId: rolledBackCaseId });
            throw Error("Controlled acceptance rollback before commit.");
          },
        }),
      ),
    });
    const rollbackCode = await attempt(rollbackService, "rollback", rollback);
    record({ event: "rollback-result", code: rollbackCode });
    expect(rollbackCode).toBe("UNAVAILABLE");
    const candidate = identifier.parse(rolledBackCaseId);
    expect(candidate).not.toBe(caseId);
    expect(await inspect(candidate)).toEqual({ cases: "1", headers: "0", points: "0" });
    expect(await observer.recover(rollback)).toBeNull();
    expect(await inspect(caseId)).toEqual(committedCounts);
    expect(await observer.recover(original)).toEqual(committed);
    console.info("Targeted controlled rollback: PASS");
    setPhase("duplicate-verdict");
    expect(duplicatePassed).toBe(true);
    record({ event: "verified", caseId, rolledBackCaseId: candidate, cleanupPending: true });
  } finally {
    closeSync(fd);
  }
}

it.skipIf(process.env.RUN_BENCHMARK_CASE_ACCEPTANCE !== "1")(
  targetedRun === undefined
    ? "accepts one owned Benchmark Case on TiDB Testing and preserves evidence for operator cleanup"
    : "checks UUID conflict and controlled rollback on an existing Testing fixture",
  { timeout: 300000, retry: 0 },
  async () => {
    let phase = "testing-target";
    let receipt: number | undefined;
    let runId: string | undefined;
    try {
      assertIntegrationTarget(process.env);
      if (
        process.env.ORDER_INTEGRATION_RECONCILE_RUN !== undefined ||
        process.env.CI !== undefined ||
        process.env.GITHUB_ACTIONS !== undefined ||
        process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
        process.env.SSLKEYLOGFILE ||
        process.env.NODE_OPTIONS ||
        process.execArgv.some((arg) => arg.startsWith("--tls-keylog"))
      )
        throw Error("Local TLS-verified Testing run required.");
      const testing = parseEnv(readFileSync(".env.testing.local", "utf8"));
      if (
        testing.APP_ENV !== "testing" ||
        testing.DATABASE_URL !== process.env.DATABASE_URL
      )
        throw Error("Testing application configuration mismatch.");
      const url = testing.DATABASE_URL;
      const { host, user: account } = parseTestingTransactionTarget(
        testing,
        process.env.TESTING_DUMMY_DB_TARGET_SHA256 ?? "",
      );
      const sqlOrigin = "https://http-" + host;
      let statements = 0;
      const acquire = () =>
        createDatabase(url, (input, init) => {
          if (new URL(input).origin !== sqlOrigin || ++statements > 100)
            throw Error("Testing transport scope exceeded.");
          return fetch(input, { ...init, redirect: "error" } as RequestInit);
        });
      const [session] = identity.parse(
        await acquire().$client.execute(
          "SELECT DATABASE() AS db, CURRENT_USER() AS principal",
        ),
      );
      if (
        session.db !== databaseName ||
        session.principal.slice(0, session.principal.lastIndexOf("@")) !==
          account
      )
        throw Error("Testing session identity mismatch.");

      phase = "private-receipt";
      const target = fixtureTarget(url);
      if (targetedRun !== undefined) {
        runId = z.uuidv4().parse(targetedRun);
        await runTargetedAcceptance(acquire, target, runId, (step) => { phase = step; });
        return;
      }
      const run = new OrderIntegrationFixtures(
        process.env.ORDER_INTEGRATION_RECEIPT_DIR,
        target,
      );
      runId = run.runId;
      const requests = {
        commit: randomUUID(),
        stale: randomUUID(),
        rollback: randomUUID(),
      };
      const fd = openSync(
        join(dirname(run.receiptFile), "benchmark-case.jsonl"),
        "wx",
        0o600,
      );
      receipt = fd;
      const record: ReceiptWriter = (event) => {
        writeFileSync(fd, JSON.stringify(event) + "\n", "utf8");
        fsyncSync(fd);
      };
      record({
        event: "run",
        runId: run.runId,
        target,
        requests,
        sourceReceipt: "receipt.json",
      });
      if (process.platform !== "win32") {
        const directory = openSync(dirname(run.receiptFile), "r");
        try {
          fsyncSync(directory);
        } finally {
          closeSync(directory);
        }
      }

      console.info("Benchmark Case acceptance run:", runId);
      phase = "source-fixtures";
      const depotRepo = createDepotRepository(acquire);
      const scenarioRepo = createScenarioRepository(acquire);
      const orderRepo = createOrderRepository(acquire);
      const depots = createDepotService({
        ...depotRepo,
        insert: (input) =>
          run.insert("depot", input.name, null, () => depotRepo.insert(input)),
      });
      const scenarios = createScenarioService({
        ...scenarioRepo,
        insert: (input) =>
          run.insert("scenario", input.name, input.depotId, () =>
            scenarioRepo.insert(input),
          ),
      });
      const orders = createOrderService({
        ...orderRepo,
        insert: (sid, input) =>
          run.insert("order", input.orderCode, sid, () =>
            orderRepo.insert(sid, input),
          ),
        update: (sid, id, input) =>
          run.change("order", id, () => orderRepo.update(sid, id, input)),
      });
      const depot = await run.mutate(() =>
        depots.createDepot({
          name: run.tag + "-depot",
          address: null,
          latitude: -6.96,
          longitude: 110.42,
          isActive: true,
        }),
      );
      const scenario = await run.mutate(() =>
        scenarios.createScenario({
          name: run.tag + "-scenario",
          depotId: depot.id,
          distributionPattern: "random",
          customerCount: 3,
          radiusMinM: null,
          radiusMaxM: null,
          generationSeed: "9007199254740993",
        }),
      );
      if (protectedScenarios.has(scenario.id) || scenario.status !== "draft")
        throw Error("Unexpected fixture Scenario.");
      const sid = BigInt(scenario.id);
      const orderInput = (suffix: string, latitude: number) => ({
        orderCode: (run.tag + "-" + suffix).toUpperCase(),
        customerName: run.tag + "-customer-" + suffix,
        address: null,
        latitude,
        longitude: 110.43,
      });
      const firstInput = orderInput("A", -6.95);
      const first = await run.mutate(() => orders.createOrder(sid, firstInput));
      const second = await run.mutate(() =>
        orders.createOrder(sid, orderInput("B", -6.94)),
      );
      const ownedOrders = [first, second];
      record({
        event: "source",
        depotId: depot.id,
        scenarioId: scenario.id,
        orderIds: ownedOrders.map((o) => o.id),
      });

      async function verifyOwnedReceipt() {
        const saved = readFixtureReceipt(run.receiptFile);
        const owned = new Set([
          depot.id + ":depot",
          scenario.id + ":scenario",
          ...ownedOrders.map((o) => o.id + ":order"),
        ]);
        if (
          saved.runId !== run.runId ||
          saved.target !== target ||
          saved.fixtures.length !== owned.size
        )
          throw Error("Fixture receipt scope mismatch.");
        const lookup = createOrderFixtureLookup((query) =>
          acquire().execute(query),
        );
        for (const row of saved.fixtures) {
          if (row.state !== "created" || !owned.delete(row.id + ":" + row.kind))
            throw Error("Unowned fixture row.");
          const [live, ...others] = await lookup(row);
          if (
            others.length ||
            live?.id !== row.id ||
            live.taggedName !== row.taggedName ||
            live.parentId !== row.parentId
          )
            throw Error("Fixture identity could not be verified.");
        }
      }
      const real = createBenchmarkCaseRepository(acquire);
      async function ownSource(
        id: string,
        read: (id: string) => Promise<BenchmarkCaseSource>,
      ) {
        if (id !== scenario.id) throw Error("Unowned Scenario read.");
        const source = await read(id);
        if (
          source.scenario.id !== id ||
          source.scenario.name !== scenario.name ||
          source.scenario.status !== "draft" ||
          source.scenario.depotId !== depot.id ||
          source.depot.id !== depot.id ||
          source.depot.name !== depot.name ||
          source.depot.isActive !== true ||
          source.orders.length !== ownedOrders.length ||
          !ownedOrders.every((order) =>
            source.orders.some(
              (row) =>
                row.id === order.id &&
                row.scenarioId === id &&
                row.orderCode === order.orderCode &&
                row.source === "manual",
            ),
          )
        )
          throw Error("Benchmark source is outside fixture scope.");
        return source;
      }
      const repository: BenchmarkCaseRepository = {
        ...real,
        readSource: (id) => ownSource(id, real.readSource),
        transact: (requestId, work) =>
          real.transact(requestId, (writer) =>
            work({
              ...writer,
              readSource: (id) => ownSource(id, writer.readSource),
            }),
          ),
      };
      const service = createBenchmarkCaseService(repository);
      // A fresh database client per acquire makes recovery independent of the writer.
      const observer = createBenchmarkCaseService(
        createBenchmarkCaseRepository(acquire),
      );
      const inspectCounts = async (caseId: string) =>
        counts.parse(
          await acquire().execute(sql`
          SELECT CAST((SELECT COUNT(*) FROM ${benchmarkCases}
            WHERE ${benchmarkCases.scenarioId} = ${sid}) AS CHAR) AS cases,
            CAST((SELECT COUNT(*) FROM ${benchmarkCasePoints}
            WHERE ${benchmarkCasePoints.caseId} = ${BigInt(identifier.parse(caseId))}) AS CHAR) AS points
        `),
        ).rows[0];

      phase = "preview";
      await verifyOwnedReceipt();
      const preview = await service.preview(scenario.id);
      expect(await service.preview(scenario.id)).toEqual(preview);
      expect(preview.inputHash).toBe(
        createHash("sha256")
          .update(preview.canonicalInput, "utf8")
          .digest("hex"),
      );
      expect(preview).toMatchObject({
        version: "benchmark-case-input/v1",
        configuredCustomerCount: 3,
        actualOrderCount: 2,
        pointCount: 3,
        scenario: {
          generationSeed: "9007199254740993",
          generatorVersion: null,
        },
      });
      const sorted = ownedOrders
        .map((o) => BigInt(o.id))
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      expect(preview.nodes.map((n) => [n.index, n.kind, n.id])).toEqual([
        [0, "depot", depot.id],
        [1, "order", String(sorted[0])],
        [2, "order", String(sorted[1])],
      ]);
      const initial = {
        scenarioId: scenario.id,
        expectedInputHash: preview.inputHash,
        requestId: requests.commit,
      };

      phase = "commit-and-readback";
      const saved = await freezeWithReceipt(
        service,
        observer,
        record,
        "commit",
        initial,
      );
      const caseId = identifier.parse(saved.provenance.benchmarkCaseId);
      expect(saved.inputHash).toBe(preview.inputHash);
      expect(saved.canonicalInput).toBe(preview.canonicalInput);
      expect(saved.nodes).toEqual(preview.nodes);
      expect(await observer.recover(initial)).toEqual(saved);
      expect(await inspectCounts(caseId)).toEqual({ cases: "1", points: "3" });

      phase = "changed-source";
      await verifyOwnedReceipt();
      await run.mutate(() =>
        orders.updateOrder(sid, BigInt(first.id), {
          ...firstInput,
          latitude: -6.945,
        }),
      );
      const changed = await service.preview(scenario.id);
      expect(changed.inputHash).not.toBe(preview.inputHash);
      const stale = { ...initial, requestId: requests.stale };
      await expect(
        freezeWithReceipt(service, observer, record, "stale", stale),
      ).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
      expect(await observer.recover(stale)).toBeNull();
      const duplicate = { ...initial, expectedInputHash: changed.inputHash };
      await expect(
        freezeWithReceipt(service, observer, record, "duplicate", duplicate),
      ).rejects.toMatchObject({
        code: "FREEZE_REQUEST_CONFLICT",
        requestId: initial.requestId,
      });
      await expect(observer.recover(duplicate)).rejects.toMatchObject({
        code: "FREEZE_REQUEST_CONFLICT",
        requestId: initial.requestId,
      });
      expect(await observer.recover(initial)).toEqual(saved);
      expect(await inspectCounts(caseId)).toEqual({ cases: "1", points: "3" });

      phase = "controlled-rollback";
      let rolledBackCaseId: string | undefined;
      const rollback = { ...duplicate, requestId: requests.rollback };
      const rollbackService = createBenchmarkCaseService({
        ...repository,
        transact: (requestId, work) =>
          repository.transact(requestId, (writer) =>
            work({
              ...writer,
              async insert(id, snapshot) {
                const inserted = await writer.insert(id, snapshot);
                rolledBackCaseId = identifier.parse(
                  inserted.provenance.benchmarkCaseId,
                );
                record({
                  event: "rollback-candidate",
                  ...rollback,
                  caseId: rolledBackCaseId,
                });
                throw Error("Controlled acceptance rollback before commit.");
              },
            }),
          ),
      });
      await expect(
        freezeWithReceipt(
          rollbackService,
          observer,
          record,
          "rollback",
          rollback,
        ),
      ).rejects.toMatchObject({ code: "UNAVAILABLE" });
      // The tentative ID proves the injected failure happened after both inserts.
      expect(await inspectCounts(identifier.parse(rolledBackCaseId))).toEqual({
        cases: "1",
        points: "0",
      });
      expect(await observer.recover(rollback)).toBeNull();
      await verifyOwnedReceipt();
      record({
        event: "verified",
        caseId,
        rolledBackCaseId,
        cleanupPending: true,
      });
    } catch {
      throw Error(
        `Benchmark Case acceptance stopped at ${phase}.` +
          (runId ? ` Inspect private receipts for run ${runId}.` : ""),
      );
    } finally {
      if (receipt !== undefined) closeSync(receipt);
    }
  },
);
