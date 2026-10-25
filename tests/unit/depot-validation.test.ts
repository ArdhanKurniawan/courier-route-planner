// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  parseDepotId,
  parseDepotInput,
  parseDepotQuery,
} from "@/lib/validation/depot";
import { assertDepotEnvironment } from "@/config/depot-env";
const input = {
  name: "  Fixture Depot  ",
  address: "  ",
  latitude: 0,
  longitude: 0,
  isActive: true,
};
describe("Depot input and lossless identifiers", () => {
  it("accepts zero and bounds, trims presentation input, and defaults only create status", () => {
    expect(parseDepotInput({ ...input, isActive: undefined })).toEqual({
      name: "Fixture Depot",
      address: null,
      latitude: 0,
      longitude: 0,
      isActive: true,
    });
    expect(
      parseDepotInput({ ...input, latitude: -90, longitude: 180 }, true),
    ).toMatchObject({ latitude: -90, longitude: 180 });
    expect(parseDepotId("9007199254740993").toString()).toBe(
      "9007199254740993",
    );
    expect(parseDepotId("9223372036854775807").toString()).toBe(
      "9223372036854775807",
    );
  });
  it.each([
    "0",
    "-1",
    "1.0",
    "1e3",
    "01",
    "9223372036854775808",
    " 1",
    "1 ",
    "not-id",
  ])("rejects noncanonical id %s", (id) =>
    expect(() => parseDepotId(id)).toThrow(),
  );
  it.each([
    { latitude: 91 },
    { latitude: -91 },
    { longitude: 181 },
    { longitude: -181 },
    { latitude: "0" },
    { latitude: null },
    { longitude: Infinity },
    { latitude: NaN },
    { isActive: "true" },
    { name: " " },
    { name: "x".repeat(256) },
    { address: "x".repeat(2001) },
    { id: "4" },
    { createdAt: "2026-01-01" },
  ])("rejects invalid Depot input %j", (change) =>
    expect(() => parseDepotInput({ ...input, ...change })).toThrow(),
  );
  it("requires all five fields for full edits", () => {
    expect(() =>
      parseDepotInput({ ...input, isActive: undefined }, true),
    ).toThrow();
    expect(() => parseDepotInput({ name: "Fixture" })).toThrow();
  });
  it("validates cursor and bounded pagination without duplicate/unknown query keys", () => {
    expect(parseDepotQuery(new URLSearchParams())).toEqual({ limit: 50 });
    expect(
      parseDepotQuery(new URLSearchParams("after=9007199254740993&limit=100")),
    ).toEqual({ after: BigInt("9007199254740993"), limit: 100 });
    for (const text of [
      "limit=101",
      "limit=0",
      "limit=1.5",
      "after=01",
      "other=x",
      "limit=1&limit=2",
    ])
      expect(() => parseDepotQuery(new URLSearchParams(text))).toThrow();
  });
});
describe("Depot environment target before acquisition", () => {
  it("keeps the future integration runner opt-in and Testing-only before collection", async () => {
    const allowed = {
      RUN_DB_INTEGRATION: "1",
      APP_ENV: "testing",
      DATABASE_URL:
        "mysql://fixture:fixture@fixture.invalid/courier_route_planner_testing",
    };
    for (const [key, value] of Object.entries(allowed)) vi.stubEnv(key, value);
    try {
      const { assertIntegrationTarget } =
        await import("../../vitest.integration.config");
      expect(() => assertIntegrationTarget(allowed)).not.toThrow();
      for (const changed of [
        { RUN_DB_INTEGRATION: undefined },
        { APP_ENV: "production" },
        {
          DATABASE_URL: allowed.DATABASE_URL.replace("_testing", "_production"),
        },
        { VERCEL: "1" },
      ])
        expect(() =>
          assertIntegrationTarget({ ...allowed, ...changed }),
        ).toThrow("Integration requires explicit Testing authorization.");
    } finally {
      vi.unstubAllEnvs();
    }
  });
  const url = (db: string) => "mysql://fixture:fixture@fixture.invalid/" + db;
  it.each([
    { APP_ENV: "development", DATABASE_URL: url("courier_route_planner_dev") },
    {
      APP_ENV: "testing",
      VERCEL_ENV: "preview",
      DATABASE_URL: url("courier_route_planner_testing"),
    },
    {
      APP_ENV: "production",
      VERCEL_ENV: "production",
      DATABASE_URL: url("courier_route_planner_production"),
    },
  ])("accepts the exact context/logical database", (env) =>
    expect(() => assertDepotEnvironment(env)).not.toThrow(),
  );
  it.each([
    {},
    {
      APP_ENV: "development",
      DATABASE_URL: url("courier_route_planner_production"),
    },
    { APP_ENV: "testing", DATABASE_URL: url("courier_route_planner_testing") },
    {
      APP_ENV: "production",
      VERCEL_ENV: "preview",
      DATABASE_URL: url("courier_route_planner_production"),
    },
    {
      APP_ENV: "development",
      VERCEL: "1",
      DATABASE_URL: url("courier_route_planner_dev"),
    },
  ])("rejects unknown/mismatched target", (env) =>
    expect(() => assertDepotEnvironment(env)).toThrow(),
  );
});
