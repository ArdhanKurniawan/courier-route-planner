import { ZodError } from "zod";
import { assertDepotEnvironment } from "@/config/depot-env";
import { createScenarioRepository } from "@/db/repositories/scenario-repository";
import { createScenarioService } from "@/application/scenarios/scenario-service";
import { ScenarioError, parseScenarioQuery } from "@/lib/validation/scenario";
import { HttpError, errorResponse } from "./request-security";

export function scenarioService() {
  // Reuse the existing application environment/database guard and lazy factory.
  assertDepotEnvironment();
  return createScenarioService(createScenarioRepository());
}
export function scenarioQuery(request: Request) {
  try {
    return parseScenarioQuery(new URL(request.url).searchParams);
  } catch {
    throw new HttpError(400, "INVALID_INPUT", "Invalid query.");
  }
}
export async function runScenarioRequest(operation: () => Promise<Response>) {
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
            "name",
            "depotId",
            "distributionPattern",
            "customerCount",
            "radiusMinM",
            "radiusMaxM",
            "generationSeed",
          ].includes(key)
        )
          (fields[key] ??= []).push(issue.message);
      }
      return errorResponse(
        new HttpError(400, "INVALID_INPUT", "Invalid Scenario input.", fields),
      );
    }
    if (error instanceof ScenarioError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : ["INVALID_DEPOT", "SCENARIO_IN_USE"].includes(error.code)
            ? 409
            : 503;
      return errorResponse(new HttpError(status, error.code, error.message));
    }
    return errorResponse(error);
  }
}
