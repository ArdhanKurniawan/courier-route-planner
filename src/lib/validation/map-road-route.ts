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
  nnInitialDistanceM: meters,
  totalDistanceM: meters,
  savingsM: meters,
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
