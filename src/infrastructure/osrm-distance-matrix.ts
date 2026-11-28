import "server-only";

import {
  DistanceMatrixError,
  type DistanceMatrixFailure,
  type DistanceMatrixProvider,
} from "@/application/distance-matrices/distance-matrix-service";
import type { MatrixOsrmConfig, MatrixProviderConfig } from "@/config/distance-matrix-osrm";
import {
  buildDistanceMatrixSnapshot,
  DistanceMatrixValidationError,
  distanceMatrixVersion,
  matrixProviderEndpoints,
} from "@/domain/distance-matrix";
import { createOsrmClient, OsrmError } from "./osrm-client";

const userAgent =
  "CourierRoutePlanner/2.4 (https://github.com/ArdhanKurniawan/courier-route-planner)";

export class MatrixProviderAttemptError extends DistanceMatrixError {
  constructor(
    code: DistanceMatrixFailure,
    readonly fallback: boolean,
    readonly cooldownMs: number,
  ) {
    super(code);
  }
}

function hostedFailure(error: OsrmError) {
  const status = error.httpStatus;
  const withCooldown = (code: DistanceMatrixFailure, fallback: boolean, minimumMs: number) =>
    new MatrixProviderAttemptError(code, fallback, Math.max(minimumMs, error.retryAfterMs ?? 0));
  if (status === 401 || status === 403)
    return withCooldown("PROVIDER_AUTH", false, 3_600_000);
  if (
    (status !== undefined && ((status >= 300 && status < 400) || status === 404 || status === 405)) ||
    (error.providerCode && ["InvalidUrl", "InvalidService", "InvalidVersion", "InvalidOptions"].includes(error.providerCode))
  )
    return withCooldown("PROVIDER_CONFIGURATION", false, 3_600_000);
  if (error.providerCode === "InvalidQuery" || error.providerCode === "InvalidValue")
    return new DistanceMatrixError("INVALID_MATRIX");
  if (status === 402 || status === 429) {
    const longHold = status === 402 || error.providerCode === "daily_limit_exceeded";
    return new MatrixProviderAttemptError(
      "PROVIDER_CAPACITY",
      true,
      Math.max(1, error.retryAfterMs ?? (longHold ? 86_400_000 : 60_000)),
    );
  }
  if (error.code === "TIMEOUT")
    return withCooldown("PROVIDER_TIMEOUT", true, 30_000);
  if (error.code === "NETWORK" || (status !== undefined && status >= 500 && status <= 599))
    return withCooldown("PROVIDER_UNAVAILABLE", true, 30_000);
}

function providerError(error: unknown) {
  if (error instanceof DistanceMatrixValidationError)
    return new DistanceMatrixError(
      error.code === "INVALID_SNAP" ? "SNAP_INVALID" : "INVALID_MATRIX",
    );
  if (error instanceof OsrmError) {
    if (error.code === "UNREACHABLE")
      return new DistanceMatrixError("UNREACHABLE");
    if (error.code === "INVALID_INPUT")
      return new DistanceMatrixError("INVALID_MATRIX");
    if (error.code === "DISTANCE_UNSUPPORTED")
      return new DistanceMatrixError("PROVIDER_UNSUPPORTED");
    if (error.code === "INVALID_MATRIX" || error.code === "INVALID_RESPONSE")
      return new DistanceMatrixError("INVALID_MATRIX");
    if (error.providerCode === "TooBig")
      return new DistanceMatrixError("POINT_LIMIT");
    const failure = hostedFailure(error);
    if (failure) return failure;
  }
  return new DistanceMatrixError("PROVIDER_UNAVAILABLE");
}

function snapEvidence(waypoint: {
  location: readonly [number, number];
  distance?: number;
}) {
  const [longitude, latitude] = waypoint.location;
  return { longitude, latitude, distanceM: waypoint.distance };
}

function hostedFetcher(config: MatrixProviderConfig, fetcher: typeof fetch): typeof fetch {
  const endpoint = matrixProviderEndpoints[config.id];
  if (config.baseUrl !== endpoint || config.profile !== "driving")
    throw new DistanceMatrixError("PROVIDER_UNSUPPORTED");
  const origin = new URL(endpoint).origin;
  return (input, init) => {
    if (
      !(input instanceof URL) ||
      input.origin !== origin ||
      !input.pathname.startsWith("/table/v1/driving/") ||
      input.username || input.password || input.hash ||
      init?.method !== "GET"
    )
      throw new OsrmError("INVALID_INPUT", "table");
    const headers = new Headers(init.headers);
    if (config.id === "just-routing")
      headers.set("Authorization", "Bearer " + config.apiKey);
    else
      headers.set("x-api-key", config.apiKey);
    return fetcher(input, { ...init, headers, redirect: "manual" });
  };
}

export function createOsrmDistanceMatrixProvider(
  config: MatrixOsrmConfig | MatrixProviderConfig,
  fetcher: typeof fetch = fetch,
  clock = () => new Date(),
): DistanceMatrixProvider {
  const hosted = "id" in config ? config : undefined;
  const osrm = createOsrmClient({
    baseUrl: config.baseUrl,
    profile: config.profile,
    userAgent,
    timeoutMs: 8_000,
    fetcher: hosted ? hostedFetcher(hosted, fetcher) : fetcher,
    hostedTable: hosted !== undefined,
  });
  return {
    maxPoints: config.maxPoints,
    async generate(inputHash, nodeOrder, signal) {
      if (nodeOrder.length > config.maxPoints)
        throw new DistanceMatrixError("POINT_LIMIT");
      try {
        const result = await osrm.getOrderedDistanceTable(
          nodeOrder,
          config.snapRadiusM,
          signal,
        );
        const dataVersion = result.dataVersion;
        return buildDistanceMatrixSnapshot({
          version: distanceMatrixVersion,
          provider: "osrm",
          profile: result.profile,
          endpoint: result.baseUrl,
          options: {
            annotations: "distance",
            generateHints: false,
            snapRadiusM: config.snapRadiusM,
          },
          unit: result.unit,
          directed: result.directed,
          inputHash,
          nodeOrder,
          matrix: result.matrix,
          snapping: result.sources.map((source, i) => ({
            source: snapEvidence(source),
            destination: snapEvidence(result.destinations[i]),
          })),
          provenance: {
            generatedAt: clock().toISOString(),
            apiVersion: "v1",
            ...(hosted ? { actualProvider: hosted.id } : {}),
            dataVersion:
              dataVersion &&
              dataVersion.length <= 200 &&
              (!hosted || !dataVersion.includes(hosted.apiKey))
                ? dataVersion : null,
            softwareVersion: config.softwareVersion,
            networkExtract: config.networkExtract,
            codeRevision: config.codeRevision,
          },
        });
      } catch (error) {
        throw providerError(error);
      }
    },
  };
}
