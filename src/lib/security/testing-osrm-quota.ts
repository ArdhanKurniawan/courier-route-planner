import "server-only";

import { Redis } from "@upstash/redis";
import type { AuthConfig } from "@/config/auth";
import { HttpError } from "@/lib/http/request-security";

// One pair across all Testing instances using the same Redis, including redeploys.
const testingQuotaKey = "crp:osrm:testing:fossgis";
const cooldownSeconds = 60;
const reservationBudgetMs = 1_000;
const dispatchBudgetMs = 25_000;

export async function reserveTestingOsrm(
  config: Pick<AuthConfig, "redisUrl" | "redisToken">,
  callerSignal: AbortSignal,
): Promise<typeof fetch> {
  const start = performance.now();
  const dispatchDeadline = start + dispatchBudgetMs;
  const reservationSignal = AbortSignal.any([
    callerSignal,
    AbortSignal.timeout(reservationBudgetMs),
  ]);
  let reservation: unknown;
  try {
    reservationSignal.throwIfAborted();
    const redis = new Redis({
      url: config.redisUrl,
      token: config.redisToken,
      retry: { retries: 0 },
      signal: reservationSignal,
    });
    reservation = await redis.set(testingQuotaKey, "reserved", {
      nx: true,
      ex: cooldownSeconds,
    });
    reservationSignal.throwIfAborted();
    if (
      (reservation !== "OK" && reservation !== null) ||
      performance.now() - start >= reservationBudgetMs
    ) throw new Error("Unusable OSRM reservation.");
  } catch {
    throw new HttpError(503, "OSRM_UNAVAILABLE", "OSRM quota unavailable.");
  }
  if (reservation === null)
    throw new HttpError(429, "OSRM_BUSY", "OSRM demo is busy.");

  // The Redis key expires on its own even after cancellation or provider failure.
  // A delayed invocation cannot start a provider request beyond its budget.
  return async (input, init) => {
    callerSignal.throwIfAborted();
    if (performance.now() >= dispatchDeadline)
      throw new Error("OSRM dispatch budget expired.");
    return fetch(input, init);
  };
}
