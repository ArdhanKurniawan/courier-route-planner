import { AppEnvValidationError, parseAppEnv } from "@/config/env";

export function GET(): Response {
  try {
    parseAppEnv(process.env.APP_ENV);
  } catch (error) {
    if (error instanceof AppEnvValidationError) {
      return Response.json(
        { status: "error" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }

  return Response.json(
    { status: "ok" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

