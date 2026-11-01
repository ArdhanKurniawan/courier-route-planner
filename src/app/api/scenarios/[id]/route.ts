import { z } from "zod";
import { requireAdmin } from "@/lib/security/admin";
import {
  assertSameOrigin,
  readJson,
  privateJson,
} from "@/lib/http/request-security";
import { scenarioService, runScenarioRequest } from "@/lib/http/scenario-api";
import { parseScenarioId, parseScenarioInput } from "@/lib/validation/scenario";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return runScenarioRequest(async () => {
    await requireAdmin();
    const id = parseScenarioId((await context.params).id);
    return privateJson({ data: await scenarioService().getScenario(id) });
  });
}
export async function PUT(request: Request, context: Context) {
  return runScenarioRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const id = parseScenarioId((await context.params).id),
      input = parseScenarioInput(await readJson(request, 16384));
    return privateJson({
      data: await scenarioService().updateScenario(id, input),
    });
  });
}
export async function DELETE(request: Request, context: Context) {
  return runScenarioRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const id = parseScenarioId((await context.params).id);
    z.strictObject({}).parse(await readJson(request, 16384));
    await scenarioService().deleteScenario(id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  });
}
