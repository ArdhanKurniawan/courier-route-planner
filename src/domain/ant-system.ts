import { createSplitMix64, SPLITMIX64_VERSION } from "./prng";
import {
  directedTourDistance,
  validateDistanceMatrix,
  type DistanceMatrix,
  type Tour,
} from "./route-validator";

export const ANT_SYSTEM_VERSION = "ant-system-v1";

export type AntSystemParameters = Readonly<{
  alpha: number;
  beta: number;
  rho: number;
  Q: number;
  tau0: number;
  antCount: number;
  maxIterations: number;
}>;

export type AntSystemRandomness = Readonly<{
  /** Canonical signed 64-bit decimal seed. */
  seed: string;
  prngVersion: typeof SPLITMIX64_VERSION;
}>;

export type AntSystemResult = Tour &
  Readonly<{
    algorithm: "ACO";
    diagnostics: Readonly<{
      iterationsCompleted: number;
      bestIteration?: number;
    }>;
  }>;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validateParameters(parameters: AntSystemParameters): void {
  if (
    !parameters ||
    !Number.isFinite(parameters.alpha) ||
    parameters.alpha < 0 ||
    !Number.isFinite(parameters.beta) ||
    parameters.beta < 0 ||
    !isPositiveFinite(parameters.rho) ||
    parameters.rho >= 1 ||
    !isPositiveFinite(parameters.Q) ||
    !isPositiveFinite(parameters.tau0) ||
    !Number.isSafeInteger(parameters.antCount) ||
    parameters.antCount < 1 ||
    !Number.isSafeInteger(parameters.maxIterations) ||
    parameters.maxIterations < 1
  ) {
    throw new Error("ALGORITHM_PARAMETER_ERROR");
  }
}

function parseSeed(randomness: AntSystemRandomness): bigint {
  if (
    randomness?.prngVersion !== SPLITMIX64_VERSION ||
    typeof randomness.seed !== "string" ||
    !/^(?:0|-?[1-9]\d{0,18})$/u.test(randomness.seed)
  ) {
    throw new Error("ALGORITHM_PARAMETER_ERROR");
  }
  const seed = BigInt(randomness.seed);
  if (BigInt.asIntN(64, seed) !== seed) {
    throw new Error("ALGORITHM_PARAMETER_ERROR");
  }
  return seed;
}

function positiveOrFail(value: number): number {
  if (!isPositiveFinite(value)) {
    throw new Error("ALGORITHM_NUMERICAL_ERROR");
  }
  return value;
}

/** Advance one iteration with validated parameters and completed nontrivial tours. */
export function updateAntSystemPheromones(
  pheromones: DistanceMatrix,
  tours: readonly Tour[],
  { rho, Q }: Pick<AntSystemParameters, "rho" | "Q">,
): DistanceMatrix {
  const deposits = pheromones.map((row) => row.map(() => 0));
  for (const { route, totalDistanceM } of tours) {
    const amount = positiveOrFail(Q / totalDistanceM);
    for (let position = 1; position < route.length; position++) {
      deposits[route[position - 1]][route[position]] += amount;
    }
  }

  const retention = 1 - rho;
  return pheromones.map((row, from) =>
    row.map((previous, to) =>
      from === to
        ? 0
        : positiveOrFail(retention * previous + deposits[from][to]),
    ),
  );
}

function logRatio(value: number, reference: number): number {
  const relativeDifference = (value - reference) / reference;
  return Math.abs(relativeDifference) <= 0.5
    ? Math.log1p(relativeDifference)
    : Math.log(value) - Math.log(reference);
}

function selectCustomer(
  unvisited: readonly number[],
  distance: readonly number[],
  pheromone: readonly number[],
  { alpha, beta }: AntSystemParameters,
  random: () => number,
): number {
  function relativeLogWeight(to: number, reference: number): number {
    const logWeight =
      alpha * logRatio(pheromone[to], pheromone[reference]) -
      beta * logRatio(distance[to], distance[reference]);
    if (!Number.isFinite(logWeight)) {
      throw new Error("ALGORITHM_NUMERICAL_ERROR");
    }
    return logWeight;
  }

  // Normalize relative to the strongest candidate before multiplying by the
  // exponents. Large common terms then cannot erase the smaller heuristic.
  const strongest = unvisited.reduce((best, to) =>
    relativeLogWeight(to, best) > 0 ? to : best,
  );
  const weights = unvisited.map((to) =>
    Math.exp(relativeLogWeight(to, strongest)),
  );
  const sum = positiveOrFail(
    weights.reduce((total, weight) => total + weight, 0),
  );
  const threshold = random() * sum;
  let cumulative = 0;
  let lastPositive = -1;
  for (let index = 0; index < weights.length; index++) {
    if (weights[index] === 0) continue;
    lastPositive = index;
    cumulative += weights[index];
    if (cumulative > threshold) return index;
  }
  // Floating-point rounding can put the draw at the very end of the sum.
  return lastPositive;
}

function buildAntTour(
  matrix: DistanceMatrix,
  pheromones: DistanceMatrix,
  parameters: AntSystemParameters,
  random: () => number,
): Tour {
  const route = [0];
  const unvisited = Array.from(
    { length: matrix.length - 1 },
    (_, index) => index + 1,
  );
  while (unvisited.length > 0) {
    const from = route[route.length - 1];
    const selected = selectCustomer(
      unvisited,
      matrix[from],
      pheromones[from],
      parameters,
      random,
    );
    route.push(unvisited.splice(selected, 1)[0]);
  }
  route.push(0);
  return { route, totalDistanceM: directedTourDistance(matrix, route) };
}

/** Run Classical Ant System with fresh pheromones and an explicit PRNG per run. */
export function antSystem(
  matrix: DistanceMatrix,
  parameters: AntSystemParameters,
  randomness: AntSystemRandomness,
): AntSystemResult {
  validateDistanceMatrix(matrix);
  validateParameters(parameters);
  const seed = parseSeed(randomness);

  if (matrix.length === 1) {
    return {
      algorithm: "ACO",
      route: [0, 0],
      totalDistanceM: 0,
      diagnostics: { iterationsCompleted: 0 },
    };
  }
  if (
    matrix.some((row, from) =>
      row.some((cost, to) => from !== to && cost === 0),
    )
  ) {
    throw new Error("ALGORITHM_DISTANCE_DOMAIN_ERROR");
  }

  const random = createSplitMix64(seed);
  let pheromones: DistanceMatrix = matrix.map((row, from) =>
    row.map((_, to) => (from === to ? 0 : parameters.tau0)),
  );
  let best: (Tour & { iteration: number }) | undefined;
  for (let iteration = 1; iteration <= parameters.maxIterations; iteration++) {
    const tours: Tour[] = [];
    for (let ant = 0; ant < parameters.antCount; ant++) {
      const tour = buildAntTour(matrix, pheromones, parameters, random);
      tours.push(tour);
      if (!best || tour.totalDistanceM < best.totalDistanceM) {
        best = { ...tour, iteration };
      }
    }
    pheromones = updateAntSystemPheromones(pheromones, tours, parameters);
  }

  if (!best) throw new Error("ALGORITHM_NUMERICAL_ERROR");
  return {
    algorithm: "ACO",
    route: best.route,
    totalDistanceM: best.totalDistanceM,
    diagnostics: {
      iterationsCompleted: parameters.maxIterations,
      bestIteration: best.iteration,
    },
  };
}
