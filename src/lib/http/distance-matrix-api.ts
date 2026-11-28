import {
  createDistanceMatrixService,
  DistanceMatrixError,
  type DistanceMatrixFailure,
} from "@/application/distance-matrices/distance-matrix-service";
import { parseAuthConfig } from "@/config/auth";
import { getMatrixProviderConfigs } from "@/config/distance-matrix-osrm";
import { createBenchmarkCaseRepository } from "@/db/repositories/benchmark-case-repository";
import { createDistanceMatrixRepository } from "@/db/repositories/distance-matrix-repository";
import { createMatrixProviderManager } from "@/infrastructure/matrix-provider-manager";
import { createDistanceMatrixQuota } from "@/lib/security/distance-matrix-quota";
import { runBenchmarkRequest } from "./benchmark-case-api";
import { HttpError } from "./request-security";

export function distanceMatrixService() {
  const configs = getMatrixProviderConfigs();
  const auth = configs.length > 0 ? parseAuthConfig(process.env) : null;
  const quota = auth
    ? createDistanceMatrixQuota({ url: auth.redisUrl, token: auth.redisToken })
    : null;
  return createDistanceMatrixService(
    createBenchmarkCaseRepository().findById,
    createDistanceMatrixRepository(),
    quota ? createMatrixProviderManager(configs, quota) : null,
    quota,
  );
}

const failures: Record<DistanceMatrixFailure, readonly [number, string]> = {
  NOT_FOUND: [404, "Benchmark Case or Distance Matrix not found."],
  SOURCE_CHANGED: [409, "Benchmark Case input hash does not match."],
  GENERATION_DISABLED: [503, "Distance Matrix generation is not configured."],
  POINT_LIMIT: [422, "The OSRM provider's point limit was exceeded."],
  SNAP_INVALID: [422, "At least one point lacks valid road snapping evidence."],
  UNREACHABLE: [422, "At least one directed pair is unreachable."],
  INVALID_MATRIX: [502, "OSRM did not provide a valid distance matrix."],
  PROVIDER_UNAVAILABLE: [502, "OSRM Table Service unavailable."],
  PROVIDER_TIMEOUT: [504, "OSRM Table Service timed out."],
  PROVIDER_UNSUPPORTED: [502, "OSRM does not support distance annotations."],
  PROVIDER_AUTH: [503, "OSRM provider rejected the configured account or region."],
  PROVIDER_CONFIGURATION: [503, "OSRM provider endpoint or service configuration is invalid."],
  PROVIDER_CAPACITY: [429, "Eligible OSRM providers are at capacity or cooling down."],
  PROVIDER_LOCK_MISMATCH: [409, "This request is bound to a different generation mode or OSRM provider."],
  QUOTA_UNAVAILABLE: [503, "Shared OSRM quota could not be verified."],
  CORRUPT_MATRIX: [503, "Stored Distance Matrix could not be verified."],
  STORE_UNKNOWN: [503, "Storage outcome unknown. Use read-only recovery."],
  UNAVAILABLE: [503, "Distance Matrix storage unavailable."],
};

export function runDistanceMatrixRequest(operation: () => Promise<Response>) {
  return runBenchmarkRequest(async () => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DistanceMatrixError) {
        const [status, message] = failures[error.code];
        throw new HttpError(status, error.code, message);
      }
      throw error;
    }
  });
}
