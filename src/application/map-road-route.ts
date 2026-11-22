import "server-only";

import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { nearestNeighborTwoOpt } from "@/domain/nn-two-opt";
import { createOsrmClient, OsrmError } from "@/infrastructure/osrm-client";
import type { DepotDTO } from "@/lib/validation/depot";
import type { OrderDTO } from "@/lib/validation/order";
import type { MapRoadResult } from "@/lib/validation/map-road-route";
import { buildMapRouteResult } from "./map-route-result";

const minimumGapMs = 1_100;
// Development hot reload must not reset the quota for this Node.js process.
const quotaKey = Symbol.for("courier-route-planner.osrm-map-demo");
const runtime = globalThis as typeof globalThis & {
  [quotaKey]?: { active: boolean; nextRequestAt: number };
};
const quota = runtime[quotaKey] ??= { active: false, nextRequestAt: 0 };

export class RoadRouteBusyError extends Error {
  constructor() {
    super("OSRM demo is busy.");
  }
}

type CoordinateStop = Pick<DepotDTO, "id" | "latitude" | "longitude">;

export function hashTestingOsrmSnapshot(
  scenarioId: string,
  depot: CoordinateStop,
  orders: readonly CoordinateStop[],
): string {
  const coordinates = ({ id, latitude, longitude }: CoordinateStop) =>
    [id, latitude, longitude] as const;
  const ordered = [...orders].sort((left, right) =>
    left.id.length - right.id.length || (left.id < right.id ? -1 : left.id === right.id ? 0 : 1),
  );
  return createHash("sha256")
    .update(JSON.stringify([
      "osrm-testing-snapshot-v1", scenarioId, coordinates(depot), ordered.map(coordinates),
    ]))
    .digest("hex");
}

export async function buildMapRoadRoute(
  scenarioId: string,
  depot: Pick<DepotDTO, "id" | "name" | "latitude" | "longitude">,
  orders: readonly Pick<OrderDTO, "id" | "orderCode" | "customerName" | "latitude" | "longitude">[],
  signal: AbortSignal,
  fetcher?: typeof fetch,
): Promise<MapRoadResult> {
  signal.throwIfAborted();
  if (quota.active || performance.now() < quota.nextRequestAt)
    throw new RoadRouteBusyError();
  quota.active = true;
  try {
    // Trusted local configuration. Request parameters cannot select a host.
    const client = createOsrmClient({
      baseUrl: "https://routing.openstreetmap.de/routed-car",
      profile: "driving",
      timeoutMs: 10_000,
      userAgent: "CourierRoutePlanner/2.4.0 (+https://github.com/ArdhanKurniawan/courier-route-planner)",
      fetcher,
    });
    const table = await client.getDistanceTable({ depot, orders }, signal);
    const result = nearestNeighborTwoOpt(table.matrix);
    const labels = new Map(orders.map((order) => [
      order.id, `${order.orderCode} — ${order.customerName}`,
    ]));
    const route = buildMapRouteResult(result, table.matrix, (index) => {
      const node = table.nodes[index];
      const label = node.kind === "depot" ? `Depot ${depot.name}` : labels.get(node.id);
      if (label === undefined) throw new Error("OSRM result references an unknown Order.");
      return { id: node.id, label, position: [node.latitude, node.longitude] };
    });

    await delay(minimumGapMs, undefined, { signal });
    let positions: MapRoadResult["positions"] = null;
    try {
      const { geometry } = await client.getRouteGeometry(table, result.route, signal);
      positions = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    } catch (error) {
      if (!(error instanceof OsrmError) || signal.aborted) throw error;
    }
    return { scenarioId, route, positions };
  } finally {
    quota.nextRequestAt = performance.now() + minimumGapMs;
    quota.active = false;
  }
}
