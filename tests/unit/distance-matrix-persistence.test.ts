// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { createDistanceMatrixRepository } from "@/db/repositories/distance-matrix-repository";
import { buildDistanceMatrixSnapshot } from "@/domain/distance-matrix";
import { fakeDatabaseUrl, type DatabaseFetch } from "../fixtures/tidb-http";

const benchmarkCaseId = "9007199254740993";
const id = "9007199254740997";
const requestId = "dcdfdb87-e66a-4a7b-9eeb-49eba5a61c00";
const generatedAt = "2026-01-02T13:14:15.123Z";
const generatedAtSql = "2026-01-02 13:14:15.123";
const inputHash = "a".repeat(64);
const nodeOrder = [
  {
    index: 0,
    kind: "depot",
    id: "9007199254740995",
    latitude: -6.123456789012345,
    longitude: 110.34567890123456,
  },
  {
    index: 1,
    kind: "order",
    id: "9007199254740996",
    latitude: -7.3210987654321,
    longitude: 111.234567890123,
  },
];

function buildSnapshot({
  timestamp = generatedAt,
  returnDistance = 34.5,
  sourceHash = inputHash,
} = {}) {
  return buildDistanceMatrixSnapshot({
    version: "distance-matrix/v1",
    provider: "osrm",
    profile: "driving",
    endpoint: "https://osrm.example.test/",
    options: {
      annotations: "distance",
      generateHints: false,
      snapRadiusM: 250,
    },
    unit: "meter",
    directed: true,
    inputHash: sourceHash,
    nodeOrder,
    matrix: [
      [0, 12.345678901234567],
      [returnDistance, 0],
    ],
    snapping: nodeOrder.map(({ latitude, longitude }) => {
      const point = { latitude, longitude, distanceM: 1 };
      return { source: point, destination: point };
    }),
    provenance: {
      generatedAt: timestamp,
      apiVersion: "v1",
      dataVersion: "Synthetic ' extract",
      softwareVersion: null,
      networkExtract: null,
      codeRevision: null,
    },
  });
}

function wire(
  field: "snapshot" | "summary",
  values: (object | string | null)[],
) {
  return {
    types: [{ name: field, type: "VARCHAR" }],
    rows: values.map((value) => [
      typeof value === "string" || value === null
        ? value
        : JSON.stringify(value),
    ]),
  };
}

function summary(matrixHash: string, rowId = id) {
  return {
    id: rowId,
    benchmarkCaseId,
    provider: "osrm",
    profile: "driving",
    pointCount: 2,
    inputHash,
    matrixHash,
    generatedAt: generatedAtSql,
    zeroPairCount: 0,
  };
}

function storedRow(snapshot: ReturnType<typeof buildSnapshot>) {
  return {
    ...snapshot,
    ...summary(snapshot.matrixHash),
    inputHash: snapshot.inputHash,
    zeroPairCount: snapshot.zeroPairs.length,
    directed: 1,
    requestId,
  };
}

function connect(replies: (object | Error)[]) {
  const requests: { query: string; session: string | null }[] = [];
  const transport = vi.fn<DatabaseFetch>(async (_url, init) => {
    const { query } = JSON.parse(init!.body);
    requests.push({
      query,
      session: new Headers(init!.headers).get("TiDB-Session"),
    });
    const reply = replies.shift();
    if (!reply) throw new Error("Unexpected SQL in offline fixture");
    if (reply instanceof Error) throw reply;
    if (reply instanceof Response) return reply;
    return Response.json(reply, {
      headers: { "TiDB-Session": "fixture-session" },
    });
  });
  const repository = createDistanceMatrixRepository(() =>
    createDatabase(fakeDatabaseUrl, transport),
  );
  return { repository, requests };
}

describe("Distance Matrix persistence over the TiDB HTTP adapter", () => {
  it("uses a scoped sentinel for missing detail, request, and history reads", async () => {
    const { repository, requests } = connect([
      wire("snapshot", [null]),
      wire("snapshot", [null]),
      wire("summary", [null]),
    ]);

    await expect(repository.findById(benchmarkCaseId, id)).resolves.toBeNull();
    await expect(
      repository.findByRequestId(benchmarkCaseId, requestId),
    ).resolves.toBeNull();
    await expect(
      repository.list(benchmarkCaseId, { limit: 20 }),
    ).resolves.toEqual({
      data: [],
      nextCursor: null,
    });
    expect(requests).toHaveLength(3);
    for (const { query } of requests) {
      expect(query).toContain(benchmarkCaseId);
      expect(query).toMatch(/LEFT JOIN/i);
    }
    expect(requests[0].query).toContain(id);
    expect(requests[1].query).toContain(requestId);
  });

  it("appends the complete snapshot in one atomic INSERT and preserves BIGINT IDs", async () => {
    const snapshot = buildSnapshot();
    const { repository, requests } = connect([
      { rowsAffected: 1, sLastInsertID: id },
      wire("snapshot", [storedRow(snapshot)]),
    ]);

    const saved = await repository.append({
      benchmarkCaseId,
      requestId,
      snapshot,
    });
    expect(saved).toEqual({ ...snapshot, benchmarkCaseId, requestId, id });
    expect(requests).toHaveLength(2);
    expect(requests[1].query).toMatch(/^\s*select/i);
    expect(requests[1].query).toContain(requestId);
    const query = requests[0].query;
    expect(query).toMatch(/^insert into `distance_matrices`/i);
    expect(query).toContain(benchmarkCaseId);
    expect(query).toContain(requestId);
    expect(query).toContain(generatedAtSql);
    expect(query).toContain("`distance_matrix_json`");
    expect(query).toContain("`snapping_json`");
    expect(query).toContain(
      Buffer.from(JSON.stringify(snapshot.matrix)).toString("hex"),
    );
    expect(query).toContain(
      Buffer.from(JSON.stringify(snapshot.provenance)).toString("hex"),
    );
  });

  it("rejects a different stored matrix after an acknowledged INSERT", async () => {
    const snapshot = buildSnapshot();
    const different = buildSnapshot({ returnDistance: 35.5 });
    const { repository, requests } = connect([
      { rowsAffected: 1, sLastInsertID: id },
      wire("snapshot", [storedRow(different)]),
    ]);

    await expect(
      repository.append({ benchmarkCaseId, requestId, snapshot }),
    ).rejects.toMatchObject({ code: "CORRUPT_MATRIX" });
    expect(requests).toHaveLength(2);
  });

  it("rejects a stored row whose ID differs from the acknowledged INSERT", async () => {
    const snapshot = buildSnapshot();
    const { repository } = connect([
      { rowsAffected: 1, sLastInsertID: id },
      wire("snapshot", [{ ...storedRow(snapshot), id: "9007199254740998" }]),
    ]);

    await expect(
      repository.append({ benchmarkCaseId, requestId, snapshot }),
    ).rejects.toMatchObject({ code: "CORRUPT_MATRIX" });
  });

  it("reports an unknown outcome when readback fails after an acknowledged INSERT", async () => {
    const snapshot = buildSnapshot();
    const { repository, requests } = connect([
      { rowsAffected: 1, sLastInsertID: id },
      new Error("Synthetic readback interruption"),
    ]);

    await expect(
      repository.append({ benchmarkCaseId, requestId, snapshot }),
    ).rejects.toMatchObject({ code: "STORE_UNKNOWN" });
    expect(requests).toHaveLength(2);
  });

  it("resolves an invalid INSERT acknowledgement from one independent scoped read", async () => {
    const snapshot = buildSnapshot();
    const winner = buildSnapshot({
      timestamp: "2026-01-02T13:14:16.124Z",
      returnDistance: 35.5,
    });
    const { repository, requests } = connect([
      { rowsAffected: 1, sLastInsertID: Number(id) },
      wire("snapshot", [
        {
          ...storedRow(winner),
          generatedAt: "2026-01-02 13:14:16.124",
        },
      ]),
    ]);

    await expect(
      repository.append({ benchmarkCaseId, requestId, snapshot }),
    ).resolves.toEqual({ ...winner, benchmarkCaseId, requestId, id });
    expect(requests).toHaveLength(2);
    expect(requests[1].query).toMatch(/^\s*select/i);
    expect(requests[1].query).toContain(requestId);
    expect(requests[1].query).toContain(benchmarkCaseId);
    expect(requests[1].session).toBe("");
  });

  it("reports an unknown write outcome after one unsuccessful lookup", async () => {
    const snapshot = buildSnapshot();
    const { repository, requests } = connect([
      new Error("Synthetic transport interruption"),
      wire("snapshot", [null]),
    ]);

    await expect(
      repository.append({ benchmarkCaseId, requestId, snapshot }),
    ).rejects.toMatchObject({ code: "STORE_UNKNOWN" });
    expect(requests).toHaveLength(2);
    expect(
      requests.filter(({ query }) => /^insert\b/i.test(query)),
    ).toHaveLength(1);
  });

  it("does not replay a row for a different frozen input hash", async () => {
    const snapshot = buildSnapshot();
    const other = buildSnapshot({ sourceHash: "b".repeat(64) });
    const { repository, requests } = connect([
      new Error("Synthetic transport interruption"),
      wire("snapshot", [storedRow(other)]),
    ]);

    await expect(
      repository.append({ benchmarkCaseId, requestId, snapshot }),
    ).rejects.toMatchObject({ code: "STORE_UNKNOWN" });
    expect(requests).toHaveLength(2);
  });

  it("retains the zero-pair evidence in an ineligible stored matrix", async () => {
    const snapshot = buildSnapshot({ returnDistance: 0 });
    const { repository } = connect([wire("snapshot", [storedRow(snapshot)])]);

    await expect(
      repository.findById(benchmarkCaseId, id),
    ).resolves.toMatchObject({
      matrix: [
        [0, 12.345678901234567],
        [0, 0],
      ],
      zeroPairs: [{ from: 1, to: 0 }],
      comparisonEligible: false,
    });
  });

  it.each([
    [
      "hash mismatch",
      {
        matrix: [
          [0, 12.345678901234567],
          [34.6, 0],
        ],
      },
    ],
    ["wrong scope", { benchmarkCaseId: "9007199254740994" }],
    ["timestamp mismatch", { generatedAt: "2026-01-02 13:14:15.124" }],
    ["zero pair count mismatch", { zeroPairCount: 1 }],
  ])("rejects a stored %s as corrupt", async (_reason, changes) => {
    const snapshot = buildSnapshot();
    const { repository } = connect([
      wire("snapshot", [{ ...storedRow(snapshot), ...changes }]),
    ]);

    await expect(
      repository.findById(benchmarkCaseId, id),
    ).rejects.toMatchObject({
      code: "CORRUPT_MATRIX",
    });
  });

  it("sanitizes read transport failures", async () => {
    const { repository } = connect([new Error("Synthetic private detail")]);
    await expect(
      repository.findById(benchmarkCaseId, id),
    ).rejects.toMatchObject({
      code: "UNAVAILABLE",
      message: expect.not.stringContaining("Synthetic private detail"),
    });
  });

  it("paginates scoped summary rows by descending exact IDs", async () => {
    const matrixHash = "b".repeat(64);
    const olderId = "9007199254740996";
    const { repository, requests } = connect([
      wire("summary", [summary(matrixHash), summary(matrixHash, olderId)]),
      wire("summary", [summary(matrixHash, olderId)]),
    ]);

    const firstPage = await repository.list(benchmarkCaseId, { limit: 1 });
    expect(firstPage).toEqual({
      data: [{ ...summary(matrixHash), generatedAt }],
      nextCursor: id,
    });
    await expect(
      repository.list(benchmarkCaseId, { limit: 1, after: id }),
    ).resolves.toEqual({
      data: [{ ...summary(matrixHash, olderId), generatedAt }],
      nextCursor: null,
    });
    expect(requests[1].query).toMatch(/\bid`?\s*<\s*9007199254740997/u);
    expect(requests[1].query).toMatch(/ORDER BY [\w.`]+ DESC\s+LIMIT 2/iu);
  });
});
