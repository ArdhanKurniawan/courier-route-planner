// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildBenchmarkInput } from "@/domain/benchmark-input";
import {
  createBenchmarkCaseService,
  type BenchmarkCaseRepository,
} from "@/application/benchmark-cases/benchmark-case-service";
import { createDatabase } from "@/db/client";
import { createBenchmarkCaseRepository } from "@/db/repositories/benchmark-case-repository";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";

const scenarioId = "9007199254740995";
const depotId = "9007199254740993";
const caseId = "9007199254740997";
const requestId = "dcdfdb87-e66a-4a7b-9eeb-49eba5a61c00";
const frozenAt = "2026-01-02T13:14:15.123Z";
const scenario = {
  id: scenarioId,
  depotId,
  name: "Synthetic scenario",
  distributionPattern: "random",
  customerCount: 8,
  radiusMinM: 50,
  radiusMaxM: 900,
  generationSeed: "-9007199254740993",
  generatorVersion: null,
  status: "draft",
};
const depot = {
  id: depotId,
  name: "Synthetic depot",
  address: null,
  latitude: -6.123456789012345,
  longitude: 110.34567890123456,
  isActive: true,
};
const orders = ["9007199254740992", "9007199254740993"].map((id, index) => ({
  id,
  scenarioId,
  orderCode: "ORDER-" + id,
  customerName: "Synthetic customer's name",
  address: index === 0 ? "Synthetic \\ address" : null,
  latitude: -7.3210987654321 + index,
  longitude: 111.234567890123 + index,
  source: index === 0 ? "manual" : "dummy",
}));
const baseline = buildBenchmarkInput({ scenario, depot, orders });
const header = {
  id: caseId,
  scenarioId,
  requestId,
  scenario: baseline.scenario,
  configuredCustomerCount: 8,
  actualOrderCount: 2,
  pointCount: 3,
  inputVersion: baseline.version,
  inputHash: baseline.inputHash,
  frozenAt: "2026-01-02 13:14:15.123",
};

function wire(fields: Record<string, string>, values: unknown[][]) {
  return {
    types: Object.entries(fields).map(([name, type]) => ({ name, type })),
    rows: values.map((row) =>
      row.map((value, index) => {
        if (value === null) return null;
        return Object.values(fields)[index] === "JSON"
          ? JSON.stringify(value)
          : String(value);
      }),
    ),
  };
}
function sourceReply(
  changes: {
    scenario?: typeof scenario | null;
    depot?: typeof depot | null;
    orders?: typeof orders;
    count?: number;
    active?: string | null;
  } = {},
) {
  const currentOrders = changes.orders ?? orders;
  const sourceScenario =
    changes.scenario === undefined ? scenario : changes.scenario;
  const sourceDepot = changes.depot === undefined ? depot : changes.depot;
  return wire(
    {
      source_scenario: "JSON",
      source_depot: "JSON",
      source_order: "JSON",
      actual_count: "CHAR",
      active_scenario_id: "CHAR",
    },
    (currentOrders.length > 0 ? currentOrders : [null]).map((order) => [
      sourceScenario,
      sourceDepot && { ...sourceDepot, isActive: Number(sourceDepot.isActive) },
      order,
      changes.count ?? currentOrders.length,
      changes.active ?? null,
    ]),
  );
}
const points = baseline.nodes.map((node) => ({
  caseId,
  nodeIndex: node.index,
  kind: node.kind,
  sourceId: node.id,
  name: node.kind === "depot" ? node.name : node.customerName,
  address: node.address,
  latitude: node.latitude,
  longitude: node.longitude,
  orderCode: node.kind === "order" ? node.orderCode : null,
  orderSource: node.kind === "order" ? node.source : null,
  depotActive: node.kind === "depot" ? true : null,
}));
function storedReply(
  caseHeader: Record<string, unknown> | null = header,
  casePoints: typeof points = points,
) {
  return wire(
    { case_header: "JSON", case_point: "JSON" },
    (casePoints.length > 0 ? casePoints : [null]).map((point) => [
      caseHeader,
      point,
    ]),
  );
}

type Reply = object | Error | Response;
const sessionReply = () => ({});
const okHeader = () => ({ rowsAffected: 1, sLastInsertID: caseId });
const okPoints = () => ({ rowsAffected: 3 });
const sessionMode = () =>
  wire({ sql_mode: "VARCHAR" }, [["STRICT_TRANS_TABLES"]]);
const complete = () => [
  sessionReply(),
  sessionMode(),
  sourceReply(),
  okHeader(),
  okPoints(),
  storedReply(),
  sourceReply(),
  sessionReply(),
];
const request = {
  scenarioId,
  requestId,
  expectedInputHash: baseline.inputHash,
};

it("passes the complete canonical snapshot through the service's transaction port", async () => {
  const source = { scenario, depot, orders };
  const saved = buildBenchmarkInput({
    ...source,
    provenance: { frozenAt, benchmarkCaseId: caseId },
  });
  const writer = {
    readSource: vi.fn(async () => source),
    insert: vi.fn(async () => saved),
  };
  const repository: BenchmarkCaseRepository = {
    readSource: vi.fn(async () => source),
    findByRequestId: async () => null,
    async transact(key, work) {
      expect(key).toBe(requestId);
      return work(writer);
    },
  };
  const service = createBenchmarkCaseService(
    repository,
    () => new Date(frozenAt),
  );
  await expect(service.freeze(request)).resolves.toEqual(saved);
  expect(writer.readSource).toHaveBeenCalledExactlyOnceWith(scenarioId);
  expect(writer.insert).toHaveBeenCalledExactlyOnceWith(
    requestId,
    expect.objectContaining({
      canonicalInput: baseline.canonicalInput,
      actualOrderCount: orders.length,
    }),
  );
  expect(repository.readSource).toHaveBeenCalledExactlyOnceWith(scenarioId);
});

function connect(replies: Reply[]) {
  const calls: {
    query: string;
    session: string | null;
    isolation: string | null;
  }[] = [];
  const transport = vi.fn<DatabaseFetch>(async (_url, init) => {
    const { query } = JSON.parse(init!.body);
    const headers = new Headers(init!.headers);
    calls.push({
      query,
      session: headers.get("TiDB-Session"),
      isolation: headers.get("TiDB-Isolation-Level"),
    });
    const reply = replies.shift();
    if (!reply) throw new Error("Unexpected SQL in offline fixture");
    if (reply instanceof Error) throw reply;
    if (reply instanceof Response) return reply;
    const session =
      query === "BEGIN"
        ? "synthetic-tx"
        : headers.get("TiDB-Session") || "synthetic-independent-read";
    return Response.json(reply, { headers: { "TiDB-Session": session } });
  });
  const acquire = vi.fn(() => createDatabase(fakeDatabaseUrl, transport));
  const repository = createBenchmarkCaseRepository(acquire);
  const service = createBenchmarkCaseService(
    repository,
    () => new Date(frozenAt),
  );
  return { service, repository, calls, remaining: () => replies.length };
}

describe("Benchmark Case persistence over the installed TiDB HTTP adapter", () => {
  it("copies the complete set and commits header and points once on a single session", async () => {
    const fixture = connect(complete());
    const snapshot = await fixture.service.freeze(request);

    expect(snapshot.configuredCustomerCount).toBe(8);
    expect(snapshot.actualOrderCount).toBe(2);
    expect(snapshot.pointCount).toBe(3);
    expect(snapshot.inputHash).toBe(baseline.inputHash);
    expect(snapshot.canonicalInput).toBe(baseline.canonicalInput);
    expect(snapshot.nodes).toEqual(baseline.nodes);
    expect(snapshot.scenario.generatorVersion).toBeNull();
    expect(snapshot.provenance).toEqual({ frozenAt, benchmarkCaseId: caseId });
    expect(fixture.calls[0]).toMatchObject({
      query: "BEGIN",
      isolation: "REPEATABLE READ",
    });
    expect(fixture.calls.slice(1, 6).map((call) => call.session)).toEqual(
      Array(5).fill("synthetic-tx"),
    );
    expect(fixture.calls[2].query).toMatch(/COUNT\(.*\) OVER \(\)/i);
    expect(fixture.calls[2].query).toContain("'generatorVersion', NULL");
    expect(fixture.calls[3].query).toMatch(/insert into `benchmark_cases`/i);
    expect(fixture.calls[4].query).toMatch(
      /insert into `benchmark_case_points`/i,
    );
    expect(fixture.calls[4].query).toContain("9007199254740992");
    expect(fixture.calls[4].query).toContain("9007199254740993");
    expect(fixture.calls[4].query).toContain(String(depot.latitude));
    expect(fixture.calls[6].session).not.toBe("synthetic-tx");
    expect(fixture.calls[7]).toMatchObject({
      query: "COMMIT",
      session: "synthetic-tx",
    });
    expect(fixture.remaining()).toBe(0);
  });

  it.each(["header", "points"])(
    "rolls back a failed %s insert",
    async (stage) => {
      const fixture = connect([
        sessionReply(),
        sessionMode(),
        sourceReply(),
        ...(stage === "points" ? [okHeader()] : []),
        new Error("Synthetic insert interruption"),
        sessionReply(),
        storedReply(null, []),
      ]);
      await expect(fixture.service.freeze(request)).rejects.toMatchObject({
        code: "UNAVAILABLE",
      });
      expect(fixture.calls.at(-1)).toMatchObject({
        query: "ROLLBACK",
        session: "synthetic-tx",
      });
      expect(
        fixture.calls.filter(({ query }) => query === "COMMIT"),
      ).toHaveLength(0);
      await expect(fixture.service.recover(request)).resolves.toBeNull();
      expect(fixture.remaining()).toBe(0);
    },
  );

  it("rolls back a short points insert", async () => {
    const fixture = connect([
      sessionReply(),
      sessionMode(),
      sourceReply(),
      okHeader(),
      { rowsAffected: 2 },
      sessionReply(),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "CORRUPT_BENCHMARK_CASE",
    });
    expect(fixture.calls.map(({ query }) => query).at(-1)).toBe("ROLLBACK");
    expect(fixture.remaining()).toBe(0);
  });

  it("handles transaction token loss after an INSERT without a sessionless rollback", async () => {
    const fixture = connect([
      sessionReply(),
      sessionMode(),
      sourceReply(),
      okHeader(),
      Response.json(okPoints()),
      sessionReply(),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "ROLLBACK_UNKNOWN",
      requestId,
    });
    expect(fixture.calls.at(-1)).toMatchObject({
      query: expect.stringMatching(/insert into `benchmark_case_points`/iu),
      session: "synthetic-tx",
    });
    expect(fixture.remaining()).toBe(1);
  });

  it("reports an unacknowledged rollback without attempting COMMIT", async () => {
    const fixture = connect([
      sessionReply(),
      sessionMode(),
      sourceReply(),
      okHeader(),
      new Error("Synthetic INSERT failure"),
      new Error("Synthetic rollback acknowledgement loss"),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "ROLLBACK_UNKNOWN",
      requestId,
    });
    expect(fixture.calls.at(-1)?.query).toBe("ROLLBACK");
    expect(fixture.remaining()).toBe(0);
  });

  it("reports lost COMMIT acknowledgement and recovers by the same request key", async () => {
    const fixture = connect([
      ...complete().slice(0, -1),
      new Error("Synthetic COMMIT acknowledgement loss"),
      storedReply(),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "COMMIT_UNKNOWN",
      requestId,
    });
    expect(fixture.calls.at(-1)?.query).toBe("COMMIT");
    expect(fixture.calls.filter(({ query }) => query === "BEGIN")).toHaveLength(
      1,
    );
    const recovered = await fixture.service.recover(request);
    expect(recovered?.inputHash).toBe(baseline.inputHash);
    expect(recovered?.provenance.benchmarkCaseId).toBe(caseId);
    expect(fixture.calls.at(-1)?.query).toContain(requestId);
    expect(fixture.calls.at(-1)?.session).not.toBe("synthetic-tx");
    expect(fixture.remaining()).toBe(0);
  });

  it("leaves an absent recovery unconfirmed and never begins another write", async () => {
    const fixture = connect([storedReply(null, [])]);
    await expect(fixture.service.recover(request)).resolves.toBeNull();
    expect(fixture.calls.map(({ query }) => query)).toEqual([
      expect.stringMatching(/^\s*SELECT/iu),
    ]);
    expect(fixture.remaining()).toBe(0);
  });

  it("rolls back a duplicate request ID instead of inserting another set of points", async () => {
    const fixture = connect([
      sessionReply(),
      sessionMode(),
      sourceReply(),
      Response.json(
        { code: 1062, message: "Synthetic duplicate" },
        { status: 409 },
      ),
      sessionReply(),
      storedReply(),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "FREEZE_REQUEST_CONFLICT",
      requestId,
    });
    expect(fixture.calls.at(-1)?.query).toBe("ROLLBACK");
    expect(
      fixture.calls.every(
        ({ query }) => !/insert into `benchmark_case_points`/iu.test(query),
      ),
    ).toBe(true);
    await expect(fixture.service.recover(request)).resolves.toMatchObject({
      inputHash: baseline.inputHash,
    });
    expect(fixture.remaining()).toBe(0);
  });

  it.each(["coordinates", "label", "membership"])(
    "rejects intervening changes to Order %s",
    async (field) => {
      const updated = orders.map((row) => ({ ...row }));
      if (field === "coordinates") updated[0].latitude += 0.01;
      if (field === "label")
        updated[0].customerName = "Changed after transaction read";
      if (field === "membership") updated.pop();
      const fixture = connect([
        ...complete().slice(0, 6),
        sourceReply({ orders: updated }),
        sessionReply(),
      ]);
      await expect(fixture.service.freeze(request)).rejects.toMatchObject({
        code: "SOURCE_CHANGED",
      });
      expect(fixture.calls.at(-2)?.session).not.toBe("synthetic-tx");
      expect(fixture.calls.at(-1)?.query).toBe("ROLLBACK");
      expect(fixture.remaining()).toBe(0);
    },
  );

  it("rejects stale preview hashes before inserting", async () => {
    const fixture = connect([
      sessionReply(),
      sessionMode(),
      sourceReply(),
      sessionReply(),
    ]);
    await expect(
      fixture.service.freeze({ ...request, expectedInputHash: "f".repeat(64) }),
    ).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
    expect(fixture.calls.at(-1)?.query).toBe("ROLLBACK");
    expect(fixture.remaining()).toBe(0);
  });

  it.each([
    ["missing row", sourceReply({ count: 3 }), "SOURCE_INCOMPLETE"],
    ["empty dataset", sourceReply({ orders: [] }), "SOURCE_INVALID"],
    [
      "unsettled dummy write",
      sourceReply({ active: scenarioId }),
      "DUMMY_OPERATION_PENDING",
    ],
    [
      "foreign Order",
      sourceReply({ orders: [{ ...orders[0], scenarioId: "1" }] }),
      "SOURCE_INVALID",
    ],
    [
      "mismatched Depot",
      sourceReply({ depot: { ...depot, id: "1" } }),
      "SOURCE_INVALID",
    ],
  ])("fails closed for %s before any inserts", async (_name, source, code) => {
    const fixture = connect([
      sessionReply(),
      sessionMode(),
      source,
      sessionReply(),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code,
    });
    expect(fixture.calls.at(-1)?.query).toBe("ROLLBACK");
    expect(fixture.calls).toHaveLength(4);
    expect(fixture.remaining()).toBe(0);
  });

  it("reads frozen content after source edits and keeps identical input canonical", async () => {
    const updatedOrder = { ...orders[0], latitude: orders[0].latitude + 0.1 };
    const fixture = connect([
      sourceReply(),
      ...complete(),
      sourceReply({
        scenario: { ...scenario, customerCount: 11 },
        orders: [updatedOrder],
      }),
      storedReply(),
    ]);
    const initial = await fixture.service.preview(scenarioId);
    const frozen = await fixture.service.freeze(request);
    const changed = await fixture.service.preview(scenarioId);
    const saved = await fixture.service.recover(request);

    expect(initial.canonicalInput).toBe(frozen.canonicalInput);
    expect(changed.inputHash).not.toBe(frozen.inputHash);
    expect(saved).toEqual(frozen);
    expect(saved?.nodes[1].latitude).toBe(orders[0].latitude);
    expect(saved?.configuredCustomerCount).toBe(8);
    expect(fixture.remaining()).toBe(0);
  });

  it.each([
    [
      "shuffled index rows",
      storedReply(header, [points[0], points[2], points[1]]),
    ],
    [
      "swapped Order-to-index mapping",
      storedReply(header, [
        points[0],
        { ...points[2], nodeIndex: 1 },
        { ...points[1], nodeIndex: 2 },
      ]),
    ],
    ["missing point", storedReply(header, points.slice(0, 2))],
    [
      "duplicate index",
      storedReply(header, [
        points[0],
        points[1],
        { ...points[2], nodeIndex: 1 },
      ]),
    ],
    [
      "duplicate source identity",
      storedReply(header, [
        ...points.slice(0, 2),
        { ...points[2], sourceId: points[1].sourceId },
      ]),
    ],
    ["incorrect count", storedReply({ ...header, pointCount: 4 })],
    [
      "missing persisted generator version",
      storedReply({
        ...header,
        scenario: { ...header.scenario, generatorVersion: undefined },
      }),
    ],
    [
      "unknown input version",
      storedReply({
        ...header,
        inputVersion: "benchmark-case-input/v9",
      }),
    ],
    ["hash mismatch", storedReply({ ...header, inputHash: "f".repeat(64) })],
  ])("rejects corrupt readback with %s", async (_name, stored) => {
    const fixture = connect([stored]);
    await expect(fixture.service.recover(request)).rejects.toMatchObject({
      code: "CORRUPT_BENCHMARK_CASE",
    });
    expect(fixture.calls).toHaveLength(1);
    expect(fixture.remaining()).toBe(0);
  });

  it("rolls back if persistence changed a display field outside the input hash", async () => {
    const fixture = connect([
      ...complete().slice(0, 5),
      storedReply(header, [
        { ...points[0], name: "Changed after insert" },
        ...points.slice(1),
      ]),
      sessionReply(),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "CORRUPT_BENCHMARK_CASE",
    });
    expect(fixture.calls.at(-1)?.query).toBe("ROLLBACK");
    expect(fixture.remaining()).toBe(0);
  });

  it("rejects recovery for a different Scenario or expected hash", async () => {
    const fixture = connect([storedReply(), storedReply()]);
    await expect(
      fixture.service.recover({ ...request, scenarioId: "1" }),
    ).rejects.toMatchObject({ code: "FREEZE_REQUEST_CONFLICT", requestId });
    await expect(
      fixture.service.recover({
        ...request,
        expectedInputHash: "f".repeat(64),
      }),
    ).rejects.toMatchObject({ code: "FREEZE_REQUEST_CONFLICT", requestId });
    expect(fixture.remaining()).toBe(0);
  });

  it("stops when the server does not issue a transaction session", async () => {
    const fixture = connect([Response.json({})]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    expect(fixture.calls.map(({ query }) => query)).toEqual(["BEGIN"]);
    expect(fixture.remaining()).toBe(0);
  });

  it("checks the session fixed-string escape mode before writing", async () => {
    const fixture = connect([
      sessionReply(),
      wire({ sql_mode: "VARCHAR" }, [
        ["NO_BACKSLASH_ESCAPES,STRICT_TRANS_TABLES"],
      ]),
      sessionReply(),
    ]);
    await expect(fixture.service.freeze(request)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    expect(fixture.calls.map(({ query }) => query)).toEqual([
      "BEGIN",
      "SELECT @@SESSION.sql_mode AS sql_mode",
      "ROLLBACK",
    ]);
    expect(fixture.remaining()).toBe(0);
  });
});
