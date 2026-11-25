import {
  assertBenchmarkFreezeOrigin,
  benchmarkCaseService,
  benchmarkQuery,
  runBenchmarkRequest,
} from "@/lib/http/benchmark-case-api";
import { privateJson, readJson } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import {
  benchmarkHistoryQuery,
  freezeRequest,
} from "@/lib/validation/benchmark-case";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export function GET(request: Request) {
  return runBenchmarkRequest(async () => {
    await requireAdmin();
    const query = benchmarkHistoryQuery.parse(benchmarkQuery(request));
    return privateJson(await benchmarkCaseService().list(query));
  });
}

export function POST(request: Request) {
  return runBenchmarkRequest(async () => {
    const { origin } = await requireAdmin();
    assertBenchmarkFreezeOrigin(request, origin);
    const input = freezeRequest.parse(await readJson(request, 4096));
    return privateJson(
      { data: await benchmarkCaseService().freeze(input) },
      201,
    );
  });
}
