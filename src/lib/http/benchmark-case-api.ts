import { ZodError } from "zod";
import {
  BenchmarkCaseError,
  createBenchmarkCaseService,
} from "@/application/benchmark-cases/benchmark-case-service";
import { createBenchmarkCaseRepository } from "@/db/repositories/benchmark-case-repository";
import { assertSameOrigin, errorResponse, HttpError } from "./request-security";

export function benchmarkCaseService() {
  return createBenchmarkCaseService(createBenchmarkCaseRepository());
}

export function benchmarkQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some((key) => params.getAll(key).length !== 1))
    throw new HttpError(400, "INVALID_INPUT", "Invalid Benchmark Case query.");
  return Object.fromEntries(params);
}

export function assertBenchmarkFreezeOrigin(request: Request, origin: string) {
  assertSameOrigin(request, origin);
  const expected = new URL(origin);
  if (
    request.headers.get("host")?.toLowerCase() !== expected.host ||
    new URL(request.url).protocol !== expected.protocol
  )
    throw new HttpError(403, "FORBIDDEN", "Request origin denied.");
}

const errors = {
  NOT_FOUND: [404, "Scenario or Benchmark Case not found."],
  SOURCE_INVALID: [422, "Source data is not eligible for freeze."],
  SOURCE_INCOMPLETE: [
    409,
    "Source could not be read completely. Refresh preview.",
  ],
  SOURCE_CHANGED: [409, "Source changed. Refresh preview."],
  DUMMY_OPERATION_PENDING: [
    409,
    "Resolve the active dummy order operation first.",
  ],
  FREEZE_REQUEST_CONFLICT: [409, "Freeze request ID is already in use."],
  COMMIT_UNKNOWN: [503, "Commit outcome is unknown. Use read-only recovery."],
  ROLLBACK_UNKNOWN: [
    503,
    "Rollback outcome is unknown. Use read-only recovery.",
  ],
  CORRUPT_BENCHMARK_CASE: [503, "Benchmark Case could not be verified."],
  UNAVAILABLE: [503, "Benchmark Case service unavailable."],
} as const;

export async function runBenchmarkRequest(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ZodError)
      return errorResponse(
        new HttpError(400, "INVALID_INPUT", "Invalid Benchmark Case input."),
      );
    if (error instanceof BenchmarkCaseError) {
      const [status, message] = errors[error.code];
      return errorResponse(new HttpError(status, error.code, message));
    }
    return errorResponse(error);
  }
}
