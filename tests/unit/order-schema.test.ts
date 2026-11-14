// @vitest-environment node
import { expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/mysql-core";
import * as schema from "@/db/schema";
it("defines a Scenario-owned order with restrictive FK and scoped case/accent-insensitive unique code", () => {
  const orders = (
    schema as typeof schema & { orders?: Parameters<typeof getTableConfig>[0] }
  ).orders;
  expect(orders).toBeDefined();
  if (!orders) return;
  const config = getTableConfig(orders);
  const fk = config.foreignKeys[0];
  expect(fk.reference().foreignTable).toBe(schema.scenarios);
  expect(fk.onDelete).toBe("restrict");
  expect(fk.onUpdate).toBe("restrict");
  const unique = config.indexes.find((x) => x.config.unique);
  expect(
    unique?.config.columns.map((x) => ("name" in x ? x.name : "")),
  ).toEqual(["scenario_id", "order_code"]);
  expect(
    config.columns.find((x) => x.name === "order_code")?.getSQLType(),
  ).toContain("varchar(64)");
  expect(
    config.columns.find((x) => x.name === "order_code")?.getSQLType(),
  ).toContain("utf8mb4_unicode_ci");
});
