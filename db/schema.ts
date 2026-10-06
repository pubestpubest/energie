import { date, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  // Unique constraint also gives us the index used for chronological ordering.
  readingDate: date("reading_date", { mode: "string" }).notNull().unique(),
  kwhValue: numeric("kwh_value", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Reading = typeof readings.$inferSelect;
