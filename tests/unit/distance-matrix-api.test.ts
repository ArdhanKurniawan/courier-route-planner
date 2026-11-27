// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET,
  POST,
} from "@/app/api/benchmark-cases/[id]/distance-matrices/route";
import { GET as detail } from "@/app/api/benchmark-cases/[id]/distance-matrices/[matrixId]/route";
import { DistanceMatrixError } from "@/application/distance-matrices/distance-matrix-service";
import { buildBenchmarkInput } from "@/domain/benchmark-input";
import { buildDistanceMatrixSnapshot } from "@/domain/distance-matrix";
import { HttpError } from "@/lib/http/request-security";
import type {
  DistanceMatrixRepository,
  DistanceMatrixProvider,
} from "@/application/distance-matrices/distance-matrix-service";
import type { StoredDistanceMatrix } from "@/lib/validation/distance-matrix";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  config: vi.fn(),
  findCase: vi.fn(),
  generate: vi.fn<DistanceMatrixProvider["generate"]>(),
  append: vi.fn<DistanceMatrixRepository["append"]>(),
  findById: vi.fn<DistanceMatrixRepository["findById"]>(),
  findByRequestId: vi.fn<DistanceMatrixRepository["findByRequestId"]>(),
  list: vi.fn<DistanceMatrixRepository["list"]>(),
}));
vi.mock("@/lib/security/admin", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/config/distance-matrix-osrm", () => ({
  getMatrixOsrmConfig: mocks.config,
}));
vi.mock("@/db/repositories/benchmark-case-repository", () => ({
  createBenchmarkCaseRepository: () => ({ findById: mocks.findCase }),
}));
vi.mock("@/db/repositories/distance-matrix-repository", () => ({
  createDistanceMatrixRepository: () => mocks,
}));
vi.mock("@/infrastructure/osrm-distance-matrix", () => ({
  createOsrmDistanceMatrixProvider: () => ({
    maxPoints: 51,
    generate: mocks.generate,
  }),
}));

const caseId = "9007199254740995";
const matrixId = "9007199254740997";
const requestId = "dcdfdb87-e66a-4a7b-9eeb-49eba5a61c00";
const newRequestId = "accfdb87-e66a-4a7b-9eeb-49eba5a61c00";
const origin = "https://app.example.invalid";
const endpoint = "/api/benchmark-cases/" + caseId + "/distance-matrices";
const caseContext = { params: Promise.resolve({ id: caseId }) };
const matrixContext = { params: Promise.resolve({ id: caseId, matrixId }) };
const benchmark = buildBenchmarkInput({
  scenario: {
    id: "4001",
    depotId: "5001",
    name: "Archived benchmark",
    distributionPattern: "random",
    customerCount: 1,
    radiusMinM: null,
    radiusMaxM: null,
    generationSeed: null,
    status: "draft",
  },
  depot: {
    id: "5001",
    name: "Frozen Depot",
    address: null,
    latitude: -6,
    longitude: 110,
    isActive: true,
  },
  orders: [
    {
      id: "7001",
      scenarioId: "4001",
      orderCode: "FOR-TEST",
      customerName: "Synthetic Order",
      address: null,
      latitude: -7,
      longitude: 111,
      source: "manual",
    },
  ],
  provenance: { benchmarkCaseId: caseId },
});
const nodes = benchmark.nodes.map(
  ({ index, kind, id, latitude, longitude }) => ({
    index,
    kind,
    id,
    latitude,
    longitude,
  }),
);
const point = (index: number) => ({
  longitude: nodes[index].longitude,
  latitude: nodes[index].latitude,
  distanceM: 0,
});
const snapshot = buildDistanceMatrixSnapshot({
  version: "distance-matrix/v1",
  provider: "osrm",
  profile: "driving",
  endpoint: "https://dedicated.example.invalid/",
  options: { annotations: "distance", generateHints: false, snapRadiusM: 20 },
  unit: "meter",
  directed: true,
  inputHash: benchmark.inputHash,
  nodeOrder: nodes,
  matrix: [
    [0, 7],
    [9, 0],
  ],
  snapping: [0, 1].map((index) => ({
    source: point(index),
    destination: point(index),
  })),
  provenance: {
    generatedAt: "2026-11-25T13:00:00.000Z",
    apiVersion: "v1",
    dataVersion: null,
    softwareVersion: null,
    networkExtract: null,
    codeRevision: null,
  },
});

function get(suffix = "") {
  return new Request(origin + endpoint + suffix);
}
function post(
  body: unknown = { requestId, expectedInputHash: benchmark.inputHash },
  extra = {},
) {
  return new Request(origin + endpoint, {
    method: "POST",
    headers: {
      Origin: origin,
      Host: "app.example.invalid",
      "Content-Type": "application/json",
      ...extra,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  const matrices = new Map<string, StoredDistanceMatrix>();
  mocks.auth.mockResolvedValue({ origin });
  mocks.config.mockReturnValue({});
  mocks.findCase.mockResolvedValue(benchmark);
  mocks.findById.mockImplementation(
    async (caseId, id) =>
      [...matrices.values()].find(
        (row) => row.id === id && row.benchmarkCaseId === caseId,
      ) ?? null,
  );
  mocks.findByRequestId.mockImplementation(
    async (caseId, requestId) => matrices.get(caseId + requestId) ?? null,
  );
  mocks.append.mockImplementation(
    async ({ benchmarkCaseId, requestId, snapshot }) => {
      const id = String(BigInt(matrixId) + BigInt(matrices.size));
      const stored = { ...snapshot, id, benchmarkCaseId, requestId };
      matrices.set(benchmarkCaseId + requestId, stored);
      return stored;
    },
  );
  mocks.generate.mockResolvedValue(snapshot);
  mocks.list.mockImplementation(async () => ({
    data: [...matrices.values()].map((matrix) => ({
      id: matrix.id,
      benchmarkCaseId: matrix.benchmarkCaseId,
      provider: matrix.provider,
      profile: matrix.profile,
      pointCount: matrix.nodeOrder.length,
      inputHash: matrix.inputHash,
      matrixHash: matrix.matrixHash,
      generatedAt: matrix.provenance.generatedAt,
      zeroPairCount: matrix.zeroPairs.length,
    })),
    nextCursor: null,
  }));
});

describe("Distance Matrix admin API", () => {
  it.each([401, 403])(
    "enforces admin access on all entry points (%s)",
    async (status) => {
      mocks.auth.mockRejectedValue(
        new HttpError(status, "DENIED", "Access denied."),
      );
      const answers = await Promise.all([
        GET(get(), caseContext),
        POST(post(), caseContext),
        detail(get("/" + matrixId), matrixContext),
        GET(get("?requestId=" + requestId), caseContext),
      ]);
      expect(answers.map((response) => response.status)).toEqual([
        status,
        status,
        status,
        status,
      ]);
      expect(mocks.findCase).not.toHaveBeenCalled();
      expect(mocks.generate).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["Origin", "https://other.invalid"],
    ["Host", "another.invalid"],
    ["Sec-Fetch-Site", "cross-site"],
  ])("prevents mutation with invalid %s", async (header, value) => {
    expect(
      (await POST(post(undefined, { [header]: value }), caseContext)).status,
    ).toBe(403);
    expect(mocks.findCase).not.toHaveBeenCalled();
  });

  it("uses one archived input for generation, immutable regeneration and read-only replay", async () => {
    const first = await POST(post(), caseContext);
    expect(first.status).toBe(201);
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    const { data: created } = await first.json();
    expect(created).toMatchObject({
      id: matrixId,
      benchmarkCaseId: caseId,
      matrixHash: snapshot.matrixHash,
    });
    expect(mocks.generate).toHaveBeenCalledWith(
      benchmark.inputHash,
      nodes,
      expect.any(AbortSignal),
    );
    expect(await (await POST(post(), caseContext)).json()).toEqual({
      data: created,
    });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    const regeneration = await POST(
      post({ requestId: newRequestId, expectedInputHash: benchmark.inputHash }),
      caseContext,
    );
    const { data: replacement } = await regeneration.json();
    expect(replacement.id).not.toBe(created.id);
    expect(replacement.matrixHash).toBe(created.matrixHash);
    mocks.config.mockReturnValue(null);
    const list = await GET(get("?limit=2"), caseContext);
    expect(await list.json()).toMatchObject({
      data: [{ id: created.id }, { id: replacement.id }],
      generationAvailable: false,
    });
    expect(
      await (await detail(get("/" + matrixId), matrixContext)).json(),
    ).toEqual({ data: created });
    expect(
      await (await GET(get("?requestId=" + requestId), caseContext)).json(),
    ).toEqual({ data: created });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.append).toHaveBeenCalledTimes(2);
  });

  it("does not call the provider with a stale hash, disabled config or invalid query", async () => {
    expect(
      (
        await POST(
          post({ requestId, expectedInputHash: "a".repeat(64) }),
          caseContext,
        )
      ).status,
    ).toBe(409);
    mocks.config.mockReturnValue(null);
    expect((await POST(post(), caseContext)).status).toBe(503);
    expect(
      (await GET(get("?requestId=" + requestId + "&limit=3"), caseContext))
        .status,
    ).toBe(400);
    const unknown = await GET(get("?requestId=" + requestId), caseContext);
    expect(await unknown.json()).toEqual({ data: null });
    expect(unknown.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.append).not.toHaveBeenCalled();
  });

  it("rejects an unreachable response before append and reports uncertainty without retry", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      mocks.generate.mockRejectedValueOnce(
        new DistanceMatrixError("UNREACHABLE"),
      );
      const rejected = await POST(post(), caseContext);
      expect(rejected.status).toBe(422);
      expect(await rejected.json()).toMatchObject({
        error: { code: "UNREACHABLE" },
      });
      expect(mocks.append).not.toHaveBeenCalled();
      mocks.append.mockRejectedValueOnce(
        new DistanceMatrixError("STORE_UNKNOWN"),
      );
      const uncertain = await POST(post(), caseContext);
      expect(uncertain.status).toBe(503);
      expect(await uncertain.json()).toMatchObject({
        error: { code: "STORE_UNKNOWN" },
      });
      expect(mocks.append).toHaveBeenCalledTimes(1);
      expect(mocks.generate).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  it("rejects a stored matrix whose archived nodes no longer match", async () => {
    mocks.findById.mockResolvedValue({
      ...snapshot,
      nodeOrder: [...nodes].reverse(),
      benchmarkCaseId: caseId,
      requestId,
      id: matrixId,
    });
    const response = await detail(get("/" + matrixId), matrixContext);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "CORRUPT_MATRIX" },
    });
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
