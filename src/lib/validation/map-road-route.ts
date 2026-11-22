import { z } from "zod";
import { depotId } from "./depot";

export const osrmOrderLimit = 10;
export const localMapDemoId = "local-demo";
export const mapScenarioId = z.union([depotId, z.literal(localMapDemoId)]);
export type MapRouteMode = "haversine" | "osrm";

export const mapPosition = z.tuple([
  z.number().finite().min(-90).max(90),
  z.number().finite().min(-180).max(180),
]);
const meters = z.number().finite().nonnegative();
const route = z.object({
  stops: z.array(z.object({
    id: depotId,
    label: z.string().min(1),
    position: mapPosition,
  })).min(3).max(osrmOrderLimit + 2),
  legDistancesM: z.array(meters).min(2).max(osrmOrderLimit + 1),
  nnInitialDistanceM: meters,
  totalDistanceM: meters,
  savingsM: meters,
}).refine(({ stops, legDistancesM, totalDistanceM }) => {
  if (legDistancesM.length !== stops.length - 1) return false;
  const sum = legDistancesM.reduce((total, distance) => total + distance, 0);
  if (!Number.isFinite(sum)) return false;
  const toleranceM = Math.max(
    1e-6,
    Number.EPSILON * Math.max(sum, totalDistanceM) * legDistancesM.length,
  );
  return Math.abs(sum - totalDistanceM) <= toleranceM;
}, {
  path: ["legDistancesM"],
  message: "Leg distances must match the route stops and Hybrid total.",
});
export type MapRoute = z.infer<typeof route>;

export const mapRoadResponse = z.object({
  data: z.object({
    scenarioId: mapScenarioId,
    route,
    positions: z.array(mapPosition).min(2).nullable(),
  }),
});
export type MapRoadResult = z.infer<typeof mapRoadResponse>["data"];
