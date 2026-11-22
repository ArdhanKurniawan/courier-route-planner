import type { DistanceMatrix, NNTwoOptResult } from "@/domain/nn-two-opt";
import type { MapRoute } from "@/lib/validation/map-road-route";

export function buildMapRouteResult(
  result: NNTwoOptResult,
  matrix: DistanceMatrix,
  stopAt: (nodeIndex: number) => MapRoute["stops"][number],
): MapRoute {
  const { route, totalDistanceM, diagnostics: { nnInitialDistanceM } } = result;
  return {
    stops: route.map(stopAt),
    legDistancesM: route.slice(1).map((to, leg) => matrix[route[leg]][to]),
    nnInitialDistanceM,
    totalDistanceM,
    savingsM: nnInitialDistanceM - totalDistanceM,
  };
}
