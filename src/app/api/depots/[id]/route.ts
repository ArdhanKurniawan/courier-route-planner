import { z } from "zod";
import { requireAdmin } from "@/lib/security/admin";
import {
  assertSameOrigin,
  readJson,
  privateJson,
} from "@/lib/http/request-security";
import { depotService, runDepotRequest } from "@/lib/http/depot-api";
import { parseDepotId, parseDepotInput } from "@/lib/validation/depot";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return runDepotRequest(async () => {
    await requireAdmin();
    const id = parseDepotId((await context.params).id);
    return privateJson({ data: await depotService().getDepot(id) });
  });
}
export async function PUT(request: Request, context: Context) {
  return runDepotRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const id = parseDepotId((await context.params).id),
      input = parseDepotInput(await readJson(request, 16384), true);
    return privateJson({ data: await depotService().updateDepot(id, input) });
  });
}
export async function DELETE(request: Request, context: Context) {
  return runDepotRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const id = parseDepotId((await context.params).id);
    z.strictObject({}).parse(await readJson(request, 16384));
    await depotService().deleteDepot(id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  });
}
