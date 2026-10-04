import type { Config } from "drizzle-kit";

// Offline generation/history checking: no environment or credentials required.
export default {
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  breakpoints: true,
} satisfies Config;
