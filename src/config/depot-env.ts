import { DatabaseConfigError, parseDatabaseConfig } from "./db-env";

export function assertDepotEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  const hosted = env.VERCEL === "1" || env.VERCEL_ENV !== undefined;
  const expected = hosted
    ? (
        { preview: "testing", production: "production" } as Record<
          string,
          string
        >
      )[env.VERCEL_ENV ?? ""]
    : "development";
  const databases: Record<string, string> = {
    development: "courier_route_planner_dev",
    testing: "courier_route_planner_testing",
    production: "courier_route_planner_production",
  };
  if (!expected || env.APP_ENV !== expected) throw new DatabaseConfigError();
  const parsed = parseDatabaseConfig(env.DATABASE_URL);
  if (
    decodeURIComponent(new URL(parsed.url).pathname.slice(1)) !==
    databases[expected]
  )
    throw new DatabaseConfigError();
}
