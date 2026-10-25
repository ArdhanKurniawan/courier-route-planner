import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import { parseDatabaseConfig } from "./src/config/db-env";

export function assertIntegrationTarget(
  env: Record<string, string | undefined>,
) {
  try {
    if (
      env.RUN_DB_INTEGRATION !== "1" ||
      env.APP_ENV !== "testing" ||
      env.VERCEL === "1" ||
      env.VERCEL_ENV !== undefined
    )
      throw new Error();
    const parsed = parseDatabaseConfig(env.DATABASE_URL);
    if (
      decodeURIComponent(new URL(parsed.url).pathname.slice(1)) !==
      "courier_route_planner_testing"
    )
      throw new Error();
  } catch {
    throw new Error("Integration requires explicit Testing authorization.");
  }
}
// Deliberately fail before test collection; this command is never part of ordinary CI.
assertIntegrationTarget(process.env);
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/fixtures/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
