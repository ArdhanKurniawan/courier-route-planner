import { z } from "zod";

const maximumId = BigInt("9223372036854775807");
export const depotId = z
  .string()
  .max(19)
  .refine(
    (value) =>
      value.length <= 19 &&
      /^[1-9]\d*$/u.test(value) &&
      BigInt(value) <= maximumId,
  );
const fields = {
  name: z.string().trim().min(1).max(255),
  address: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  isActive: z.boolean(),
};
const createInput = z.strictObject({
  ...fields,
  isActive: fields.isActive.default(true),
});
const updateInput = z.strictObject(fields);
export type DepotInput = z.infer<typeof updateInput>;
export type DepotListQuery = { after?: bigint; limit: number };
export const depotRow = z.strictObject({
  id: z.bigint().min(BigInt(1)).max(maximumId),
  name: z.string(),
  address: z.string().nullable(),
  latitude: fields.latitude,
  longitude: fields.longitude,
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type DepotDTO = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
type DepotErrorCode =
  "NOT_FOUND" | "DEPOT_IN_USE" | "UNAVAILABLE" | "MUTATION_OUTCOME_UNKNOWN";
export class DepotError extends Error {
  constructor(readonly code: DepotErrorCode) {
    super(
      {
        NOT_FOUND: "Depot not found.",
        DEPOT_IN_USE: "Depot is referenced.",
        UNAVAILABLE: "Depot unavailable.",
        MUTATION_OUTCOME_UNKNOWN:
          "Mutation outcome unknown. Refresh the list before another attempt.",
      }[code],
    );
    this.name = "DepotError";
  }
}
export function parseDepotId(raw: unknown): bigint {
  return BigInt(depotId.parse(raw));
}
export function parseDepotInput(raw: unknown, edit = false): DepotInput {
  return (edit ? updateInput : createInput).parse(raw);
}
export function parseDepotQuery(params: URLSearchParams): DepotListQuery {
  for (const key of params.keys())
    if (!["after", "limit"].includes(key) || params.getAll(key).length !== 1)
      throw new Error("Invalid query.");
  const rawLimit = params.get("limit");
  if (rawLimit !== null && !/^(?:[1-9]\d?|100)$/u.test(rawLimit))
    throw new Error("Invalid page size.");
  return {
    limit: rawLimit === null ? 50 : Number(rawLimit),
    ...(params.has("after")
      ? { after: parseDepotId(params.get("after")) }
      : {}),
  };
}
export function serializeDepot(raw: unknown): DepotDTO {
  const row = depotRow.parse(raw);
  return {
    ...row,
    id: row.id.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
