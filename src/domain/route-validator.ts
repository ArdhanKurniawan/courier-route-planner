export type DistanceMatrix = ReadonlyArray<ReadonlyArray<number>>;
export type Route = ReadonlyArray<number>;
export type Tour = Readonly<{ route: Route; totalDistanceM: number }>;

export function validateDistanceMatrix(matrix: DistanceMatrix): void {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error("DISTANCE_MATRIX_INVALID");
  }

  for (let from = 0; from < matrix.length; from++) {
    const row = matrix[from];
    if (!Array.isArray(row) || row.length !== matrix.length) {
      throw new Error("DISTANCE_MATRIX_INVALID");
    }
    for (let to = 0; to < row.length; to++) {
      const cost = row[to];
      if (!Number.isFinite(cost) || cost < 0 || (from === to && cost !== 0)) {
        throw new Error("DISTANCE_MATRIX_INVALID");
      }
    }
  }
}

export function validateClosedTour(route: Route, nodeCount: number): void {
  if (
    !Array.isArray(route) ||
    route.length !== nodeCount + 1 ||
    route[0] !== 0 ||
    route[nodeCount] !== 0
  ) {
    throw new Error("ALGORITHM_INVALID_ROUTE");
  }

  const visited = new Set<number>();
  for (let position = 1; position < nodeCount; position++) {
    const customer = route[position];
    if (
      !Number.isInteger(customer) ||
      customer < 1 ||
      customer >= nodeCount ||
      visited.has(customer)
    ) {
      throw new Error("ALGORITHM_INVALID_ROUTE");
    }
    visited.add(customer);
  }
}

/** Sum a route with already validated indices and matrix. */
export function directedTourDistance(
  matrix: DistanceMatrix,
  route: Route,
): number {
  let totalDistanceM = 0;
  for (let position = 1; position < route.length; position++) {
    totalDistanceM += matrix[route[position - 1]][route[position]];
  }
  if (!Number.isFinite(totalDistanceM)) {
    throw new Error("ALGORITHM_NUMERICAL_ERROR");
  }
  return totalDistanceM;
}

/** Independently check the result outside the timed solver call. */
export function validateRouteResult(
  matrix: DistanceMatrix,
  result: Tour,
): void {
  validateDistanceMatrix(matrix);
  validateClosedTour(result.route, matrix.length);
  // Solvers sum in tour order, so no tolerance or rounding is needed.
  if (directedTourDistance(matrix, result.route) !== result.totalDistanceM) {
    throw new Error("ALGORITHM_INVALID_ROUTE");
  }
}
