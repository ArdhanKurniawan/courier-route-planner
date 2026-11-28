import "server-only";

import { z } from "zod";
import {
  distanceMatrixPointLimit,
  matrixProviderEndpoints,
  type MatrixProviderId,
} from "@/domain/distance-matrix";
import type { MatrixQuotaLimits } from "@/lib/security/distance-matrix-quota";

export type MatrixOsrmConfig = Readonly<{
  baseUrl: string;
  profile: string;
  maxPoints: number;
  snapRadiusM: number;
  softwareVersion: string | null;
  networkExtract: string | null;
  codeRevision: string | null;
}>;

export type MatrixProviderConfig = MatrixOsrmConfig & Readonly<{
  id: MatrixProviderId;
  apiKey: string;
  quota: MatrixQuotaLimits;
}>;

type Environment = Record<string, string | undefined>;
const daySeconds = 86_400;
// A rolling 31-day application cap is conservative for a calendar quota.
const monthSeconds = 31 * daySeconds;
const positiveInt = z.string().regex(/^[1-9]\d{0,5}$/u).transform(Number);
const radius = z.string().regex(/^\d+(?:\.\d+)?$/u).transform(Number)
  .pipe(z.number().finite().positive());
const key = z.string().regex(/^[\x21-\x7e]{1,512}$/u);
const version = z.string().regex(/^v?\d+\.\d+\.\d+(?:[-+][a-z0-9.-]{1,48})?$/iu);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);

function providerConfig(
  env: Environment,
  id: MatrixProviderId,
  prefix: string,
  snapRadiusM: number,
  quota: MatrixQuotaLimits,
): MatrixProviderConfig | null {
  // The operator sets VERIFIED only for the approved account, region, limits,
  // exact Table request/snapping contract, and storage and attribution terms.
  if (env[prefix + "_VERIFIED"] !== "1") return null;
  const settings = z.object({
    apiKey: key,
    maxPoints: positiveInt.pipe(z.number().int().min(2).max(distanceMatrixPointLimit)),
    softwareVersion: version.optional(),
    networkExtract: sha256.optional(),
  }).safeParse({
    apiKey: env[prefix + "_API_KEY"],
    maxPoints: env[prefix + "_MAX_POINTS"],
    softwareVersion: env[prefix + "_SOFTWARE_VERSION"],
    networkExtract: env[prefix + "_EXTRACT_SHA256"],
  });
  if (!settings.success) return null;
  const { apiKey, maxPoints, softwareVersion, networkExtract } = settings.data;
  const revision = env.VERCEL_GIT_COMMIT_SHA ?? "";
  return {
    id,
    apiKey,
    quota,
    baseUrl: matrixProviderEndpoints[id],
    profile: "driving",
    maxPoints,
    snapRadiusM,
    softwareVersion: softwareVersion ?? null,
    networkExtract: networkExtract ? "sha256:" + networkExtract : null,
    codeRevision: /^[0-9a-f]{40}$/u.test(revision) ? revision : null,
  };
}

function osrmPlusQuota(env: Environment): MatrixQuotaLimits | null {
  const limits = z.object({
    requestsPerDay: positiveInt.pipe(z.number().max(1_000)),
    requestsPerMinute: positiveInt.pipe(z.number().max(1_000)),
    requestsPerSecond: positiveInt.pipe(z.number().max(1_000)),
  }).safeParse({
    requestsPerDay: env.DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_DAY,
    requestsPerMinute: env.DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_MINUTE,
    requestsPerSecond: env.DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_SECOND,
  });
  if (!limits.success) return null;
  const { requestsPerDay, requestsPerMinute, requestsPerSecond } = limits.data;
  if (requestsPerSecond > requestsPerMinute || requestsPerMinute > requestsPerDay) return null;
  return {
    ...limits.data,
    requests: 1_000,
    requestWindowSeconds: monthSeconds,
    elements: 50_000,
    elementWindowSeconds: monthSeconds,
  };
}

export function getMatrixProviderConfigs(
  env: Environment = process.env,
): readonly MatrixProviderConfig[] {
  if (
    env.DISTANCE_MATRIX_GENERATION !== "1" ||
    env.APP_ENV !== "testing" || env.NODE_ENV !== "production" ||
    env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" ||
    env.VERCEL_TARGET_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== "testing"
  )
    return [];
  const snapRadius = radius.safeParse(env.DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M);
  if (!snapRadius.success) return [];
  const primary = providerConfig(
    env, "just-routing", "DISTANCE_MATRIX_JUST_ROUTING", snapRadius.data,
    { requests: 100, requestWindowSeconds: daySeconds, requestsPerSecond: 5 },
  );
  const quota = osrmPlusQuota(env);
  const secondary = quota && providerConfig(
    env, "osrm-plus", "DISTANCE_MATRIX_OSRM_PLUS", snapRadius.data, quota,
  );
  return [primary, secondary].filter((config) => config !== null);
}
