// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/mysql-core";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("imports the schema without DB configuration or network", async () => {
  vi.stubEnv("DATABASE_URL", undefined);
  const network = vi.fn(() => {
    throw new Error("No network allowed");
  });
  vi.stubGlobal("fetch", network);
  try {
    const schema = await import("@/db/schema");
    expect(Object.keys(schema).sort()).toEqual([
      "benchmarkCasePoints",
      "benchmarkCases",
      "depots",
      "distanceMatrices",
      "dummyOrderOperations",
      "orders",
      "scenarios",
    ]);
    expect(getTableName(schema.depots)).toBe("depots");
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

it("preserves benchmark history with restrictive foreign keys and unique source and node identities", async () => {
  const { benchmarkCases, benchmarkCasePoints, scenarios } =
    await import("@/db/schema");
  const header = getTableConfig(benchmarkCases);
  const points = getTableConfig(benchmarkCasePoints);

  for (const [table, column, parent] of [
    [header, "scenario_id", scenarios],
    [points, "case_id", benchmarkCases],
  ] as const) {
    expect(table.foreignKeys).toHaveLength(1);
    const [fk] = table.foreignKeys;
    expect(fk.reference().foreignTable).toBe(parent);
    expect(fk.reference().columns.map((key) => key.name)).toEqual([column]);
    expect(fk.onDelete).toBe("restrict");
    expect(fk.onUpdate).toBe("restrict");
  }
  expect(
    header.indexes
      .filter((entry) => entry.config.unique)
      .map(({ config }) =>
        config.columns.map((column) => ("name" in column ? column.name : null)),
      ),
  ).toEqual([["request_id"]]);
  expect(
    points.indexes
      .filter((entry) => entry.config.unique)
      .map(({ config }) =>
        config.columns.map((column) => ("name" in column ? column.name : null)),
      ),
  ).toEqual([
    ["case_id", "node_index"],
    ["case_id", "kind", "source_id"],
  ]);
  expect(benchmarkCases.id.getSQLType()).toBe("bigint");
  expect(benchmarkCasePoints.sourceId.getSQLType()).toBe("bigint");
  expect(benchmarkCasePoints.latitude.getSQLType()).toBe("double");
  expect(benchmarkCasePoints.longitude.getSQLType()).toBe("double");
});

it("scopes frozen distance matrices to a Benchmark Case with a restrictive foreign key", async () => {
  const { benchmarkCases, distanceMatrices } = await import("@/db/schema");
  const { foreignKeys, indexes } = getTableConfig(distanceMatrices);
  expect(foreignKeys).toHaveLength(1);
  const [fk] = foreignKeys;
  expect(fk.reference()).toMatchObject({
    columns: [distanceMatrices.benchmarkCaseId],
    foreignColumns: [benchmarkCases.id],
  });
  expect(fk.reference().foreignTable).toBe(benchmarkCases);
  expect(fk).toMatchObject({ onDelete: "restrict", onUpdate: "restrict" });
  expect(
    indexes.map(({ config }) => ({
      unique: config.unique,
      columns: config.columns.map((column) =>
        "name" in column ? column.name : null,
      ),
    })),
  ).toEqual([
    { unique: true, columns: ["benchmark_case_id", "request_id"] },
    { unique: false, columns: ["benchmark_case_id", "id"] },
  ]);
  expect(distanceMatrices.id.getSQLType()).toBe("bigint");
  expect(distanceMatrices.generatedAt.getSQLType()).toBe("datetime(3)");
  expect(distanceMatrices.matrix.getSQLType()).toBe("json");
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
