import { defineConfig } from "drizzle-kit";
import offlineConfig from "./drizzle.config";
import { getProductionMigrationCredentials } from "./src/config/db-env";

// Loading this config is reserved for an explicitly approved Production apply.
export default defineConfig({
  ...offlineConfig,
  dbCredentials: getProductionMigrationCredentials(
    process.env.APP_ENV,
    process.env.DATABASE_URL,
  ),
});
