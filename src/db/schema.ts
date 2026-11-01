import {
  bigint,
  boolean,
  datetime,
  double,
  index,
  int,
  mysqlTable,
  text,
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
