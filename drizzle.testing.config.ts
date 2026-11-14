import offlineConfig from "./drizzle.config";

// Legacy Kit config for offline tooling. Kit drops mysql2's verifyIdentity.
// Testing apply uses the separately authorized npm run db:migrate:testing.
export default offlineConfig;
