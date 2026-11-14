import { z } from "zod";
import { depotId, parseDepotId, parseDepotQuery } from "./depot";

const minimumBigint = -BigInt("9223372036854775808");
const maximumBigint = BigInt("9223372036854775807");
const integer = z.number().int().min(0).max(2147483647);
export const distributionPatterns = [
  "random",
  "clustered",
  "circular",
  "directional",
] as const;
const pattern = z.enum(distributionPatterns);
export const scenarioSeed = z
  .string()
  .max(20)
  .refine(
    (value) =>
      /^(?:0|-?[1-9]\d*)$/u.test(value) &&
      BigInt(value) >= minimumBigint &&
      BigInt(value) <= maximumBigint,
  );
const radiiValid = (value: {
  radiusMinM: number | null;
  radiusMaxM: number | null;
}) =>
  value.radiusMinM === null ||
  value.radiusMaxM === null ||
  value.radiusMinM <= value.radiusMaxM;
const input = z
  .strictObject({
    depotId,
    name: z.string().trim().min(1).max(255),
    distributionPattern: pattern,
    customerCount: integer,
    radiusMinM: integer.nullable(),
    radiusMaxM: integer.nullable(),
    generationSeed: scenarioSeed.nullable(),
  })
  .refine(radiiValid, {
    path: ["radiusMaxM"],
    message: "Maximum radius must be at least minimum radius.",
  });
export type ScenarioInput = z.infer<typeof input>;
export type ScenarioListQuery = { after?: bigint; limit: number };
export const scenarioRow = z
  .strictObject({
    id: z.bigint().min(BigInt("1")).max(maximumBigint),
    depotId: z.bigint().min(BigInt("1")).max(maximumBigint),
    name: z.string(),
    distributionPattern: pattern,
    customerCount: integer,
    radiusMinM: integer.nullable(),
    radiusMaxM: integer.nullable(),
    generationSeed: z.bigint().min(minimumBigint).max(maximumBigint).nullable(),
    status: z.literal("draft"),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine(radiiValid);
export type ScenarioDTO = Omit<
  z.infer<typeof scenarioRow>,
  "id" | "depotId" | "generationSeed" | "createdAt" | "updatedAt"
> & {
  id: string;
  depotId: string;
  generationSeed: string | null;
  createdAt: string;
  updatedAt: string;
};
type ScenarioErrorCode =
  | "NOT_FOUND"
  | "INVALID_DEPOT"
  | "SCENARIO_IN_USE"
  | "UNAVAILABLE"
  | "MUTATION_OUTCOME_UNKNOWN";
export class ScenarioError extends Error {
  constructor(readonly code: ScenarioErrorCode) {
    super(
      {
        NOT_FOUND: "Scenario not found.",
        INVALID_DEPOT: "The selected depot must exist and be active.",
        SCENARIO_IN_USE: "Scenario is referenced and cannot be deleted.",
        UNAVAILABLE: "Scenario unavailable.",
        MUTATION_OUTCOME_UNKNOWN:
          "Mutation outcome unknown. Refresh the list before another attempt.",
      }[code],
    );
    this.name = "ScenarioError";
  }
}
export const parseScenarioId = parseDepotId;
export const parseScenarioQuery = parseDepotQuery;
export function parseScenarioInput(raw: unknown): ScenarioInput {
  return input.parse(raw);
}
export function serializeScenario(raw: unknown): ScenarioDTO {
  const row = scenarioRow.parse(raw);
  return {
    ...row,
    id: row.id.toString(),
    depotId: row.depotId.toString(),
    generationSeed: row.generationSeed?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
