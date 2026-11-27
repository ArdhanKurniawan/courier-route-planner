import "server-only";

import {
  DistanceMatrixError,
  type DistanceMatrixProvider,
} from "@/application/distance-matrices/distance-matrix-service";
import type { MatrixOsrmConfig } from "@/config/distance-matrix-osrm";
import {
  buildDistanceMatrixSnapshot,
  DistanceMatrixValidationError,
  distanceMatrixVersion,
} from "@/domain/distance-matrix";
import { createOsrmClient, OsrmError } from "./osrm-client";

const userAgent =
  "CourierRoutePlanner/2.4 (https://github.com/ArdhanKurniawan/courier-route-planner)";

function providerError(error: unknown) {
  if (error instanceof DistanceMatrixValidationError)
    return new DistanceMatrixError(
      error.code === "INVALID_SNAP" ? "SNAP_INVALID" : "INVALID_MATRIX",
    );
  if (error instanceof OsrmError) {
    if (error.code === "UNREACHABLE")
      return new DistanceMatrixError("UNREACHABLE");
    if (error.code === "TIMEOUT")
      return new DistanceMatrixError("PROVIDER_TIMEOUT");
    if (error.code === "DISTANCE_UNSUPPORTED")
      return new DistanceMatrixError("PROVIDER_UNSUPPORTED");
    if (error.code === "INVALID_MATRIX" || error.code === "INVALID_RESPONSE")
      return new DistanceMatrixError("INVALID_MATRIX");
    if (error.providerCode === "TooBig")
      return new DistanceMatrixError("POINT_LIMIT");
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

export function createOsrmDistanceMatrixProvider(
  config: MatrixOsrmConfig,
  fetcher?: typeof fetch,
  clock = () => new Date(),
): DistanceMatrixProvider {
  const osrm = createOsrmClient({
    baseUrl: config.baseUrl,
    profile: config.profile,
    userAgent,
    timeoutMs: 8_000,
    fetcher,
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
            dataVersion:
              dataVersion && dataVersion.length <= 200 ? dataVersion : null,
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
