import {
  bigint,
  boolean,
  customType,
  datetime,
  double,
  index,
  int,
  json,
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

export const benchmarkCases = mysqlTable(
  "benchmark_cases",
  {
    id: bigint("id", { mode: "bigint" }).autoincrement().primaryKey(),
    requestId: varchar("request_id", { length: 36 }).notNull(),
    scenarioId: bigint("scenario_id", { mode: "bigint" })
      .notNull()
      .references(() => scenarios.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    scenarioSnapshot: json("scenario_snapshot").notNull(),
    configuredCustomerCount: int("configured_customer_count").notNull(),
    actualOrderCount: int("actual_order_count").notNull(),
    pointCount: int("point_count").notNull(),
    inputVersion: varchar("input_version", { length: 64 }).notNull(),
    inputHash: varchar("input_hash", { length: 64 }).notNull(),
    frozenAt: datetime("frozen_at", { mode: "string", fsp: 3 }).notNull(),
    gitCommitSha: varchar("git_commit_sha", { length: 40 }),
  },
  (table) => [
    uniqueIndex("benchmark_cases_request_id_unique").on(table.requestId),
    index("benchmark_cases_scenario_id_idx").on(table.scenarioId),
  ],
);

export const benchmarkCasePoints = mysqlTable(
  "benchmark_case_points",
  {
    id: bigint("id", { mode: "bigint" }).autoincrement().primaryKey(),
    caseId: bigint("case_id", { mode: "bigint" })
      .notNull()
      .references(() => benchmarkCases.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    nodeIndex: int("node_index").notNull(),
    kind: varchar("kind", { length: 8, enum: ["depot", "order"] }).notNull(),
    // Provenance is copied without an FK to the live Depot or Order.
    sourceId: bigint("source_id", { mode: "bigint" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    latitude: double("latitude").notNull(),
    longitude: double("longitude").notNull(),
    orderCode: varchar("order_code", { length: 64 }),
    orderSource: varchar("order_source", {
      length: 16,
      enum: ["manual", "dummy"],
    }),
    depotActive: boolean("depot_active"),
  },
  (table) => [
    uniqueIndex("benchmark_case_points_node_unique").on(
      table.caseId,
      table.nodeIndex,
    ),
    uniqueIndex("benchmark_case_points_source_unique").on(
      table.caseId,
      table.kind,
      table.sourceId,
    ),
  ],
);

export const distanceMatrices = mysqlTable(
  "distance_matrices",
  {
    id: bigint("id", { mode: "bigint" }).autoincrement().primaryKey(),
    benchmarkCaseId: bigint("benchmark_case_id", { mode: "bigint" })
      .notNull()
      .references(() => benchmarkCases.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    requestId: varchar("request_id", { length: 36 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 16, enum: ["osrm"] }).notNull(),
    profile: varchar("profile", { length: 64 }).notNull(),
    endpoint: text("endpoint").notNull(),
    unit: varchar("unit", { length: 16, enum: ["meter"] }).notNull(),
    directed: boolean("directed").notNull(),
    inputHash: varchar("input_hash", { length: 64 }).notNull(),
    matrixHash: varchar("matrix_hash", { length: 64 }).notNull(),
    pointCount: int("point_count").notNull(),
    zeroPairCount: int("zero_pair_count").notNull(),
    generatedAt: datetime("generated_at", { mode: "string", fsp: 3 }).notNull(),
    options: json("options_json").notNull(),
    nodeOrder: json("node_order_json").notNull(),
    matrix: json("distance_matrix_json").notNull(),
    snapping: json("snapping_json").notNull(),
    provenance: json("provenance_json").notNull(),
  },
  (table) => [
    uniqueIndex("distance_matrices_case_request_unique").on(
      table.benchmarkCaseId,
      table.requestId,
    ),
    index("distance_matrices_case_id_idx").on(table.benchmarkCaseId, table.id),
  ],
);
