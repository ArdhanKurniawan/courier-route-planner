import { createHash } from "node:crypto";
import { ZodError } from "zod";
import {
  CoordinateGenerationError,
  generateRandomCoordinates,
  randomCoordinateParameters,
  RANDOM_COORDINATE_VERSION,
} from "@/domain/generator/random-coordinate-generator";
import { requireAdmin } from "@/lib/security/admin";
import { depotService } from "@/lib/http/depot-api";
import { scenarioService } from "@/lib/http/scenario-api";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  privateJson,
  readJson,
} from "@/lib/http/request-security";
import { DepotError } from "@/lib/validation/depot";
import { previewDepot, previewScenario } from "@/lib/validation/dummy-preview";
import { parseScenarioId, ScenarioError } from "@/lib/validation/scenario";

export const runtime = "nodejs";

function invalidDepot() {
  return new HttpError(
    409,
    "INVALID_DEPOT",
    "The Scenario requires an active Depot with valid coordinates.",
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const scenarioId = parseScenarioId((await context.params).id);
    const parameters = randomCoordinateParameters.parse(
      await readJson(request, 4096),
    );

    const currentScenario = await scenarioService().getScenario(scenarioId);
    if (currentScenario.id !== scenarioId.toString())
      throw new Error("Scenario identity mismatch");
    const scenario = previewScenario.safeParse(currentScenario);
    if (!scenario.success)
      throw new HttpError(
        409,
        "INELIGIBLE_SCENARIO",
        "Choose a draft Scenario with the random pattern.",
      );

    const currentDepot = await depotService().getDepot(
      BigInt(scenario.data.depotId),
    );
    if (currentDepot.id !== scenario.data.depotId)
      throw new Error("Depot identity mismatch");
    const depot = previewDepot.safeParse(currentDepot);
    if (!depot.success) throw invalidDepot();

    const version = RANDOM_COORDINATE_VERSION;
    const points = generateRandomCoordinates({
      ...parameters,
      version,
      latitude: depot.data.latitude,
      longitude: depot.data.longitude,
    });
    // Part C must compare this snapshot against locked current metadata and
    // independently detect changes to any existing dummy Orders.
    const revision = createHash("sha256")
      .update(
        JSON.stringify([
          version,
          scenario.data,
          currentScenario.updatedAt,
          depot.data,
          currentDepot.updatedAt,
          parameters,
          points,
        ]),
      )
      .digest("hex");
    return privateJson({
      data: {
        scenario: scenario.data,
        depot: depot.data,
        version,
        parameters,
        points,
        revision,
      },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return errorResponse(
        new HttpError(
          400,
          "INVALID_INPUT",
          "Invalid preview parameters or Scenario ID.",
        ),
      );
    if (error instanceof ScenarioError && error.code === "NOT_FOUND")
      return errorResponse(
        new HttpError(404, "NOT_FOUND", "Scenario not found."),
      );
    if (error instanceof DepotError && error.code === "NOT_FOUND")
      return errorResponse(invalidDepot());
    if (error instanceof CoordinateGenerationError)
      return errorResponse(new HttpError(422, error.code, error.message));
    return errorResponse(error);
  }
}
