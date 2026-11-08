import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getProductionMigrationCredentials } from "../src/config/db-env.ts";
import { runMysqlMigration } from "./migrate-mysql.mjs";

/** @param {{ APP_ENV?: unknown, DATABASE_URL?: unknown }} environment */
export function runProductionMigration(environment) {
  return runMysqlMigration(
    () =>
      getProductionMigrationCredentials(
        environment?.APP_ENV,
        environment?.DATABASE_URL,
      ),
    "Production",
  );
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = await runProductionMigration(process.env);
}
