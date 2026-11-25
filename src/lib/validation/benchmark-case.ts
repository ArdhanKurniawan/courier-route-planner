import { z } from "zod";
import { depotId } from "./depot";

export const freezeRequest = z.strictObject({
  scenarioId: depotId,
  requestId: z.uuid().transform((value) => value.toLowerCase()),
  expectedInputHash: z.string().regex(/^[a-f0-9]{64}$/u),
});

export const benchmarkHistoryQuery = z.strictObject({
  after: depotId.optional(),
  limit: z
    .string()
    .regex(/^(?:[1-9]\d?|100)$/u)
    .optional()
    .transform((value) => Number(value ?? "50")),
});

export type FreezeRequest = z.output<typeof freezeRequest>;
export type BenchmarkHistoryQuery = z.output<typeof benchmarkHistoryQuery>;

export type BenchmarkCaseSummary = Readonly<{
  id: string;
  scenarioId: string;
  scenarioName: string;
  actualOrderCount: number;
  pointCount: number;
  inputHash: string;
  frozenAt: string;
}>;

export type BenchmarkHistoryPage = {
  data: BenchmarkCaseSummary[];
  nextCursor: string | null;
};
