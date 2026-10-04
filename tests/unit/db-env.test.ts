// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DatabaseConfigError,
  parseDatabaseConfig,
  getDevMigrationCredentials,
} from "@/config/db-env";

const url =
  "mysql://fixture_user:fixture_password@fixture.invalid/courier_route_planner_dev";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("database configuration", () => {
  it.each([
    url,
    url.replace(".invalid/", ".invalid:4000/"),
    url.replace("fixture_password", "encoded%40pass%3Aword"),
    url.replace("fixture.invalid", "fixture-name.tidbcloud.invalid"),
    url.replace("fixture.invalid", "127.0.0.1"),
  ])("accepts an explicit MySQL URL", (input) => {
    expect(parseDatabaseConfig(input)).toEqual({ url: input });
  });
  it.each([
    undefined,
    null,
    7,
    "",
    " ",
    ` ${url}`,
    `${url} `,
    url.replace("mysql:", "https:"),
    url.replace("fixture_user", ""),
    url.replace(":fixture_password", ""),
    url.replace("fixture_password", ""),
    url.replace("fixture.invalid", ""),
    url.replace("/courier_route_planner_dev", ""),
    `${url}/extra`,
    `${url}/`,
    `${url}#secret`,
    `${url}?ssl=false`,
    url.replace("fixture_password", "%GG"),
    url.replace("fixture_password", "%00"),
    url.replace("fixture_password", "line\nfeed"),
    url.replace("fixture_user", "user%0Dname"),
    url.replace("courier_route_planner_dev", "%2Fhidden"),
    url.replace("courier_route_planner_dev", "../courier_route_planner_dev"),
    url.replace("fixture.invalid", "fixture.invalid:0"),
    url.replace("fixture.invalid", "fixture.invalid:65536"),
    url.replace("fixture_password", "secret@extra"),
    url.replace("fixture.invalid", "host%2Einvalid"),
    url.replace("fixture.invalid", "fixture.invalid:"),
    url.replace("fixture.invalid", "-"),
    url.replace("fixture.invalid", "..."),
    url.replace("fixture.invalid", "fixture..invalid"),
    url.replace("fixture.invalid", "999.999.999.999"),
    url.replace("fixture.invalid", "-fixture.invalid"),
    url.replace("fixture.invalid", "fixture-.invalid"),
    url.replace("fixture.invalid", `${"a".repeat(64)}.invalid`),
    url.replace("courier_route_planner_dev", "db\\name"),
  ])("rejects unsafe or ambiguous input with a fixed error", (input) => {
    expect(() => parseDatabaseConfig(input)).toThrow(DatabaseConfigError);
    expect(() => parseDatabaseConfig(input)).toThrow(
      "Invalid database configuration.",
    );
    try {
      parseDatabaseConfig(input);
    } catch (error) {
      const rendered = String(error);
      for (const marker of [
        "mysql://",
        "fixture_user",
        "fixture_password",
        "fixture.invalid",
        "courier_route_planner_dev",
      ])
        expect(rendered).not.toContain(marker);
      expect(error).not.toHaveProperty("issues");
      expect(error).not.toHaveProperty("cause");
    }
  });
  it("uses explicit input without reading or changing ambient DB configuration", () => {
    vi.stubEnv("DATABASE_URL", "unrelated ambient value");
    expect(parseDatabaseConfig(url)).toEqual({ url });
    expect(process.env.DATABASE_URL).toBe("unrelated ambient value");
    expect(() => parseDatabaseConfig(undefined)).toThrow(DatabaseConfigError);
  });
  it("imports without database configuration", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    await expect(import("@/config/db-env")).resolves.toBeDefined();
  });
});

describe("Dev migration credentials", () => {
  it("decodes credentials and keeps TLS certificate verification enabled", () => {
    expect(
      getDevMigrationCredentials(
        "development",
        url
          .replace("fixture_password", "pass%40word")
          .replace(".invalid/", ".invalid:4000/"),
      ),
    ).toEqual({
      host: "fixture.invalid",
      port: 4000,
      user: "fixture_user",
      password: "pass@word",
      database: "courier_route_planner_dev",
      ssl: { rejectUnauthorized: true },
    });
  });
  it("uses the standard MySQL port when omitted", () => {
    expect(getDevMigrationCredentials("development", url).port).toBe(3306);
  });
  it.each([undefined, "testing", "production", " development", "Development"])(
    "rejects a non-Dev environment",
    (appEnv) => {
      expect(() => getDevMigrationCredentials(appEnv, url)).toThrow(
        "Invalid database configuration.",
      );
    },
  );
  it.each([
    undefined,
    url.replace("_dev", "_testing"),
    url.replace("_dev", "_prod"),
  ])("rejects absent or wrong database identity", (input) => {
    expect(() => getDevMigrationCredentials("development", input)).toThrow(
      DatabaseConfigError,
    );
  });
});
