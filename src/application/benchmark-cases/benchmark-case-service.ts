import "server-only";
import { isDeepStrictEqual } from "node:util";
import {
  buildBenchmarkInput,
  type BenchmarkInputSnapshot,
} from "@/domain/benchmark-input";
import { depotId } from "@/lib/validation/depot";
import {
  freezeRequest,
  type BenchmarkHistoryPage,
  type BenchmarkHistoryQuery,
} from "@/lib/validation/benchmark-case";

export type BenchmarkCaseSource = Readonly<{
  scenario: Readonly<Record<string, unknown>>;
  depot: Readonly<Record<string, unknown>>;
  orders: readonly Readonly<Record<string, unknown>>[];
}>;

type BenchmarkCaseWriter = {
  readSource(scenarioId: string): Promise<BenchmarkCaseSource>;
  insert(
    requestId: string,
    snapshot: BenchmarkInputSnapshot,
  ): Promise<BenchmarkInputSnapshot>;
};

export type BenchmarkCaseRepository = {
  readSource(scenarioId: string): Promise<BenchmarkCaseSource>;
  findByRequestId(requestId: string): Promise<BenchmarkInputSnapshot | null>;
  findById(id: string): Promise<BenchmarkInputSnapshot | null>;
  list(query: BenchmarkHistoryQuery): Promise<BenchmarkHistoryPage>;
  transact<T>(
    requestId: string,
    work: (writer: BenchmarkCaseWriter) => Promise<T>,
  ): Promise<T>;
};

type Failure =
  | "NOT_FOUND"
  | "SOURCE_INVALID"
  | "SOURCE_INCOMPLETE"
  | "SOURCE_CHANGED"
  | "DUMMY_OPERATION_PENDING"
  | "CORRUPT_BENCHMARK_CASE"
  | "FREEZE_REQUEST_CONFLICT"
  | "UNAVAILABLE"
  | "ROLLBACK_UNKNOWN"
  | "COMMIT_UNKNOWN";

export class BenchmarkCaseError extends Error {
  constructor(
    readonly code: Failure,
    readonly requestId?: string,
  ) {
    super(code);
    this.name = "BenchmarkCaseError";
  }
}

function snapshotSource(
  source: BenchmarkCaseSource,
  scenarioId: string,
  frozenAt?: string,
) {
  if (source.scenario.id !== scenarioId) {
    throw new BenchmarkCaseError("SOURCE_INVALID");
  }
  try {
    return buildBenchmarkInput({ ...source, provenance: { frozenAt } });
  } catch {
    throw new BenchmarkCaseError("SOURCE_INVALID");
  }
}

function assertExpectedInput(
  snapshot: BenchmarkInputSnapshot,
  expectedInputHash: string,
) {
  if (snapshot.inputHash !== expectedInputHash)
    throw new BenchmarkCaseError("SOURCE_CHANGED");
}

export function createBenchmarkCaseService(
  repo: BenchmarkCaseRepository,
  clock = () => new Date(),
) {
  return {
    async detail(rawId: unknown) {
      const snapshot = await repo.findById(depotId.parse(rawId));
      if (!snapshot) throw new BenchmarkCaseError("NOT_FOUND");
      return snapshot;
    },

    list(query: BenchmarkHistoryQuery) {
      return repo.list(query);
    },

    async preview(rawScenarioId: unknown) {
      const scenarioId = depotId.parse(rawScenarioId);
      return snapshotSource(await repo.readSource(scenarioId), scenarioId);
    },

    async freeze(rawRequest: unknown) {
      const { scenarioId, requestId, expectedInputHash } =
        freezeRequest.parse(rawRequest);
      if (await repo.findByRequestId(requestId)) {
        const source = await repo.readSource(scenarioId);
        assertExpectedInput(
          snapshotSource(source, scenarioId),
          expectedInputHash,
        );
        throw new BenchmarkCaseError("FREEZE_REQUEST_CONFLICT", requestId);
      }
      return repo.transact(requestId, async (writer) => {
        const source = await writer.readSource(scenarioId);
        const snapshot = snapshotSource(
          source,
          scenarioId,
          clock().toISOString(),
        );
        assertExpectedInput(snapshot, expectedInputHash);
        const saved = await writer.insert(requestId, snapshot);
        // A second read on the transaction would hide intervening commits.
        // The independent SELECT is the final source observation. Later edits
        // apply to the operational dataset while the captured copy commits.
        const latest = await repo.readSource(scenarioId);
        if (!isDeepStrictEqual(source, latest)) {
          throw new BenchmarkCaseError("SOURCE_CHANGED");
        }
        return saved;
      });
    },

    async recover(rawRequest: unknown) {
      const { scenarioId, requestId, expectedInputHash } =
        freezeRequest.parse(rawRequest);
      const snapshot = await repo.findByRequestId(requestId);
      if (
        snapshot &&
        (snapshot.scenario.id !== scenarioId ||
          snapshot.inputHash !== expectedInputHash)
      )
        throw new BenchmarkCaseError("FREEZE_REQUEST_CONFLICT", requestId);
      // Absence is inconclusive when COMMIT acknowledgement was lost.
      return snapshot;
    },
  };
}
