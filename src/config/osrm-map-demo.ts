import "server-only";
import { depotId } from "@/lib/validation/depot";

type Environment = Record<string, string | undefined>;

function isLocalMapDevelopment(env: Environment): boolean {
  if (
    env.NODE_ENV !== "development" ||
    env.APP_ENV !== "development" || env.VERCEL !== undefined ||
    env.VERCEL_ENV !== undefined || env.VERCEL_TARGET_ENV !== undefined
  ) return false;

  const origin = URL.parse(env.AUTH_ORIGIN ?? "");
  return origin !== null &&
    origin.origin === env.AUTH_ORIGIN &&
    (origin.protocol === "http:" || origin.protocol === "https:") &&
    (origin.hostname === "localhost" || origin.hostname === "127.0.0.1");
}

export function isLocalOsrmDemoEnabled(env: Environment = process.env): boolean {
  return env.OSRM_MAP_DEMO === "1" && isLocalMapDevelopment(env);
}

export function isTestingOsrmEnabled(env: Environment = process.env): boolean {
  if (
    env.OSRM_MAP_TESTING !== "1" || env.NODE_ENV !== "production" ||
    env.APP_ENV !== "testing" || env.VERCEL !== "1" ||
    env.VERCEL_ENV !== "preview" || env.VERCEL_TARGET_ENV !== "preview" ||
    env.VERCEL_GIT_COMMIT_REF !== "testing"
  ) return false;

  const origin = URL.parse(env.AUTH_ORIGIN ?? "");
  return origin?.protocol === "https:" && origin.origin === env.AUTH_ORIGIN;
}

export function readTestingOsrmScenarioAllowlist(
  env: Environment = process.env,
): ReadonlyMap<string, string> {
  const allowlist = new Map<string, string>();
  const configured = env.OSRM_TESTING_SCENARIO_ALLOWLIST?.trim();
  if (!configured || !isTestingOsrmEnabled(env)) return allowlist;

  for (const item of configured.split(",")) {
    const entry = /^([1-9]\d{0,18}):([a-f0-9]{64})$/u.exec(item.trim());
    if (!entry || !depotId.safeParse(entry[1]).success || allowlist.has(entry[1]))
      return new Map();
    allowlist.set(entry[1], entry[2]);
  }
  return allowlist;
}

export function isLocalMapScenarioEnabled(env: Environment = process.env): boolean {
  return env.MAP_LOCAL_SCENARIO_DEMO === "1" && isLocalMapDevelopment(env);
}
