// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  nearestNeighbor,
  nearestNeighborTwoOpt,
  twoOpt,
  type DistanceMatrix,
  type Route,
} from "@/domain/nn-two-opt";

const directedCycle = [
  [0, 1, 9, 9],
  [9, 0, 1, 9],
  [9, 9, 0, 1],
  [1, 9, 9, 0],
] as const;

const bestImprovement = [
  [0, 6, 6, 15],
  [1, 0, 4, 12],
  [11, 4, 0, 13],
  [4, 7, 4, 0],
] as const;

function directedCost(matrix: DistanceMatrix, route: Route) {
  return route
    .slice(1)
    .reduce((sum, to, position) => sum + matrix[route[position]][to], 0);
}

function expectClosedTour(matrix: DistanceMatrix, route: Route) {
  expect(route.length).toBe(matrix.length + 1);
  expect(route[0]).toBe(0);
  expect(route[route.length - 1]).toBe(0);
  expect(route.slice(1, -1).sort((a, b) => a - b)).toEqual(
    Array.from({ length: matrix.length - 1 }, (_, index) => index + 1),
  );
}

describe("nearestNeighbor", () => {
  it("follows the cheap directed cycle and includes the return edge", () => {
    expect(nearestNeighbor(directedCycle)).toEqual({
      route: [0, 1, 2, 3, 0],
      totalDistanceM: 4,
    });
  });

  it("breaks equal outgoing costs by lowest node index across calls", () => {
    const matrix = Array.from({ length: 4 }, (_, from) =>
      Array.from({ length: 4 }, (_, to) => (from === to ? 0 : 1)),
    );
    const expected = { route: [0, 1, 2, 3, 0], totalDistanceM: 4 };
    expect(nearestNeighbor(matrix)).toEqual(expected);
    expect(nearestNeighbor(matrix)).toEqual(expected);
  });

  it("preserves fractional meter costs and accepts zero off-diagonal costs", () => {
    expect(
      nearestNeighbor([
        [0, 0],
        [2.125, 0],
      ]),
    ).toEqual({ route: [0, 1, 0], totalDistanceM: 2.125 });
  });

  it.each([
    ["empty matrix", []],
    ["jagged rows", [[0, 1], [0]]],
    ["missing pair", [[0, 1], Array<number>(2)]],
    ["unreachable pair", [[0, null], [1, 0]]],
    ["nonzero diagonal", [[1, 2], [1, 0]]],
    ["negative cost", [[0, -1], [1, 0]]],
    ["infinite cost", [[0, 1], [Infinity, 0]]],
    ["NaN cost", [[0, NaN], [1, 0]]],
  ])("rejects %s", (_label, matrix) => {
    expect(() => nearestNeighbor(matrix as DistanceMatrix)).toThrow(
      "DISTANCE_MATRIX_INVALID",
    );
  });

  it("rejects an overflowing route sum", () => {
    const max = Number.MAX_VALUE;
    expect(() =>
      nearestNeighbor([
        [0, max],
        [max, 0],
      ]),
    ).toThrow("ALGORITHM_NUMERICAL_ERROR");
  });
});

describe("twoOpt", () => {
  it("rejects the asymmetric reversal that only saves boundary edges", () => {
    const matrix = [
      [0, 5, 1, 20],
      [20, 0, 1, 1],
      [20, 20, 0, 5],
      [5, 20, 20, 0],
    ] as const;
    const initial = Object.freeze([0, 1, 2, 3, 0]);
    expect(directedCost(matrix, [0, 2, 1, 3, 0])).toBe(27);
    expect(twoOpt(matrix, initial)).toMatchObject({
      route: initial,
      totalDistanceM: 16,
      diagnostics: { twoOptPasses: 1, acceptedImprovements: 0 },
    });
  });

  it("keeps the first lexicographic pair among equal best improvements", () => {
    const matrix = [
      [0, 3, 5, 6],
      [6, 0, 9, 11],
      [13, 15, 0, 16],
      [15, 17, 3, 0],
    ] as const;
    const first = [0, 3, 2, 1, 0];
    const second = [0, 1, 3, 2, 0];
    expect(directedCost(matrix, first)).toBe(30);
    expect(directedCost(matrix, second)).toBe(30);
    expect(twoOpt(matrix, [0, 1, 2, 3, 0])).toMatchObject({
      route: first,
      totalDistanceM: 30,
    });
  });

  it("keeps a closed tour when all reversals have equal cost", () => {
    const matrix = [
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
    ] as const;
    const route = [0, 2, 1, 0];
    expect(twoOpt(matrix, route)).toMatchObject({
      route,
      totalDistanceM: 3,
      diagnostics: { twoOptPasses: 1, acceptedImprovements: 0 },
    });
  });

  it.each([
    { route: [0, 1, 2, 0] },
    { route: [1, 0, 2, 3, 0] },
    { route: [0, 1, 2, 3, 1] },
    { route: [0, 1, 1, 3, 0] },
    { route: [0, 1, 0, 3, 0] },
    { route: [0, 1, 2, 4, 0] },
    { route: [0, 1.5, 2, 3, 0] },
  ])("rejects invalid closed tour $route", ({ route }) => {
    expect(() => twoOpt(directedCycle, route)).toThrow(
      "ALGORITHM_INVALID_ROUTE",
    );
  });

  it("rejects a candidate whose full route sum overflows", () => {
    const max = Number.MAX_VALUE;
    const matrix = [
      [0, 1, max],
      [max, 0, 1],
      [1, max, 0],
    ] as const;
    expect(() => twoOpt(matrix, [0, 1, 2, 0])).toThrow(
      "ALGORITHM_NUMERICAL_ERROR",
    );
  });
});

describe("nearestNeighborTwoOpt", () => {
  it("compares NN with best improvement instead of accepting the first saving", () => {
    const initial = nearestNeighbor(bestImprovement);
    expect(initial).toEqual({ route: [0, 1, 2, 3, 0], totalDistanceM: 27 });
    const candidates = [
      [0, 2, 1, 3, 0],
      [0, 3, 2, 1, 0],
      [0, 1, 3, 2, 0],
    ];
    expect(candidates.map((route) => directedCost(bestImprovement, route))).toEqual(
      [26, 24, 33],
    );
    expect(nearestNeighborTwoOpt(bestImprovement)).toEqual({
      algorithm: "NN_2OPT",
      route: [0, 3, 2, 1, 0],
      totalDistanceM: 24,
      diagnostics: {
        nnInitialDistanceM: 27,
        twoOptPasses: 2,
        acceptedImprovements: 1,
      },
    });
  });

  it("makes successive strict improvements until reaching a local minimum", () => {
    const matrix = [
      [0, 3, 15, 9],
      [10, 0, 9, 12],
      [6, 10, 0, 16],
      [15, 5, 14, 0],
    ] as const;
    expect(nearestNeighborTwoOpt(matrix)).toMatchObject({
      route: [0, 3, 1, 2, 0],
      totalDistanceM: 29,
      diagnostics: {
        nnInitialDistanceM: 43,
        twoOptPasses: 3,
        acceptedImprovements: 2,
      },
    });
  });

  it("keeps the cheap cycle at its original cost", () => {
    const initial = nearestNeighbor(directedCycle);
    expect(nearestNeighborTwoOpt(directedCycle)).toMatchObject(initial);
  });

  it.each([
    { matrix: [[0]], route: [0, 0], distance: 0 },
    {
      matrix: [
        [0, 2],
        [5, 0],
      ],
      route: [0, 1, 0],
      distance: 7,
    },
  ])("handles $matrix without any reversal candidates", (fixture) => {
    expect(nearestNeighbor(fixture.matrix)).toEqual({
      route: fixture.route,
      totalDistanceM: fixture.distance,
    });
    expect(nearestNeighborTwoOpt(fixture.matrix)).toMatchObject({
      route: fixture.route,
      totalDistanceM: fixture.distance,
      diagnostics: {
        nnInitialDistanceM: fixture.distance,
        twoOptPasses: 0,
        acceptedImprovements: 0,
      },
    });
  });

  it("considers reversing the whole customer segment with two customers", () => {
    const matrix = [
      [0, 1, 2],
      [1, 0, 8],
      [9, 1, 0],
    ] as const;
    expect(nearestNeighbor(matrix)).toEqual({
      route: [0, 1, 2, 0],
      totalDistanceM: 18,
    });
    expect(nearestNeighborTwoOpt(matrix)).toMatchObject({
      route: [0, 2, 1, 0],
      totalDistanceM: 4,
      diagnostics: { nnInitialDistanceM: 18 },
    });
  });

  it("preserves input, closed tours and monotonic cost across generated matrices", () => {
    for (let size = 1; size <= 7; size++) {
      for (let sample = 0; sample < 5; sample++) {
        const matrix = Object.freeze(
          Array.from({ length: size }, (_, from) =>
            Object.freeze(
              Array.from({ length: size }, (_, to) =>
                from === to
                  ? 0
                  : ((from * 19 + to * 11 + (from + 1) * to * sample) % 29) / 4,
              ),
            ),
          ),
        );
        const initial = nearestNeighbor(matrix);
        const optimized = nearestNeighborTwoOpt(matrix);
        expectClosedTour(matrix, initial.route);
        expectClosedTour(matrix, optimized.route);
        expect(initial.totalDistanceM).toBe(directedCost(matrix, initial.route));
        expect(optimized.totalDistanceM).toBe(
          directedCost(matrix, optimized.route),
        );
        expect(optimized.totalDistanceM).toBeLessThanOrEqual(
          initial.totalDistanceM,
        );
        expect(optimized).toEqual(nearestNeighborTwoOpt(matrix));
        const frozenRoute = Object.freeze([...initial.route]);
        const refined = twoOpt(matrix, frozenRoute);
        expect(frozenRoute).toEqual(initial.route);
        expect(refined.route).toEqual(optimized.route);
        expect(refined.totalDistanceM).toBe(optimized.totalDistanceM);
      }
    }
  });
});
