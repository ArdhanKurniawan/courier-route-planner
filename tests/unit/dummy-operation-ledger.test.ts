// @vitest-environment node
import { expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/mysql-core";
import * as schema from "@/db/schema";
import { proveDummyOperation } from "@/db/dummy-operation-ledger";

it("enforces a unique operation ID and one unresolved reservation per Scenario", () => {
  const ledger = getTableConfig(schema.dummyOrderOperations);
  expect(
    ledger.columns.find(({ name }) => name === "operation_id")?.primary,
  ).toBe(true);
  expect(
    ledger.indexes.some(
      ({ config }) =>
        config.unique &&
        config.columns.some(
          (column) => "name" in column && column.name === "active_scenario_id",
        ),
    ),
  ).toBe(true);
  expect(ledger.foreignKeys[0].reference().foreignTable).toBe(schema.scenarios);
  expect(ledger.foreignKeys[0].onDelete).toBe("restrict");
});

it("keeps rollback unknown when the full before dataset cannot be matched", () => {
  expect(
    proveDummyOperation(
      { status: "rollback_unknown", beforeHash: "before", afterHash: null },
      "after",
    ),
  ).toBeNull();
  expect(
    proveDummyOperation(
      { status: "rollback_unknown", beforeHash: "before", afterHash: null },
      "before",
    ),
  ).toBe("rolled_back");
});

it("requires the full atomic receipt for committed batches even if the old dataset matches", () => {
  expect(
    proveDummyOperation(
      { status: "committed", beforeHash: "before", afterHash: "after" },
      "before",
    ),
  ).toBeNull();
  expect(
    proveDummyOperation(
      { status: "committed", beforeHash: "before", afterHash: "after" },
      "after",
    ),
  ).toBe("confirmed");
});
