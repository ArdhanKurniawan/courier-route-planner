import "server-only";
import { createHash } from "node:crypto";
import {
  generateRandomCoordinates,
  RANDOM_COORDINATE_VERSION,
} from "@/domain/generator/random-coordinate-generator";
import { HttpError } from "@/lib/http/request-security";
import {
  previewDepot,
  previewScenario,
  type DummyPreview,
  type PreviewParameters,
} from "@/lib/validation/dummy-preview";
import type { DummySnapshot } from "@/db/dummy-order-queries";

function canonicalRecord(_key: string, value: unknown) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, record[key]]),
  );
}

export function buildDummyPreview(
  snapshot: DummySnapshot,
  parameters: PreviewParameters,
  operationVersion: string,
): DummyPreview {
  const { scenario, depot, orders } = snapshot;
  const eligible = previewScenario.safeParse(scenario);
  if (!eligible.success)
    throw new HttpError(
      409,
      "INELIGIBLE_SCENARIO",
      "Choose a draft Scenario with the random pattern.",
    );
  const activeDepot = previewDepot.safeParse(
    depot && {
      ...depot,
      isActive: depot.isActive === "1",
      latitude: Number(depot.latitude),
      longitude: Number(depot.longitude),
    },
  );
  if (!activeDepot.success)
    throw new HttpError(
      409,
      "INVALID_DEPOT",
      "The Scenario requires an active Depot with valid coordinates.",
    );

  const version = RANDOM_COORDINATE_VERSION;
  const points = generateRandomCoordinates({
    ...parameters,
    version,
    latitude: activeDepot.data.latitude,
    longitude: activeDepot.data.longitude,
  });
  return {
    scenario: eligible.data,
    depot: activeDepot.data,
    version,
    parameters,
    points,
    dummyCount: orders.length,
    revision: createHash("sha256")
      .update(
        JSON.stringify(
          [
            version,
            operationVersion,
            scenario,
            depot,
            orders,
            parameters,
            points,
          ],
          canonicalRecord,
        ),
      )
      .digest("hex"),
  };
}
