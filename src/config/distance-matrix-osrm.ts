import "server-only";

import { z } from "zod";
import { distanceMatrixPointLimit } from "@/domain/distance-matrix";

const settings = z.object({
  DISTANCE_MATRIX_OSRM_URL: z.string().max(255),
  DISTANCE_MATRIX_OSRM_PROFILE: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,31}$/u),
  DISTANCE_MATRIX_OSRM_MAX_POINTS: z
    .string()
    .regex(/^[1-9]\d?$/u)
    .transform(Number)
    .pipe(z.number().int().min(2).max(distanceMatrixPointLimit)),
  DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/u)
    .transform(Number)
    .pipe(z.number().finite().positive()),
  DISTANCE_MATRIX_OSRM_SOFTWARE_VERSION: z
    .string()
    .regex(/^v?\d+\.\d+\.\d+(?:[-+][a-z0-9.-]{1,48})?$/iu)
    .optional(),
  DISTANCE_MATRIX_OSRM_EXTRACT_SHA256: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .optional(),
});

export type MatrixOsrmConfig = Readonly<{
  baseUrl: string;
  profile: string;
  maxPoints: number;
  snapRadiusM: number;
  softwareVersion: string | null;
  networkExtract: string | null;
  codeRevision: string | null;
}>;

export function getMatrixOsrmConfig(
  env: Record<string, string | undefined> = process.env,
): MatrixOsrmConfig | null {
  if (
    env.DISTANCE_MATRIX_GENERATION !== "1" ||
    env.APP_ENV === "production" ||
    env.VERCEL_ENV === "production" ||
    env.VERCEL_TARGET_ENV === "production"
  )
    return null;
  const config = settings.safeParse(env);
  if (!config.success) return null;
  const value = config.data;
  const endpoint = URL.parse(value.DISTANCE_MATRIX_OSRM_URL);
  if (
    endpoint?.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !/^[/a-z0-9_-]+$/iu.test(endpoint.pathname) ||
    /(?:^|\.)(?:project-osrm\.org|routing\.openstreetmap\.de)\.?$/iu.test(
      endpoint.hostname,
    )
  )
    return null;
  const revision = env.VERCEL_GIT_COMMIT_SHA ?? "";
  return {
    baseUrl: endpoint.href,
    profile: value.DISTANCE_MATRIX_OSRM_PROFILE,
    maxPoints: value.DISTANCE_MATRIX_OSRM_MAX_POINTS,
    snapRadiusM: value.DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M,
    softwareVersion: value.DISTANCE_MATRIX_OSRM_SOFTWARE_VERSION ?? null,
    networkExtract: value.DISTANCE_MATRIX_OSRM_EXTRACT_SHA256
      ? "sha256:" + value.DISTANCE_MATRIX_OSRM_EXTRACT_SHA256
      : null,
    codeRevision: /^[0-9a-f]{40}$/u.test(revision) ? revision : null,
  };
}
