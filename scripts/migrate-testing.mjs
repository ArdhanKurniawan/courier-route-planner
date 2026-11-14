import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getTestingMigrationCredentials } from "../src/config/db-env.ts";
import { runMysqlMigration } from "./migrate-mysql.mjs";

/** @param {{ APP_ENV?: unknown, DATABASE_URL?: unknown }} environment */
export function runTestingMigration(environment) {
  return runMysqlMigration(
    () =>
      getTestingMigrationCredentials(
        environment?.APP_ENV,
        environment?.DATABASE_URL,
      ),
    "Testing",
  );
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = await runTestingMigration(process.env);
}
