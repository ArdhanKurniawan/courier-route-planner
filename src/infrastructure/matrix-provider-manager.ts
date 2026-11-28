import "server-only";

import {
  DistanceMatrixError,
  type DistanceMatrixProvider,
} from "@/application/distance-matrices/distance-matrix-service";
import type { MatrixProviderConfig } from "@/config/distance-matrix-osrm";
import { validateDistanceMatrixRequest } from "@/domain/distance-matrix";
import type { createDistanceMatrixQuota } from "@/lib/security/distance-matrix-quota";
import { createOsrmDistanceMatrixProvider, MatrixProviderAttemptError } from "./osrm-distance-matrix";

type Quota = Pick<ReturnType<typeof createDistanceMatrixQuota>, "reserve" | "cooldown">;
const operationBudgetMs = 20_000;

export function createMatrixProviderManager(
  configs: readonly MatrixProviderConfig[],
  quota: Quota,
  fetcher?: typeof fetch,
): DistanceMatrixProvider {
  const candidates = configs.map((config) => ({
    config,
    adapter: createOsrmDistanceMatrixProvider(config, fetcher),
  }));
  return {
    providers: candidates.map(({ config }) => config.id),
    maxPoints: Math.max(0, ...configs.map(({ maxPoints }) => maxPoints)),
    async generate(inputHash, inputNodes, callerSignal, selection) {
      const deadline = performance.now() + operationBudgetMs;
      const timerSignal = AbortSignal.timeout(operationBudgetMs);
      const signal = callerSignal ? AbortSignal.any([callerSignal, timerSignal]) : timerSignal;
      function assertWithinBudget() {
        if (callerSignal?.aborted)
          throw new DistanceMatrixError("PROVIDER_UNAVAILABLE");
        if (timerSignal.aborted || performance.now() >= deadline)
          throw new DistanceMatrixError("PROVIDER_TIMEOUT");
      }

      let nodes;
      try {
        nodes = validateDistanceMatrixRequest(inputHash, inputNodes);
      } catch {
        throw new DistanceMatrixError("INVALID_MATRIX");
      }
      const selected = selection?.mode === "research"
        ? candidates.filter(({ config }) => config.id === selection.provider)
        : candidates;
      if (!selected.length)
        throw new DistanceMatrixError("PROVIDER_UNAVAILABLE");
      const eligible = selected.filter(({ config }) => nodes.length <= config.maxPoints);
      if (!eligible.length)
        throw new DistanceMatrixError("POINT_LIMIT");

      let failure = new DistanceMatrixError("PROVIDER_CAPACITY");
      for (const { config, adapter } of eligible) {
        assertWithinBudget();
        // Reservations are retained even if transport aborts or the outcome is
        // unknown. The provider may have received the request.
        const reservation = await quota.reserve(config.id, config.quota, nodes.length ** 2);
        assertWithinBudget();
        if (reservation === "unavailable")
          throw new DistanceMatrixError("QUOTA_UNAVAILABLE");
        if (reservation === "limited") continue;
        try {
          const snapshot = await adapter.generate(inputHash, nodes, signal);
          assertWithinBudget();
          return snapshot;
        } catch (error) {
          if (!(error instanceof MatrixProviderAttemptError)) {
            assertWithinBudget();
            throw error;
          }
          const recorded = await quota.cooldown(config.id, error.cooldownMs);
          assertWithinBudget();
          if (!recorded) throw new DistanceMatrixError("QUOTA_UNAVAILABLE");
          // A lock persists throughout this operation, even if its provider
          // has only a transient failure.
          if (selection?.mode === "research" || !error.fallback) throw error;
          failure = error;
        }
      }
      throw failure;
    },
  };
}
