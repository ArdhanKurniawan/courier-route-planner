// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/mysql-core";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("imports the approved Depot/Scenario schema without DB configuration or network", async () => {
  vi.stubEnv("DATABASE_URL", undefined);
  const network = vi.fn(() => {
    throw new Error("No network allowed");
  });
  vi.stubGlobal("fetch", network);
  try {
    const schema = await import("@/db/schema");
    expect(Object.keys(schema).sort()).toEqual(["depots", "scenarios"]);
    expect(getTableName(schema.depots)).toBe("depots");
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

it("uses a real RESTRICT relationship so deleting a Depot cannot cascade through Scenarios", async () => {
  const { scenarios, depots } = await import("@/db/schema");
  const config = getTableConfig(scenarios);
  expect(config.foreignKeys).toHaveLength(1);
  const fk = config.foreignKeys[0];
  expect(fk.reference().foreignTable).toBe(depots);
  expect(fk.reference().columns.map((c) => c.name)).toEqual(["depot_id"]);
  expect(fk.onDelete).toBe("restrict");
  expect(fk.onUpdate).toBe("restrict");
});
