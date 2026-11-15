import "server-only";

export function getDummyGeneratorMode(
  env: Record<string, string | undefined> = process.env,
): "disabled" | "recovery" | "enabled" {
  const { APP_ENV, VERCEL, VERCEL_ENV, VERCEL_TARGET_ENV } = env;
  const production =
    APP_ENV === "production" ||
    VERCEL_ENV === "production" ||
    VERCEL_TARGET_ENV === "production";
  if (!production) return "enabled";

  if (
    APP_ENV !== "production" ||
    VERCEL !== "1" ||
    VERCEL_ENV !== "production" ||
    (VERCEL_TARGET_ENV !== undefined && VERCEL_TARGET_ENV !== "production")
  ) {
    return "disabled";
  }

  const mode = env.DUMMY_GENERATOR_PRODUCTION_MODE;
  return mode === "enabled" || mode === "recovery" ? mode : "disabled";
}
