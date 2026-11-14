import { defineConfig } from "drizzle-kit";
import offlineConfig from "./drizzle.config";
import { getDevMigrationCredentials } from "./src/config/db-env";

// Legacy Kit config; not the Development apply entrypoint. Kit strips mysql2's
// verifyIdentity option. Use the separately authorized npm run db:migrate runner.
export default defineConfig({
  ...offlineConfig,
  dbCredentials: getDevMigrationCredentials(
    process.env.APP_ENV,
    process.env.DATABASE_URL,
  ),
});
