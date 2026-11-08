import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getDevMigrationCredentials } from "../src/config/db-env.ts";
import { runMysqlMigration } from "./migrate-mysql.mjs";

/** @param {{ APP_ENV?: unknown, DATABASE_URL?: unknown }} environment */
export function runDevelopmentMigration(environment) {
  return runMysqlMigration(
    () =>
      getDevMigrationCredentials(
        environment?.APP_ENV,
        environment?.DATABASE_URL,
      ),
    "Development",
  );
}

// Importing this module (including offline tests) never opens a connection.
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = await runDevelopmentMigration(process.env);
}
