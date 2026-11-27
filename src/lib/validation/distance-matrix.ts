import { z } from "zod";
import type { DistanceMatrixSnapshot } from "@/domain/distance-matrix";
import { depotId } from "./depot";

export const matrixRequestId = z.uuid().transform((id) => id.toLowerCase());
export const distanceMatrixGenerate = z.strictObject({
  requestId: matrixRequestId,
  expectedInputHash: z.string().regex(/^[a-f0-9]{64}$/u),
});
export const distanceMatrixQuery = z.strictObject({
  after: depotId.optional(),
  limit: z
    .string()
    .regex(/^(?:[1-9]|[1-4]\d|50)$/u)
    .optional()
    .transform((value) => Number(value ?? "20")),
});

export type DistanceMatrixQuery = z.output<typeof distanceMatrixQuery>;
export type StoredDistanceMatrix = DistanceMatrixSnapshot &
  Readonly<{
    id: string;
    benchmarkCaseId: string;
    requestId: string;
  }>;
export type DistanceMatrixSummary = Readonly<{
  id: string;
  benchmarkCaseId: string;
  provider: "osrm";
  profile: string;
  pointCount: number;
  inputHash: string;
  matrixHash: string;
  generatedAt: string;
  zeroPairCount: number;
}>;
export type DistanceMatrixPage = {
  data: DistanceMatrixSummary[];
  nextCursor: string | null;
};
