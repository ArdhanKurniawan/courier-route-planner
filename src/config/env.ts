export type AppEnv = "development" | "testing" | "production";

export class AppEnvValidationError extends Error {
  constructor() {
    super("APP_ENV must be development, testing, or production.");
    this.name = "AppEnvValidationError";
  }
}

export function parseAppEnv(rawValue: string | undefined): AppEnv {
  if (
    rawValue === "development" ||
    rawValue === "testing" ||
    rawValue === "production"
  ) {
    return rawValue;
  }

  throw new AppEnvValidationError();
}

