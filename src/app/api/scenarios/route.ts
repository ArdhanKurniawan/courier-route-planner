import { requireAdmin } from "@/lib/security/admin";
import {
  assertSameOrigin,
  readJson,
  privateJson,
} from "@/lib/http/request-security";
import {
  scenarioQuery,
  scenarioService,
  runScenarioRequest,
} from "@/lib/http/scenario-api";
import { parseScenarioInput } from "@/lib/validation/scenario";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return runScenarioRequest(async () => {
    await requireAdmin();
    const query = scenarioQuery(request);
    return privateJson(await scenarioService().listScenarios(query));
  });
}
export async function POST(request: Request) {
  return runScenarioRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const input = parseScenarioInput(await readJson(request, 16384));
    return privateJson(
      { data: await scenarioService().createScenario(input) },
      201,
    );
  });
}
