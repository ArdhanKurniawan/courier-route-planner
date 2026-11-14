import offlineConfig from "./drizzle.config";

// Kit drops mysql2's verifyIdentity option. Production apply uses the
// separately authorized npm run db:migrate:production runner.
export default offlineConfig;
