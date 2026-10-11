// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DatabaseConfigError,
  getDevMigrationCredentials,
  getTestingMigrationCredentials,
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

describe("Testing migration credentials", () => {
  it("decodes a Testing credential with verified TLS and an explicit port", () => {
    expect(
      getTestingMigrationCredentials(
        "testing",
        testingUrl
          .replace("fixture_password", "pass%40word")
          .replace(".invalid/", ".invalid:4000/"),
      ),
    ).toEqual({
      host: "fixture.invalid",
      port: 4000,
      user: "fixture_user",
      password: "pass@word",
      database: "courier_route_planner_testing",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("uses the standard MySQL port when omitted", () => {
    expect(getTestingMigrationCredentials("testing", testingUrl).port).toBe(
      3306,
    );
  });

  it.each([
    undefined,
    null,
    7,
    "",
    "development",
    "production",
    " testing",
    "testing ",
    "Testing",
  ])("rejects a non-exact Testing environment", (appEnv) => {
    expect(() => getTestingMigrationCredentials(appEnv, testingUrl)).toThrow(
      DatabaseConfigError,
    );
  });

  it.each([
    "courier_route_planner_dev",
    "courier_route_planner_production",
    "courier_route_planner_TESTING",
    "Courier_route_planner_testing",
    "courier_route_planner_testing_extra",
    "%20courier_route_planner_testing",
    "courier_route_planner_testing%20",
    "other_testing",
  ])("rejects a different or padded database identity", (database) => {
    expect(() =>
      getTestingMigrationCredentials(
        "testing",
        testingUrl.replace("courier_route_planner_testing", database),
      ),
    ).toThrow(DatabaseConfigError);
  });

  it.each([
    undefined,
    null,
    7,
    "",
    "invalid",
    ` ${testingUrl}`,
    `${testingUrl} `,
    testingUrl.replace("mysql:", "https:"),
    testingUrl.replace("fixture_user", ""),
    testingUrl.replace(":fixture_password", ""),
    testingUrl.replace("fixture_password", ""),
    testingUrl.replace("fixture.invalid", ""),
    testingUrl.replace("/courier_route_planner_testing", ""),
    `${testingUrl}/extra`,
    `${testingUrl}/`,
    `${testingUrl}?ssl=false`,
    `${testingUrl}#fragment`,
    testingUrl.replace("fixture_password", "%GG"),
    testingUrl.replace("fixture_password", "%00"),
    testingUrl.replace("fixture_password", "line\nfeed"),
    testingUrl.replace("fixture_user", "user%0Dname"),
    testingUrl.replace("courier_route_planner_testing", "%2Fhidden"),
    testingUrl.replace(
      "courier_route_planner_testing",
      "../courier_route_planner_testing",
    ),
    testingUrl.replace("fixture.invalid", "fixture.invalid:0"),
    testingUrl.replace("fixture.invalid", "fixture.invalid:65536"),
    testingUrl.replace("fixture.invalid", "fixture.invalid:"),
    testingUrl.replace("fixture.invalid", "fixture.invalid:notaport"),
    testingUrl.replace("fixture.invalid", "host%2Einvalid"),
    testingUrl.replace("fixture.invalid", "fixture..invalid"),
    testingUrl.replace("fixture.invalid", "-fixture.invalid"),
    testingUrl.replace("fixture.invalid", "fixture-.invalid"),
    testingUrl.replace("fixture.invalid", "999.999.999.999"),
    testingUrl.replace("fixture.invalid", `${"a".repeat(64)}.invalid`),
    testingUrl.replace("fixture_password", "secret@extra"),
    testingUrl.replace("courier_route_planner_testing", "db\\name"),
  ])(
    "rejects malformed input with a fixed error that omits credentials",
    (input) => {
      expect(() => getTestingMigrationCredentials("testing", input)).toThrow(
        DatabaseConfigError,
      );
      try {
        getTestingMigrationCredentials("testing", input);
      } catch (error) {
        expect(String(error)).toBe(
          "DatabaseConfigError: Invalid database configuration.",
        );
        expect(error).not.toHaveProperty("issues");
        expect(error).not.toHaveProperty("cause");
      }
    },
  );

  it("requires explicit input even when ambient Testing configuration exists", () => {
    vi.stubEnv("APP_ENV", "testing");
    vi.stubEnv("DATABASE_URL", testingUrl);
    expect(() => getTestingMigrationCredentials(undefined, undefined)).toThrow(
      DatabaseConfigError,
    );
    expect(() => getTestingMigrationCredentials("testing", undefined)).toThrow(
      DatabaseConfigError,
    );
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DATABASE_URL", productionUrl);
    expect(getTestingMigrationCredentials("testing", testingUrl).database).toBe(
      "courier_route_planner_testing",
    );
    expect(process.env.DATABASE_URL).toBe(productionUrl);
  });
});

describe("migration environment isolation", () => {
  const helpers = {
    Dev: getDevMigrationCredentials,
    Testing: getTestingMigrationCredentials,
  };
  it.each([
    ["Dev", "development", devUrl, "courier_route_planner_dev"],
    ["Testing", "testing", testingUrl, "courier_route_planner_testing"],
  ] as const)(
    "accepts the %s helper's own environment and database",
    (helper, env, url, database) => {
      expect(helpers[helper](env, url).database).toBe(database);
    },
  );
  it.each([
    ["Dev", "testing", testingUrl],
    ["Dev", "development", testingUrl],
    ["Dev", "production", productionUrl],
    ["Dev", "development", productionUrl],
    ["Testing", "development", devUrl],
    ["Testing", "testing", devUrl],
    ["Testing", "production", productionUrl],
    ["Testing", "testing", productionUrl],
  ] as const)(
    "rejects cross-environment credentials through the %s helper",
    (helper, env, url) => {
      expect(() => helpers[helper](env, url)).toThrow(DatabaseConfigError);
    },
  );
});
