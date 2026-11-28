import "server-only";

import { isDeepStrictEqual } from "node:util";
import type { BenchmarkInputSnapshot } from "@/domain/benchmark-input";
import type {
  DistanceMatrixNode,
  DistanceMatrixSnapshot,
  MatrixProviderId,
} from "@/domain/distance-matrix";
import type {
  DistanceMatrixPage,
  DistanceMatrixQuery,
  MatrixProviderSelection,
  StoredDistanceMatrix,
} from "@/lib/validation/distance-matrix";

export type DistanceMatrixFailure =
  | "NOT_FOUND"
  | "SOURCE_CHANGED"
  | "GENERATION_DISABLED"
  | "POINT_LIMIT"
  | "SNAP_INVALID"
  | "UNREACHABLE"
  | "INVALID_MATRIX"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNSUPPORTED"
  | "PROVIDER_AUTH"
  | "PROVIDER_CONFIGURATION"
  | "PROVIDER_CAPACITY"
  | "PROVIDER_LOCK_MISMATCH"
  | "QUOTA_UNAVAILABLE"
  | "CORRUPT_MATRIX"
  | "STORE_UNKNOWN"
  | "UNAVAILABLE";

export class DistanceMatrixError extends Error {
  constructor(readonly code: DistanceMatrixFailure) {
    super(code);
    this.name = "DistanceMatrixError";
  }
}

type StoreInput = {
  benchmarkCaseId: string;
  requestId: string;
  snapshot: DistanceMatrixSnapshot;
};
export type DistanceMatrixRepository = {
  findById(
    benchmarkCaseId: string,
    id: string,
  ): Promise<StoredDistanceMatrix | null>;
  findByRequestId(
    benchmarkCaseId: string,
    requestId: string,
  ): Promise<StoredDistanceMatrix | null>;
  list(
    benchmarkCaseId: string,
    query: DistanceMatrixQuery,
  ): Promise<DistanceMatrixPage>;
  append(input: StoreInput): Promise<StoredDistanceMatrix>;
};

export type DistanceMatrixProvider = {
  providers?: readonly MatrixProviderId[];
  maxPoints: number;
  generate(
    inputHash: string,
    nodes: readonly DistanceMatrixNode[],
    signal?: AbortSignal,
    selection?: MatrixProviderSelection,
  ): Promise<DistanceMatrixSnapshot>;
};

type RequestBinder = {
  bindSelection(
    caseId: string,
    requestId: string,
    selection: MatrixProviderSelection,
  ): Promise<"allowed" | "conflict" | "unavailable">;
};

function assertProviderLock(snapshot: DistanceMatrixSnapshot, selection?: MatrixProviderSelection) {
  const { generationMode, actualProvider } = snapshot.provenance;
  if (
    (generationMode && generationMode !== (selection?.mode ?? "operational")) ||
    (selection?.mode === "research" && actualProvider !== selection.provider)
  )
    throw new DistanceMatrixError("PROVIDER_LOCK_MISMATCH");
}

function frozenNodes(benchmarkCase: BenchmarkInputSnapshot) {
  return benchmarkCase.nodes.map(
    ({ index, kind, id, latitude, longitude }) => ({
      index,
      kind,
      id,
      latitude,
      longitude,
    }),
  );
}

function verifyMatrix(
  matrix: StoredDistanceMatrix,
  caseId: string,
  benchmarkCase: BenchmarkInputSnapshot,
) {
  if (
    matrix.benchmarkCaseId !== caseId ||
    matrix.inputHash !== benchmarkCase.inputHash ||
    !isDeepStrictEqual(matrix.nodeOrder, frozenNodes(benchmarkCase))
  )
    throw new DistanceMatrixError("CORRUPT_MATRIX");
  return matrix;
}

export function createDistanceMatrixService(
  findBenchmarkCase: (id: string) => Promise<BenchmarkInputSnapshot | null>,
  repository: DistanceMatrixRepository,
  provider: DistanceMatrixProvider | null,
  requestBinder: RequestBinder | null,
) {
  async function loadCase(caseId: string) {
    const snapshot = await findBenchmarkCase(caseId);
    if (!snapshot) throw new DistanceMatrixError("NOT_FOUND");
    if (snapshot.provenance.benchmarkCaseId !== caseId)
      throw new DistanceMatrixError("CORRUPT_MATRIX");
    return snapshot;
  }

  const generationAvailable = provider !== null && requestBinder !== null;
  return {
    generationAvailable,
    async list(caseId: string, query: DistanceMatrixQuery) {
      const benchmarkCase = await loadCase(caseId);
      const history = await repository.list(caseId, query);
      if (
        history.data.some(
          (matrix) =>
            matrix.benchmarkCaseId !== caseId ||
            matrix.inputHash !== benchmarkCase.inputHash ||
            matrix.pointCount !== benchmarkCase.pointCount,
        )
      )
        throw new DistanceMatrixError("CORRUPT_MATRIX");
      return {
        ...history,
        generationAvailable,
        ...(provider?.providers ? { generationProviders: provider.providers } : {}),
      };
    },
    async detail(caseId: string, id: string) {
      const benchmarkCase = await loadCase(caseId);
      const matrix = await repository.findById(caseId, id);
      if (!matrix) throw new DistanceMatrixError("NOT_FOUND");
      if (matrix.id !== id) throw new DistanceMatrixError("CORRUPT_MATRIX");
      return verifyMatrix(matrix, caseId, benchmarkCase);
    },
    async recover(caseId: string, requestId: string) {
      const benchmarkCase = await loadCase(caseId);
      const matrix = await repository.findByRequestId(caseId, requestId);
      if (matrix && matrix.requestId !== requestId)
        throw new DistanceMatrixError("CORRUPT_MATRIX");
      return matrix && verifyMatrix(matrix, caseId, benchmarkCase);
    },
    async generate(
      caseId: string,
      requestId: string,
      expectedInputHash: string,
      signal?: AbortSignal,
      selection?: MatrixProviderSelection,
    ) {
      const benchmarkCase = await loadCase(caseId);
      if (benchmarkCase.inputHash !== expectedInputHash)
        throw new DistanceMatrixError("SOURCE_CHANGED");
      const existing = await repository.findByRequestId(caseId, requestId);
      if (existing) {
        if (existing.requestId !== requestId)
          throw new DistanceMatrixError("CORRUPT_MATRIX");
        assertProviderLock(existing, selection);
        return verifyMatrix(existing, caseId, benchmarkCase);
      }
      if (!provider || !requestBinder)
        throw new DistanceMatrixError("GENERATION_DISABLED");
      const nodes = frozenNodes(benchmarkCase);
      if (nodes.length > provider.maxPoints)
        throw new DistanceMatrixError("POINT_LIMIT");
      if (signal?.aborted)
        throw new DistanceMatrixError("PROVIDER_UNAVAILABLE");
      const requestSelection = selection ?? { mode: "operational" };
      const binding = await requestBinder.bindSelection(caseId, requestId, requestSelection);
      if (binding === "conflict")
        throw new DistanceMatrixError("PROVIDER_LOCK_MISMATCH");
      if (binding !== "allowed")
        throw new DistanceMatrixError("QUOTA_UNAVAILABLE");
      const snapshot = await provider.generate(
        benchmarkCase.inputHash,
        nodes,
        signal,
        ...(selection ? [selection] : []),
      );
      if (
        snapshot.inputHash !== benchmarkCase.inputHash ||
        !isDeepStrictEqual(snapshot.nodeOrder, nodes)
      )
        throw new DistanceMatrixError("CORRUPT_MATRIX");
      assertProviderLock(snapshot, selection);
      if (signal?.aborted)
        throw new DistanceMatrixError("PROVIDER_UNAVAILABLE");
      const stored = await repository.append({
        benchmarkCaseId: caseId,
        requestId,
        snapshot: {
          ...snapshot,
          provenance: {
            ...snapshot.provenance,
            ...(snapshot.provenance.actualProvider
              ? { generationMode: requestSelection.mode }
              : {}),
          },
        },
      });
      if (stored.requestId !== requestId)
        throw new DistanceMatrixError("STORE_UNKNOWN");
      assertProviderLock(stored, selection);
      return verifyMatrix(stored, caseId, benchmarkCase);
    },
  };
}
