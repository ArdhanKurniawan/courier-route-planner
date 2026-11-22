import "server-only";

import { setTimeout as delay } from "node:timers/promises";
import { nearestNeighborTwoOpt } from "@/domain/nn-two-opt";
import { createOsrmClient, OsrmError } from "@/infrastructure/osrm-client";
import type { DepotDTO } from "@/lib/validation/depot";
import type { OrderDTO } from "@/lib/validation/order";
import type { MapRoadResult } from "@/lib/validation/map-road-route";

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

export async function buildMapRoadRoute(
  scenarioId: string,
  depot: Pick<DepotDTO, "id" | "name" | "latitude" | "longitude">,
  orders: readonly Pick<OrderDTO, "id" | "orderCode" | "customerName" | "latitude" | "longitude">[],
  signal: AbortSignal,
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
    });
    const table = await client.getDistanceTable({ depot, orders }, signal);
    const result = nearestNeighborTwoOpt(table.matrix);
    const labels = new Map(orders.map((order) => [
      order.id, `${order.orderCode} — ${order.customerName}`,
    ]));
    const route: MapRoadResult["route"] = {
      stops: result.route.map((index) => {
        const node = table.nodes[index];
        const label = node.kind === "depot" ? `Depot ${depot.name}` : labels.get(node.id);
        if (label === undefined) throw new Error("OSRM result references an unknown Order.");
        return { id: node.id, label, position: [node.latitude, node.longitude] };
      }),
      nnInitialDistanceM: result.diagnostics.nnInitialDistanceM,
      totalDistanceM: result.totalDistanceM,
      savingsM: result.diagnostics.nnInitialDistanceM - result.totalDistanceM,
    };

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
