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
const benchmarkCaseAcceptance =
  process.env.RUN_BENCHMARK_CASE_ACCEPTANCE === "1";
if (
  process.env.BENCHMARK_CASE_TARGETED_ACCEPTANCE_RUN !== undefined &&
  !benchmarkCaseAcceptance
)
  throw new Error("Targeted Benchmark Case acceptance requires explicit opt-in.");
if (
  benchmarkCaseAcceptance &&
  process.env.ORDER_INTEGRATION_RECONCILE_RUN !== undefined
)
  throw new Error(
    "Benchmark acceptance and Order reconciliation require separate runs.",
  );

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
    include: benchmarkCaseAcceptance
      ? ["tests/integration/benchmark-case-persistence.integration.test.ts"]
      : process.env.ORDER_INTEGRATION_RECONCILE_RUN === undefined
        ? ["tests/integration/**/*.integration.test.ts"]
        : ["tests/integration/order-crud.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
