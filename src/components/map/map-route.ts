import { buildMapRouteResult } from "@/application/map-route-result";
import { nearestNeighborTwoOpt } from "@/domain/nn-two-opt";
import type { MapRoute } from "@/lib/validation/map-road-route";
import type { MapPosition, ScenarioMapData } from "./map-data";

export type MapRouteOutcome =
  | { status: "ready"; route: MapRoute }
  | { status: "error"; message: string };

export const mapRouteFailure = "Rute gagal dihitung. Coba lagi.";

const earthRadiusM = 6_371_008.8;
const radiansPerDegree = Math.PI / 180;

function haversineMeters(from: MapPosition, to: MapPosition): number {
  const latitudeDelta = (to[0] - from[0]) * radiansPerDegree;
  const longitudeGap = Math.abs(to[1] - from[1]);
  const longitudeDelta =
    Math.min(longitudeGap, 360 - longitudeGap) * radiansPerDegree;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(from[0] * radiansPerDegree) *
      Math.cos(to[0] * radiansPerDegree) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function calculateMapRoute({
  depot,
  orders,
}: ScenarioMapData): MapRouteOutcome {
  if (!depot.position) {
    return {
      status: "error",
      message: "Koordinat Depot tidak valid atau belum tersedia.",
    };
  }
  if (orders.length === 0) {
    return { status: "error", message: "Belum ada Order pada Scenario ini." };
  }

  const nodes: MapRoute["stops"] = [
    { id: depot.id, label: `Depot ${depot.name}`, position: depot.position },
  ];
  // The Map GET parser guarantees canonical positive BIGINT strings.
  const sortedOrders = [...orders].sort((left, right) => {
    const lengthDifference = left.id.length - right.id.length;
    if (lengthDifference !== 0) return lengthDifference;
    if (left.id === right.id) return 0;
    return left.id < right.id ? -1 : 1;
  });
  for (const order of sortedOrders) {
    if (!order.position) {
      return {
        status: "error",
        message: `Koordinat Order ${order.orderCode} tidak valid atau belum tersedia.`,
      };
    }
    nodes.push({
      id: order.id,
      label: `${order.orderCode} — ${order.customerName}`,
      position: order.position,
    });
  }

  const matrix = nodes.map(() => Array<number>(nodes.length).fill(0));
  for (let from = 0; from < nodes.length; from++) {
    for (let to = from + 1; to < nodes.length; to++) {
      const distance = haversineMeters(nodes[from].position, nodes[to].position);
      matrix[from][to] = distance;
      matrix[to][from] = distance;
    }
  }
  const result = nearestNeighborTwoOpt(matrix);
  return {
    status: "ready",
    route: buildMapRouteResult(result, matrix, (index) => nodes[index]),
  };
}
