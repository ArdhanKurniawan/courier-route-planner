import { z } from "zod";
import { DistanceMatrixError } from "@/application/distance-matrices/distance-matrix-service";
import {
  assertBenchmarkFreezeOrigin,
  benchmarkQuery,
} from "@/lib/http/benchmark-case-api";
import {
  distanceMatrixService,
  runDistanceMatrixRequest,
} from "@/lib/http/distance-matrix-api";
import { privateJson, readJson } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import { depotId } from "@/lib/validation/depot";
import {
  distanceMatrixGenerate,
  distanceMatrixQuery,
  matrixRequestId,
} from "@/lib/validation/distance-matrix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };
const recoveryQuery = z.strictObject({ requestId: matrixRequestId });

export function GET(request: Request, context: Context) {
  return runDistanceMatrixRequest(async () => {
    await requireAdmin();
    const id = depotId.parse((await context.params).id);
    const params = benchmarkQuery(request);
    if (Object.hasOwn(params, "requestId")) {
      const { requestId } = recoveryQuery.parse(params);
      return privateJson({
        data: await distanceMatrixService().recover(id, requestId),
      });
    }
    const query = distanceMatrixQuery.parse(params);
    return privateJson(await distanceMatrixService().list(id, query));
  });
}

export function POST(request: Request, context: Context) {
  return runDistanceMatrixRequest(async () => {
    const { origin } = await requireAdmin();
    assertBenchmarkFreezeOrigin(request, origin);
    const id = depotId.parse((await context.params).id);
    const input = distanceMatrixGenerate.parse(await readJson(request, 4096));
    try {
      const service = distanceMatrixService();
      const args = [
        id,
        input.requestId,
        input.expectedInputHash,
        request.signal,
      ] as const;
      const snapshot = input.selection
        ? await service.generate(...args, input.selection)
        : await service.generate(...args);
      return privateJson({ data: snapshot }, 201);
    } catch (error) {
      console.warn("distance_matrix_generation_failed", {
        benchmarkCaseId: id,
        requestId: input.requestId,
        code: error instanceof DistanceMatrixError ? error.code : "UNAVAILABLE",
      });
      throw error;
    }
  });
}
