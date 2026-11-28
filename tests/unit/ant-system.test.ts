// @vitest-environment node
import { describe, expect, it } from "vitest";
import { antSystem, updateAntSystemPheromones } from "@/domain/ant-system";
import { nearestNeighborTwoOpt } from "@/domain/nn-two-opt";
import { createSplitMix64, SPLITMIX64_VERSION } from "@/domain/prng";
import {
  validateRouteResult,
  type DistanceMatrix,
} from "@/domain/route-validator";

// Synthetic unit-test parameters only. No research defaults are implied.
const fixture = Object.freeze({
  alpha: 2,
  beta: 1,
  rho: 0.55,
  Q: 22,
  tau0: 0.8,
  antCount: 3,
  maxIterations: 4,
});
const seed = (value: string) =>
  ({
    seed: value,
    prngVersion: SPLITMIX64_VERSION,
  }) as const;
const directed = [
  [0, 11, 7, 17, 4],
  [3, 0, 12, 15, 8],
  [6, 2, 0, 15, 13],
  [7, 10, 3, 0, 5],
  [14, 1, 9, 7, 0],
] as const;

function exhaustiveSmallOptimum(
  matrix: DistanceMatrix,
  route: readonly number[] = [0],
): number {
  const remaining = matrix
    .map((_, node) => node)
    .filter((node) => !route.includes(node));
  if (remaining.length) {
    return Math.min(
      ...remaining.map((node) =>
        exhaustiveSmallOptimum(matrix, [...route, node]),
      ),
    );
  }
  return [...route.slice(1), 0].reduce(
    (cost, to, index) => cost + matrix[route[index]][to],
    0,
  );
}

describe("SplitMix64 reproducibility", () => {
  it("matches fixed 53-bit output vectors including a signed 64-bit endpoint", () => {
    expect(SPLITMIX64_VERSION).toBe("splitmix64-v1");
    const zero = createSplitMix64(BigInt(0));
    const largest = createSplitMix64(BigInt("9223372036854775807"));
    expect(Array.from({ length: 3 }, () => zero() * 2 ** 53)).toEqual([
      7956156453446585, 3886858653415212, 238094247788840,
    ]);
    expect(Array.from({ length: 3 }, () => largest() * 2 ** 53)).toEqual([
      1492015445819507, 8516267985080415, 8306477122316360,
    ]);
  });
});

describe("Classical Ant System", () => {
  it("replays a directed seeded run with fixed iterations and first-best tracking", () => {
    const expected = {
      algorithm: "ACO",
      route: [0, 4, 1, 3, 2, 0],
      totalDistanceM: 29,
      diagnostics: { iterationsCompleted: 4, bestIteration: 2 },
    };
    const result = antSystem(directed, fixture, seed("0"));
    expect(result).toEqual(expected);
    expect(() => validateRouteResult(directed, result)).not.toThrow();
    expect(exhaustiveSmallOptimum(directed)).toBe(19);
    expect(result.totalDistanceM).toBeGreaterThan(19);
    expect(antSystem(directed, fixture, seed("123"))).toMatchObject({
      totalDistanceM: 19,
    });
    expect(antSystem(directed, fixture, seed("0"))).toEqual(expected);
  });

  it("keeps the first encountered result on equal symmetric tours", () => {
    const matrix = [
      [0, 1, 1, 1],
      [1, 0, 1, 1],
      [1, 1, 0, 1],
      [1, 1, 1, 0],
    ];
    expect(
      antSystem(matrix, { ...fixture, alpha: 0, beta: 0 }, seed("0")),
    ).toEqual({
      algorithm: "ACO",
      route: [0, 3, 1, 2, 0],
      totalDistanceM: exhaustiveSmallOptimum(matrix),
      diagnostics: { iterationsCompleted: 4, bestIteration: 1 },
    });
  });

  it("retains the heuristic when absolute pheromone log scores dwarf it", () => {
    const matrix = [
      [0, 1, 2],
      [3, 0, 1],
      [1, 4, 0],
    ];
    const result = antSystem(
      matrix,
      {
        ...fixture,
        alpha: 1e15,
        tau0: 1e100,
        antCount: 1,
        maxIterations: 1,
      },
      seed("1"),
    );
    // The first draw is about 0.567, between a uniform 1/2 and the correct 2/3.
    expect(result).toMatchObject({ route: [0, 1, 2, 0], totalDistanceM: 3 });
  });

  it("evaporates and deposits from every ant on directed edges including return legs", () => {
    const pheromones = Object.freeze([
      Object.freeze([0, 2, 4, 8]),
      Object.freeze([16, 0, 2, 4]),
      Object.freeze([8, 16, 0, 2]),
      Object.freeze([4, 8, 16, 0]),
    ]);
    const tours = [
      { route: Object.freeze([0, 1, 2, 3, 0]), totalDistanceM: 12 },
      { route: Object.freeze([0, 1, 3, 2, 0]), totalDistanceM: 8 },
    ];
    expect(
      updateAntSystemPheromones(pheromones, tours, { rho: 0.5, Q: 24 }),
    ).toEqual([
      [0, 6, 2, 4],
      [8, 0, 3, 5],
      [7, 8, 0, 3],
      [4, 4, 11, 0],
    ]);
  });

  it("handles zero customers without a deposit and one or two with fixed iterations", () => {
    expect(antSystem([[0]], fixture, seed("-9223372036854775808"))).toEqual({
      algorithm: "ACO",
      route: [0, 0],
      totalDistanceM: 0,
      diagnostics: { iterationsCompleted: 0 },
    });
    expect(
      antSystem(
        [
          [0, 2],
          [7, 0],
        ],
        fixture,
        seed("-1"),
      ),
    ).toMatchObject({
      route: [0, 1, 0],
      totalDistanceM: 9,
      diagnostics: { iterationsCompleted: 4, bestIteration: 1 },
    });
    const twoCustomers = [
      [0, 2, 5],
      [6, 0, 3],
      [1, 3, 0],
    ];
    expect(() =>
      validateRouteResult(
        twoCustomers,
        antSystem(twoCustomers, fixture, seed("-1")),
      ),
    ).not.toThrow();
  });

  it.each([
    { alpha: -1 },
    { beta: Infinity },
    { rho: 0 },
    { rho: 1 },
    { rho: NaN },
    { Q: 0 },
    { tau0: -1 },
    { antCount: 1.5 },
    { maxIterations: 0 },
    { maxIterations: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects invalid parameters %o", (params) => {
    expect(() =>
      antSystem(directed, { ...fixture, ...params }, seed("0")),
    ).toThrow("ALGORITHM_PARAMETER_ERROR");
  });

  it.each([
    "",
    "-0",
    "01",
    "1.1",
    "9223372036854775808",
    "-9223372036854775809",
  ])("rejects unsupported seed %s", (value) => {
    expect(() => antSystem(directed, fixture, seed(value))).toThrow(
      "ALGORITHM_PARAMETER_ERROR",
    );
  });

  it("requires the caller to select the supported PRNG version", () => {
    const invalid = {
      ...seed("0"),
      prngVersion: "unknown",
    } as unknown as ReturnType<typeof seed>;
    expect(() => antSystem(directed, fixture, invalid)).toThrow(
      "ALGORITHM_PARAMETER_ERROR",
    );
  });

  it("distinguishes shape errors from the ACO positive-distance requirement", () => {
    expect(() => antSystem([], fixture, seed("0"))).toThrow(
      "DISTANCE_MATRIX_INVALID",
    );
    expect(() =>
      antSystem(
        [
          [0, 1],
          [Infinity, 0],
        ],
        fixture,
        seed("0"),
      ),
    ).toThrow("DISTANCE_MATRIX_INVALID");
    const zeroOffDiagonal = [
      [0, 0],
      [1, 0],
    ];
    expect(nearestNeighborTwoOpt(zeroOffDiagonal).totalDistanceM).toBe(1);
    expect(() => antSystem(zeroOffDiagonal, fixture, seed("0"))).toThrow(
      "ALGORITHM_DISTANCE_DOMAIN_ERROR",
    );
  });

  it("normalizes small weights and fails on an unrepresentable deposit or route sum", () => {
    const small = [
      [0, 1e-200, 2e-200],
      [2e-200, 0, 1e-200],
      [1e-200, 2e-200, 0],
    ];
    const stable = antSystem(
      small,
      { ...fixture, beta: 5, Q: 1e-200, tau0: 1e-200 },
      seed("0"),
    );
    expect(() => validateRouteResult(small, stable)).not.toThrow();
    expect(() =>
      antSystem(
        [
          [0, 0.1],
          [0.1, 0],
        ],
        { ...fixture, Q: Number.MAX_VALUE },
        seed("0"),
      ),
    ).toThrow("ALGORITHM_NUMERICAL_ERROR");
    expect(() =>
      antSystem(
        [
          [0, 2],
          [2, 0],
        ],
        { ...fixture, Q: Number.MIN_VALUE },
        seed("0"),
      ),
    ).toThrow("ALGORITHM_NUMERICAL_ERROR");
    expect(() =>
      antSystem(
        [
          [0, Number.MAX_VALUE],
          [Number.MAX_VALUE, 0],
        ],
        fixture,
        seed("0"),
      ),
    ).toThrow("ALGORITHM_NUMERICAL_ERROR");
  });

  it.each([11, 26, 51])(
    "uses the same immutable directed matrix for both solvers at %i nodes",
    (size) => {
      const matrix = Object.freeze(
        Array.from({ length: size }, (_, from) =>
          Object.freeze(
            Array.from({ length: size }, (_, to) =>
              from === to ? 0 : 1 + ((from * 17 + to * 7) % 31),
            ),
          ),
        ),
      );
      expect(matrix[0][1]).not.toBe(matrix[1][0]);
      const hybrid = nearestNeighborTwoOpt(matrix);
      const aco = antSystem(matrix, fixture, seed("9223372036854775807"));
      expect(hybrid.totalDistanceM).toBeLessThanOrEqual(
        hybrid.diagnostics.nnInitialDistanceM,
      );
      expect(aco.diagnostics.iterationsCompleted).toBe(fixture.maxIterations);
      expect(() => validateRouteResult(matrix, hybrid)).not.toThrow();
      expect(() => validateRouteResult(matrix, aco)).not.toThrow();
    },
  );
});
