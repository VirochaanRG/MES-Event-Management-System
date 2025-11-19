import { pgTable, serial, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const form = pgTable("form", {
  id: serial("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

