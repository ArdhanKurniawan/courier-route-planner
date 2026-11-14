import { ZodError } from "zod";
import { assertDepotEnvironment } from "@/config/depot-env";
import { createOrderRepository } from "@/db/repositories/order-repository";
import { createOrderService } from "@/application/orders/order-service";
import { OrderError, parseOrderQuery } from "@/lib/validation/order";
import { HttpError, errorResponse } from "./request-security";
export type OrderContext = {
  params: Promise<{ id: string; orderId?: string }>;
};
export function orderService() {
  assertDepotEnvironment();
  return createOrderService(createOrderRepository());
}
export function orderQuery(request: Request) {
  try {
    return parseOrderQuery(new URL(request.url).searchParams);
  } catch {
    throw new HttpError(400, "INVALID_INPUT", "Invalid query.");
  }
}
export async function runOrderRequest(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path[0];
        if (
          typeof key === "string" &&
          [
            "orderCode",
            "customerName",
            "address",
            "latitude",
            "longitude",
          ].includes(key)
        )
          (fields[key] ??= []).push("Invalid value.");
      }
      return errorResponse(
        new HttpError(400, "INVALID_INPUT", "Invalid Order input.", fields),
      );
    }
    if (error instanceof OrderError)
      return errorResponse(
        new HttpError(
          error.code === "NOT_FOUND"
            ? 404
            : error.code === "ORDER_CODE_CONFLICT"
              ? 409
              : 503,
          error.code,
          error.message,
        ),
      );
    return errorResponse(error);
  }
}
