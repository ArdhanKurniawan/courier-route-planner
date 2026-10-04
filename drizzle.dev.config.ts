import { defineConfig } from "drizzle-kit";
import offlineConfig from "./drizzle.config";
import { getDevMigrationCredentials } from "./src/config/db-env";

// Loading this config is reserved for a later, explicitly approved Dev apply.
export default defineConfig({
  ...offlineConfig,
  dbCredentials: getDevMigrationCredentials(
    process.env.APP_ENV,
    process.env.DATABASE_URL,
  ),
});
