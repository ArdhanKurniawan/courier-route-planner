import { z, ZodError } from "zod";
import { CoordinateGenerationError } from "@/domain/generator/random-coordinate-generator";
import {
  getActiveDummyOperation,
  reconcileDummyOperation,
  saveDummyOrders,
} from "@/db/dummy-order-writer";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  privateJson,
  readJson,
} from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import {
  dummyOperationId,
  dummySaveInput,
} from "@/lib/validation/dummy-preview";
import { parseScenarioId } from "@/lib/validation/scenario";

export const runtime = "nodejs";
export const maxDuration = 30;
type Context = { params: Promise<{ id: string }> };
const reconcileInput = z.strictObject({ operationId: dummyOperationId });

async function operationResponse(action: () => Promise<unknown>) {
  try {
    return privateJson({ data: await action() });
  } catch (error) {
    if (error instanceof ZodError)
      return errorResponse(
        new HttpError(
          400,
          "INVALID_INPUT",
          "Invalid dummy operation parameters or Scenario ID.",
        ),
      );
    if (error instanceof CoordinateGenerationError)
      return errorResponse(new HttpError(422, error.code, error.message));
    return errorResponse(error);
  }
}

async function scopedId(context: Context) {
  return parseScenarioId((await context.params).id).toString();
}

export function GET(_request: Request, context: Context) {
  return operationResponse(async () => {
    await requireAdmin();
    return getActiveDummyOperation(await scopedId(context));
  });
}

export function POST(request: Request, context: Context) {
  return operationResponse(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const id = await scopedId(context);
    return saveDummyOrders(
      id,
      dummySaveInput.parse(await readJson(request, 4096)),
    );
  });
}

export function PATCH(request: Request, context: Context) {
  return operationResponse(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const id = await scopedId(context);
    const { operationId } = reconcileInput.parse(await readJson(request, 4096));
    return reconcileDummyOperation(id, operationId);
  });
}
