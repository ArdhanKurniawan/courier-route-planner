// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DatabaseConfigError,
  getDevMigrationCredentials,
  getTestingMigrationCredentials,
  getProductionMigrationCredentials,
} from "@/config/db-env";

const devUrl =
  "mysql://fixture_user:fixture_password@fixture.invalid/courier_route_planner_dev";
const testingUrl =
  "mysql://fixture_user:fixture_password@fixture.invalid/courier_route_planner_testing";
const productionUrl =
  "mysql://fixture_user:fixture_password@fixture.invalid/courier_route_planner_production";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Production migration credentials", () => {
  it("decodes Production credentials and preserves certificate verification", () => {
    expect(
      getProductionMigrationCredentials(
        "production",
        productionUrl
          .replace("fixture_user", "fixture%5Fuser")
          .replace("fixture_password", "pass%40word%3Afixture")
          .replace(".invalid/", ".invalid:4000/"),
      ),
    ).toEqual({
      host: "fixture.invalid",
      port: 4000,
      user: "fixture_user",
      password: "pass@word:fixture",
      database: "courier_route_planner_production",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("uses port 3306 when no explicit port is provided", () => {
    expect(
      getProductionMigrationCredentials("production", productionUrl).port,
    ).toBe(3306);
  });

  it.each([
    undefined,
    null,
    7,
    "",
    "development",
    "testing",
    "Production",
    "PRODUCTION",
    " production",
    "production ",
    "production\n",
  ])("rejects a missing or non-exact Production environment", (env) => {
    expect(() => getProductionMigrationCredentials(env, productionUrl)).toThrow(
      DatabaseConfigError,
    );
  });

  it.each([
    "courier_route_planner_dev",
    "courier_route_planner_testing",
    "courier_route_planner_PRODUCTION",
    "Courier_route_planner_production",
    "courier_route_planner_production_extra",
    "other_production",
    "%20courier_route_planner_production",
    "courier_route_planner_production%20",
    "courier_route_planner_production/",
    "courier_route_planner_production/extra",
    "../courier_route_planner_production",
    "%2Fcourier_route_planner_production",
  ])("rejects a wrong or ambiguous Production database", (database) => {
    expect(() =>
      getProductionMigrationCredentials(
        "production",
        productionUrl.replace("courier_route_planner_production", database),
      ),
    ).toThrow(DatabaseConfigError);
  });

  it.each([
    undefined,
    null,
    7,
    "",
    "invalid",
    ` ${productionUrl}`,
    `${productionUrl} `,
    productionUrl.replace("mysql:", "https:"),
    productionUrl.replace("fixture_user", ""),
    productionUrl.replace(":fixture_password", ""),
    productionUrl.replace("fixture_password", ""),
    productionUrl.replace("fixture.invalid", ""),
    productionUrl.replace("/courier_route_planner_production", ""),
    `${productionUrl}?ssl=false`,
    `${productionUrl}#fragment`,
    productionUrl.replace("fixture_password", "%GG"),
    productionUrl.replace("fixture_password", "%00"),
    productionUrl.replace("fixture_password", "line\nfeed"),
    productionUrl.replace("fixture_user", "user%0Dname"),
    productionUrl.replace("fixture_password", "secret@extra"),
    productionUrl.replace("fixture.invalid", "host%2Einvalid"),
    productionUrl.replace("fixture.invalid", "fixture..invalid"),
    productionUrl.replace("fixture.invalid", "-fixture.invalid"),
    productionUrl.replace("fixture.invalid", "fixture-.invalid"),
    productionUrl.replace("fixture.invalid", "999.999.999.999"),
    productionUrl.replace("fixture.invalid", `${"a".repeat(64)}.invalid`),
    productionUrl.replace("fixture.invalid", "fixture.invalid:"),
    productionUrl.replace("fixture.invalid", "fixture.invalid:notaport"),
    productionUrl.replace("fixture.invalid", "fixture.invalid:0"),
    productionUrl.replace("fixture.invalid", "fixture.invalid:65536"),
    productionUrl.replace("courier_route_planner_production", "db\\name"),
  ])("rejects unsafe URL input without leaking configuration", (input) => {
    expect(() =>
      getProductionMigrationCredentials("production", input),
    ).toThrow(DatabaseConfigError);
    try {
      getProductionMigrationCredentials("production", input);
    } catch (error) {
      expect(String(error)).toBe(
        "DatabaseConfigError: Invalid database configuration.",
      );
      expect(error).not.toHaveProperty("issues");
      expect(error).not.toHaveProperty("cause");
    }
  });

  it("requires explicit input and leaves ambient configuration unchanged", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DATABASE_URL", productionUrl);
    expect(() =>
      getProductionMigrationCredentials(undefined, undefined),
    ).toThrow(DatabaseConfigError);
    expect(() =>
      getProductionMigrationCredentials("production", undefined),
    ).toThrow(DatabaseConfigError);
    vi.stubEnv("APP_ENV", "testing");
    vi.stubEnv("DATABASE_URL", testingUrl);
    expect(
      getProductionMigrationCredentials("production", productionUrl).database,
    ).toBe("courier_route_planner_production");
    expect(process.env.APP_ENV).toBe("testing");
    expect(process.env.DATABASE_URL).toBe(testingUrl);
  });
});

describe("three explicit migration paths", () => {
  const helpers = {
    Dev: getDevMigrationCredentials,
    Testing: getTestingMigrationCredentials,
    Production: getProductionMigrationCredentials,
  };

  it.each([
    ["Dev", "development", devUrl, "courier_route_planner_dev"],
    ["Testing", "testing", testingUrl, "courier_route_planner_testing"],
    [
      "Production",
      "production",
      productionUrl,
      "courier_route_planner_production",
    ],
  ] as const)(
    "accepts only the %s path's intended pair",
    (helper, env, url, database) => {
      expect(helpers[helper](env, url).database).toBe(database);
    },
  );

  it.each([
    ["Dev", "testing", testingUrl],
    ["Dev", "production", productionUrl],
    ["Dev", "development", testingUrl],
    ["Dev", "development", productionUrl],
    ["Dev", "testing", devUrl],
    ["Dev", "testing", productionUrl],
    ["Dev", "production", devUrl],
    ["Dev", "production", testingUrl],
    ["Testing", "development", devUrl],
    ["Testing", "production", productionUrl],
    ["Testing", "testing", devUrl],
    ["Testing", "testing", productionUrl],
    ["Testing", "development", testingUrl],
    ["Testing", "development", productionUrl],
    ["Testing", "production", devUrl],
    ["Testing", "production", testingUrl],
    ["Production", "development", devUrl],
    ["Production", "testing", testingUrl],
    ["Production", "production", devUrl],
    ["Production", "production", testingUrl],
    ["Production", "development", productionUrl],
    ["Production", "development", testingUrl],
    ["Production", "testing", productionUrl],
    ["Production", "testing", devUrl],
  ] as const)(
    "rejects cross-environment input through %s",
    (helper, env, url) => {
      expect(() => helpers[helper](env, url)).toThrow(DatabaseConfigError);
    },
  );
});

describe("Production Drizzle configuration", () => {
  it("uses the offline history and guarded Production credentials", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DATABASE_URL", productionUrl);
    const { default: config } = await import("../../drizzle.production.config");
    expect(config).toMatchObject({
      dialect: "mysql",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: {
        database: "courier_route_planner_production",
        ssl: { rejectUnauthorized: true },
      },
    });
  });

  it.each([
    [undefined, undefined],
    ["development", devUrl],
    ["testing", testingUrl],
    ["production", testingUrl],
  ])(
    "rejects an unsafe Production config before any apply",
    async (env, url) => {
      vi.stubEnv("APP_ENV", env);
      vi.stubEnv("DATABASE_URL", url);
      const { DatabaseConfigError: ConfigError } = await import("@/config/db-env");
      await expect(import("../../drizzle.production.config")).rejects.toThrow(
        ConfigError,
      );
    },
  );
});
