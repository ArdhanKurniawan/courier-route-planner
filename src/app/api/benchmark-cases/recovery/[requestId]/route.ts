import {
  benchmarkCaseService,
  benchmarkQuery,
  runBenchmarkRequest,
} from "@/lib/http/benchmark-case-api";
import { privateJson } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import { freezeRequest } from "@/lib/validation/benchmark-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recoveryQuery = freezeRequest.omit({ requestId: true });

export function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  return runBenchmarkRequest(async () => {
    await requireAdmin();
    const query = recoveryQuery.parse(benchmarkQuery(request));
    const input = freezeRequest.parse({
      ...query,
      requestId: (await context.params).requestId,
    });
    return privateJson({ data: await benchmarkCaseService().recover(input) });
  });
}
