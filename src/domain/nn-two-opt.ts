import {
  directedTourDistance,
  validateClosedTour,
  validateDistanceMatrix,
  type DistanceMatrix,
  type Route,
  type Tour,
} from "./route-validator";

export type { DistanceMatrix, Route } from "./route-validator";

type TwoOptDiagnostics = Readonly<{
  twoOptPasses: number;
  acceptedImprovements: number;
}>;
type TwoOptResult = Tour & Readonly<{ diagnostics: TwoOptDiagnostics }>;
export type NNTwoOptResult = Tour &
  Readonly<{
    algorithm: "NN_2OPT";
    diagnostics: TwoOptDiagnostics & Readonly<{ nnInitialDistanceM: number }>;
  }>;

function buildNearestNeighbor(matrix: DistanceMatrix): Tour {
  const route = [0];
  const visited = Array<boolean>(matrix.length).fill(false);

  while (route.length < matrix.length) {
    const from = route[route.length - 1];
    let nearest = -1;
    let nearestDistance = Infinity;
    for (let to = 1; to < matrix.length; to++) {
      const distance = matrix[from][to];
      // Ascending indices and strict comparison retain the lowest-index tie.
      if (!visited[to] && distance < nearestDistance) {
        nearest = to;
        nearestDistance = distance;
      }
    }
    route.push(nearest);
    visited[nearest] = true;
  }
  route.push(0);
  return { route, totalDistanceM: directedTourDistance(matrix, route) };
}

function reverseSegment(route: Route, start: number, end: number): number[] {
  const candidate = route.slice();
  for (let left = start, right = end; left < right; left++, right--) {
    const leftNode = candidate[left];
    candidate[left] = candidate[right];
    candidate[right] = leftNode;
  }
  return candidate;
}

function improveTour(matrix: DistanceMatrix, initial: Tour): TwoOptResult {
  let route = initial.route.slice();
  let totalDistanceM = initial.totalDistanceM;
  let twoOptPasses = 0;
  let acceptedImprovements = 0;

  while (matrix.length > 2) {
    let bestRoute = route;
    let bestDistance = totalDistanceM;
    for (let start = 1; start < matrix.length - 1; start++) {
      for (let end = start + 1; end < matrix.length; end++) {
        const candidate = reverseSegment(route, start, end);
        // A reversal changes internal directed edges as well as boundary edges.
        const candidateDistance = directedTourDistance(matrix, candidate);
        if (candidateDistance < bestDistance) {
          bestRoute = candidate;
          bestDistance = candidateDistance;
        }
      }
    }
    twoOptPasses++;
    if (bestRoute === route) break;
    route = bestRoute;
    totalDistanceM = bestDistance;
    acceptedImprovements++;
  }

  return { route, totalDistanceM, diagnostics: { twoOptPasses, acceptedImprovements } };
}

export function nearestNeighbor(matrix: DistanceMatrix): Tour {
  validateDistanceMatrix(matrix);
  return buildNearestNeighbor(matrix);
}

export function twoOpt(matrix: DistanceMatrix, initialRoute: Route): TwoOptResult {
  validateDistanceMatrix(matrix);
  validateClosedTour(initialRoute, matrix.length);
  return improveTour(matrix, {
    route: initialRoute,
    totalDistanceM: directedTourDistance(matrix, initialRoute),
  });
}

export function nearestNeighborTwoOpt(matrix: DistanceMatrix): NNTwoOptResult {
  validateDistanceMatrix(matrix);
  const initial = buildNearestNeighbor(matrix);
  const improved = improveTour(matrix, initial);
  return {
    ...improved,
    algorithm: "NN_2OPT",
    diagnostics: {
      ...improved.diagnostics,
      nnInitialDistanceM: initial.totalDistanceM,
    },
  };
}
