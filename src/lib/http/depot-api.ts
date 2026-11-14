import { ZodError } from "zod";
import { assertDepotEnvironment } from "@/config/depot-env";
import { createDepotRepository } from "@/db/repositories/depot-repository";
import { createDepotService } from "@/application/depots/depot-service";
import { DepotError, parseDepotQuery } from "@/lib/validation/depot";
import { HttpError, errorResponse } from "./request-security";

export function depotService() {
  assertDepotEnvironment();
  return createDepotService(createDepotRepository());
}
export function depotQuery(request: Request) {
  try {
    return parseDepotQuery(new URL(request.url).searchParams);
  } catch {
    throw new HttpError(400, "INVALID_INPUT", "Invalid query.");
  }
}
export async function runDepotRequest(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path[0];
        if (
          typeof key === "string" &&
          ["name", "address", "latitude", "longitude", "isActive"].includes(key)
        )
          (fields[key] ??= []).push(issue.message);
      }
      return errorResponse(
        new HttpError(400, "INVALID_INPUT", "Invalid Depot input.", fields),
      );
    }
    if (error instanceof DepotError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "DEPOT_IN_USE"
            ? 409
            : 503;
      return errorResponse(new HttpError(status, error.code, error.message));
    }
    return errorResponse(error);
  }
}
