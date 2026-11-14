import { requireAdmin } from "@/lib/security/admin";
import {
  assertSameOrigin,
  readJson,
  privateJson,
} from "@/lib/http/request-security";
import {
  depotQuery,
  depotService,
  runDepotRequest,
} from "@/lib/http/depot-api";
import { parseDepotInput } from "@/lib/validation/depot";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return runDepotRequest(async () => {
    await requireAdmin();
    const query = depotQuery(request);
    return privateJson(await depotService().listDepots(query));
  });
}
export async function POST(request: Request) {
  return runDepotRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const input = parseDepotInput(await readJson(request, 16384));
    return privateJson({ data: await depotService().createDepot(input) }, 201);
  });
}
