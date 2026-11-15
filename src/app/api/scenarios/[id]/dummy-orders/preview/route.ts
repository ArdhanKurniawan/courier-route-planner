import { ZodError } from "zod";
import { buildDummyPreview } from "@/application/generator/dummy-dataset";
import { getDummyGeneratorMode } from "@/config/dummy-generator-mode";
import { readDummyPreviewSnapshot } from "@/db/dummy-order-queries";
import { pendingOperation } from "@/db/dummy-operation-ledger";
import { DatabaseTransportError } from "@/db/client";
import {
  CoordinateGenerationError,
  randomCoordinateParameters,
} from "@/domain/generator/random-coordinate-generator";
import { requireAdmin } from "@/lib/security/admin";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  privateJson,
  readJson,
} from "@/lib/http/request-security";
import { parseScenarioId } from "@/lib/validation/scenario";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    if (getDummyGeneratorMode() !== "enabled")
      throw new HttpError(503, "PREVIEW_UNAVAILABLE", "Preview unavailable.");
    const scenarioId = parseScenarioId((await context.params).id);
    const parameters = randomCoordinateParameters.parse(
      await readJson(request, 4096),
    );
    const snapshot = await readDummyPreviewSnapshot(
      scenarioId.toString(),
    ).catch((error: unknown) => {
      if (error instanceof HttpError) throw error;
      throw new DatabaseTransportError();
    });
    if (snapshot.operationPending) throw pendingOperation();
    return privateJson({
      data: buildDummyPreview(snapshot, parameters, snapshot.operationVersion),
    });
  } catch (error) {
    if (error instanceof CoordinateGenerationError)
      return errorResponse(new HttpError(422, error.code, error.message));
    if (error instanceof ZodError)
      return errorResponse(
        new HttpError(
          400,
          "INVALID_INPUT",
          "Invalid preview parameters or Scenario ID.",
        ),
      );
    return errorResponse(error);
  }
}
