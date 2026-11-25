import {
  benchmarkCaseService,
  runBenchmarkRequest,
} from "@/lib/http/benchmark-case-api";
import { privateJson } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import { depotId } from "@/lib/validation/depot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return runBenchmarkRequest(async () => {
    await requireAdmin();
    const id = depotId.parse((await context.params).id);
    return privateJson({ data: await benchmarkCaseService().detail(id) });
  });
}
