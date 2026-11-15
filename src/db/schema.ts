import {
  bigint,
  boolean,
  customType,
  datetime,
  double,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const depots = mysqlTable("depots", {
  id: bigint("id", { mode: "bigint" }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  latitude: double("latitude").notNull(),
  longitude: double("longitude").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  // UTC values are supplied by future application mutations, not DB defaults.
  createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull(),
  updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
});

export const scenarios = mysqlTable(
  "scenarios",
  {
    id: bigint("id", { mode: "bigint" }).autoincrement().primaryKey(),
    depotId: bigint("depot_id", { mode: "bigint" })
      .notNull()
      .references(() => depots.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    name: varchar("name", { length: 255 }).notNull(),
    distributionPattern: varchar("distribution_pattern", {
      length: 32,
    }).notNull(),
    customerCount: int("customer_count").notNull(),
    radiusMinM: int("radius_min_m"),
    radiusMaxM: int("radius_max_m"),
    generationSeed: bigint("generation_seed", { mode: "bigint" }),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
  },
  (table) => [index("scenarios_depot_id_idx").on(table.depotId)],
);

// Explicit per-column CI avoids inheriting a binary database default. The owner
// accepts accent-insensitive comparison too. Persisted application codes are uppercase.
const orderCode = customType<{ data: string }>({
  dataType: () =>
    "varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
});
export const orders = mysqlTable(
  "orders",
  {
    id: bigint("id", { mode: "bigint" }).autoincrement().primaryKey(),
    scenarioId: bigint("scenario_id", { mode: "bigint" })
      .notNull()
      .references(() => scenarios.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    orderCode: orderCode("order_code").notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    address: text("address"),
    latitude: double("latitude").notNull(),
    longitude: double("longitude").notNull(),
    source: varchar("source", {
      length: 16,
      enum: ["manual", "dummy"],
    }).notNull(),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("orders_scenario_code_unique").on(
      table.scenarioId,
      table.orderCode,
    ),
    index("orders_scenario_id_id_idx").on(table.scenarioId, table.id),
  ],
);

export const dummyOrderOperations = mysqlTable(
  "dummy_order_operations",
  {
    operationId: varchar("operation_id", { length: 36 }).primaryKey(),
    scenarioId: bigint("scenario_id", { mode: "bigint" }).notNull(),
    operationVersion: bigint("operation_version", { mode: "bigint" }).notNull(),
    // Terminal receipts retain their original Scenario ID without preventing deletion.
    activeScenarioId: bigint("active_scenario_id", {
      mode: "bigint",
    }).references(() => scenarios.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    beforeHash: varchar("before_hash", { length: 64 }).notNull(),
    afterHash: varchar("after_hash", { length: 64 }),
    status: varchar("status", {
      length: 16,
      enum: [
        "pending",
        "committed",
        "commit_unknown",
        "rollback_unknown",
        "confirmed",
        "rolled_back",
      ],
    }).notNull(),
    savedCount: int("saved_count").notNull(),
    replacedCount: int("replaced_count").notNull(),
  },
  (table) => [
    uniqueIndex("dummy_order_ops_active_scenario_unique").on(
      table.activeScenarioId,
    ),
    uniqueIndex("dummy_order_ops_scenario_version_unique").on(
      table.scenarioId,
      table.operationVersion,
    ),
  ],
);
