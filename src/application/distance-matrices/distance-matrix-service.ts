import "server-only";

import { isDeepStrictEqual } from "node:util";
import type { BenchmarkInputSnapshot } from "@/domain/benchmark-input";
import type {
  DistanceMatrixNode,
  DistanceMatrixSnapshot,
} from "@/domain/distance-matrix";
import type {
  DistanceMatrixPage,
  DistanceMatrixQuery,
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
  maxPoints: number;
  generate(
    inputHash: string,
    nodes: readonly DistanceMatrixNode[],
    signal?: AbortSignal,
  ): Promise<DistanceMatrixSnapshot>;
};

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
) {
  async function loadCase(caseId: string) {
    const snapshot = await findBenchmarkCase(caseId);
    if (!snapshot) throw new DistanceMatrixError("NOT_FOUND");
    if (snapshot.provenance.benchmarkCaseId !== caseId)
      throw new DistanceMatrixError("CORRUPT_MATRIX");
    return snapshot;
  }

  const generationAvailable = provider !== null;
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
      return { ...history, generationAvailable };
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
    ) {
      const benchmarkCase = await loadCase(caseId);
      if (benchmarkCase.inputHash !== expectedInputHash)
        throw new DistanceMatrixError("SOURCE_CHANGED");
      const existing = await repository.findByRequestId(caseId, requestId);
      if (existing) {
        if (existing.requestId !== requestId)
          throw new DistanceMatrixError("CORRUPT_MATRIX");
        return verifyMatrix(existing, caseId, benchmarkCase);
      }
      if (!provider) throw new DistanceMatrixError("GENERATION_DISABLED");
      const nodes = frozenNodes(benchmarkCase);
      if (nodes.length > provider.maxPoints)
        throw new DistanceMatrixError("POINT_LIMIT");
      const snapshot = await provider.generate(
        benchmarkCase.inputHash,
        nodes,
        signal,
      );
      if (
        snapshot.inputHash !== benchmarkCase.inputHash ||
        !isDeepStrictEqual(snapshot.nodeOrder, nodes)
      )
        throw new DistanceMatrixError("CORRUPT_MATRIX");
      if (signal?.aborted)
        throw new DistanceMatrixError("PROVIDER_UNAVAILABLE");
      const stored = await repository.append({
        benchmarkCaseId: caseId,
        requestId,
        snapshot,
      });
      if (stored.requestId !== requestId)
        throw new DistanceMatrixError("STORE_UNKNOWN");
      return verifyMatrix(stored, caseId, benchmarkCase);
    },
  };
}
