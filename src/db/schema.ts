import {
  bigint,
  boolean,
  datetime,
  double,
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
