import { z } from "zod";
import {
  RANDOM_COORDINATE_VERSION,
  randomCoordinateParameters,
} from "@/domain/generator/random-coordinate-generator";
import { depotId } from "./depot";
import { scenarioSeed } from "./scenario";

const safeCount = z.number().int().min(0).max(2147483647);
export const MAX_DUMMY_ORDERS = 100;
const replacementCount = z.int().min(0).max(MAX_DUMMY_ORDERS);
const revision = z.string().regex(/^[a-f0-9]{64}$/u);
export const dummyOperationId = z
  .uuidv4()
  .refine((id) => id === id.toLowerCase());
export const dummyOperationVersion = z.union([z.literal("0"), depotId]);
export const previewScenario = z.object({
  id: depotId,
  depotId,
  name: z.string().min(1),
  distributionPattern: z.literal("random"),
  status: z.literal("draft"),
});

export const previewScenarioOption = z.object({
  ...previewScenario.shape,
  distributionPattern: z.string(),
  status: z.string(),
  customerCount: safeCount,
  radiusMinM: safeCount.nullable(),
  radiusMaxM: safeCount.nullable(),
  generationSeed: scenarioSeed.nullable(),
});

const coordinate = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const previewDepot = coordinate.extend({
  id: depotId,
  name: z.string().min(1),
  isActive: z.literal(true),
});

export const dummyPreview = z
  .object({
    scenario: previewScenario,
    depot: previewDepot,
    version: z.literal(RANDOM_COORDINATE_VERSION),
    parameters: randomCoordinateParameters,
    points: z.array(coordinate).min(1).max(MAX_DUMMY_ORDERS),
    revision,
    dummyCount: replacementCount,
  })
  .refine(
    ({ scenario, depot, points, parameters }) =>
      scenario.depotId === depot.id &&
      points.length === parameters.count &&
      new Set(
        points.map(({ latitude, longitude }) => latitude + "," + longitude),
      ).size === points.length,
  );

export type DummyPreview = z.infer<typeof dummyPreview>;
export type PreviewScenarioOption = z.infer<typeof previewScenarioOption>;
export type PreviewParameters = z.infer<typeof randomCoordinateParameters>;

export const dummySaveInput = z
  .strictObject({
    operationId: dummyOperationId,
    parameters: randomCoordinateParameters,
    revision,
    replaceCount: replacementCount,
    confirmReplace: z.literal(true).optional(),
  })
  .refine(
    ({ replaceCount, confirmReplace }) =>
      replaceCount > 0 === (confirmReplace === true),
  );

export const dummyOperationStatus = z.enum([
  "pending",
  "committed",
  "commit_unknown",
  "rollback_unknown",
  "confirmed",
  "rolled_back",
]);
export const dummyOperationView = z.strictObject({
  operationId: dummyOperationId,
  scenarioId: depotId,
  status: dummyOperationStatus,
  savedCount: replacementCount,
  replacedCount: replacementCount,
});

export type DummySaveInput = z.infer<typeof dummySaveInput>;
export type DummyOperationView = z.infer<typeof dummyOperationView>;
