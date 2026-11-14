import {
  readDiagnosticApproval,
  runTidbPreviewDiagnostic,
} from "@/db/tidb-preview-diagnostic";
import {
  assertSameOrigin,
  errorResponse,
  HttpError,
  privateJson,
} from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const approval = readDiagnosticApproval(
    request.headers.get("x-tidb-diagnostic-permit"),
  );
  if (!approval)
    return errorResponse(new HttpError(404, "NOT_FOUND", "Not found."));
  try {
    const { origin } = await requireAdmin();
    assertSameOrigin(request, origin);
    if (new URL(request.url).origin !== origin)
      throw new HttpError(403, "FORBIDDEN", "Request origin denied.");
    await runTidbPreviewDiagnostic(approval);
    return privateJson({ data: { status: "ok" } });
  } catch (error) {
    return errorResponse(error);
  }
}
