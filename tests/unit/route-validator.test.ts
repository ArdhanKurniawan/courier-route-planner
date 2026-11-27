// @vitest-environment node
import { describe, expect, it } from "vitest";
import { nearestNeighborTwoOpt } from "@/domain/nn-two-opt";
import {
  validateRouteResult,
  type DistanceMatrix,
} from "@/domain/route-validator";

// Synthetic matrices, in meters.
const directedCycle = [
  [0, 1, 9, 9],
  [9, 0, 1, 9],
  [9, 9, 0, 1],
  [1, 9, 9, 0],
] as const;
const symmetricCycle = [
  [0, 2, 5, 2],
  [2, 0, 2, 5],
  [5, 2, 0, 2],
  [2, 5, 2, 0],
] as const;

function optimalCostForThreeCustomers(matrix: DistanceMatrix) {
  return Math.min(
    ...[
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ].map(
      ([a, b, c]) => matrix[0][a] + matrix[a][b] + matrix[b][c] + matrix[c][0],
    ),
  );
}

describe("validateRouteResult", () => {
  it("includes the directed return edge in the cost", () => {
    expect(() =>
      validateRouteResult(directedCycle, {
        route: [0, 3, 2, 1, 0],
        totalDistanceM: 36,
      }),
    ).not.toThrow();
    expect(() =>
      validateRouteResult(directedCycle, {
        route: [0, 3, 2, 1, 0],
        totalDistanceM: 27,
      }),
    ).toThrow("ALGORITHM_INVALID_ROUTE");
  });

  it.each(
    [
      [0, 1, 2, 0],
      [1, 2, 3, 0, 0],
      [0, 1, 2, 3, 1],
      [0, 1, 0, 3, 0],
      [0, 1, 1, 3, 0],
      [0, 1, 2, 4, 0],
      [0, 1, 2.5, 3, 0],
    ].map((route) => ({ route })),
  )("rejects invalid route $route", ({ route }) => {
    expect(() =>
      validateRouteResult(directedCycle, { route, totalDistanceM: 0 }),
    ).toThrow("ALGORITHM_INVALID_ROUTE");
  });

  it("rejects an invalid matrix and an overflowing tour", () => {
    const result = { route: [0, 1, 0], totalDistanceM: 0 };
    expect(() => validateRouteResult([[0, 1], [1]], result)).toThrow(
      "DISTANCE_MATRIX_INVALID",
    );
    expect(() =>
      validateRouteResult(
        [
          [0, Number.MAX_VALUE],
          [Number.MAX_VALUE, 0],
        ],
        result,
      ),
    ).toThrow("ALGORITHM_NUMERICAL_ERROR");
  });

  it("validates a depot-only tour and preserves frozen inputs", () => {
    const matrix = Object.freeze([Object.freeze([0])]);
    const result = Object.freeze({
      route: Object.freeze([0, 0]),
      totalDistanceM: 0,
    });
    expect(() => validateRouteResult(matrix, result)).not.toThrow();
    expect(matrix).toEqual([[0]]);
    expect(result.route).toEqual([0, 0]);
  });

  it.each([
    { matrix: directedCycle, optimum: 4 },
    { matrix: symmetricCycle, optimum: 8 },
  ])(
    "validates Hybrid against an exhaustive small-instance oracle ($optimum m)",
    ({ matrix, optimum }) => {
      const result = nearestNeighborTwoOpt(matrix);
      expect(optimalCostForThreeCustomers(matrix)).toBe(optimum);
      expect(result.totalDistanceM).toBe(optimum);
      expect(() => validateRouteResult(matrix, result)).not.toThrow();
    },
  );
});
