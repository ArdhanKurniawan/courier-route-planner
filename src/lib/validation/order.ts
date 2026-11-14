import { z } from "zod";
import { parseDepotId, parseDepotQuery } from "./depot";

const maximumId = BigInt("9223372036854775807");
const id = z.bigint().min(BigInt("1")).max(maximumId);
const codeValid = (value: string) =>
  Array.from(value).length >= 1 &&
  Array.from(value).length <= 64 &&
  !/[\p{Cc}\p{Cs}]/u.test(value);
const code = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(codeValid);
const fields = {
  orderCode: code,
  customerName: z.string().trim().min(1).max(255),
  address: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
};
const input = z.strictObject(fields);
export type OrderInput = z.infer<typeof input>;
export type OrderListQuery = { after?: bigint; limit: number };
export const orderRow = z.strictObject({
  id,
  scenarioId: id,
  orderCode: z
    .string()
    .refine(
      (value) =>
        codeValid(value) &&
        value === value.trim() &&
        value === value.toUpperCase(),
    ),
  customerName: z.string().min(1).max(255),
  address: z.string().max(2000).nullable(),
  latitude: fields.latitude,
  longitude: fields.longitude,
  source: z.enum(["manual", "dummy"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type OrderRow = z.infer<typeof orderRow>;
export type OrderDTO = Omit<
  OrderRow,
  "id" | "scenarioId" | "createdAt" | "updatedAt"
> & {
  id: string;
  scenarioId: string;
  createdAt: string;
  updatedAt: string;
};
export class OrderError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "ORDER_CODE_CONFLICT"
      | "UNAVAILABLE"
      | "MUTATION_OUTCOME_UNKNOWN",
  ) {
    super(
      {
        NOT_FOUND: "Order or Scenario not found.",
        ORDER_CODE_CONFLICT: "Order code already exists in this Scenario.",
        UNAVAILABLE: "Order unavailable.",
        MUTATION_OUTCOME_UNKNOWN:
          "Mutation outcome unknown. Refresh before another attempt.",
      }[code],
    );
    this.name = "OrderError";
  }
}
export const parseOrderId = parseDepotId;
export const parseOrderQuery = parseDepotQuery;
export const parseOrderInput = (raw: unknown): OrderInput => input.parse(raw);
export function serializeOrder(raw: unknown): OrderDTO {
  const row = orderRow.parse(raw);
  return {
    ...row,
    id: row.id.toString(),
    scenarioId: row.scenarioId.toString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
