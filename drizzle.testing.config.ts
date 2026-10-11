import { defineConfig } from "drizzle-kit";
import offlineConfig from "./drizzle.config";
import { getTestingMigrationCredentials } from "./src/config/db-env";

// Loading this config is reserved for an explicitly approved Testing apply.
export default defineConfig({
  ...offlineConfig,
  dbCredentials: getTestingMigrationCredentials(
    process.env.APP_ENV,
    process.env.DATABASE_URL,
  ),
});
