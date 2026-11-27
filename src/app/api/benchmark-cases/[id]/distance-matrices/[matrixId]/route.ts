import {
  distanceMatrixService,
  runDistanceMatrixRequest,
} from "@/lib/http/distance-matrix-api";
import { privateJson } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import { depotId } from "@/lib/validation/depot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(
  _request: Request,
  context: { params: Promise<{ id: string; matrixId: string }> },
) {
  return runDistanceMatrixRequest(async () => {
    await requireAdmin();
    const { id, matrixId } = await context.params;
    const caseId = depotId.parse(id);
    const key = depotId.parse(matrixId);
    return privateJson({
      data: await distanceMatrixService().detail(caseId, key),
    });
  });
}
