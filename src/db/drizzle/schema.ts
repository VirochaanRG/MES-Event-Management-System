import { pgTable, check, serial, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	location: varchar({ length: 255 }),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }).notNull(),
	capacity: integer().default(0),
	isPublic: boolean("is_public").default(true),
	status: varchar({ length: 50 }).default('scheduled'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	cost: integer().default(0),
}, (table) => [
	check("events_id_not_null", sql`NOT NULL id`),
	check("events_title_not_null", sql`NOT NULL title`),
	check("events_start_time_not_null", sql`NOT NULL start_time`),
	check("events_end_time_not_null", sql`NOT NULL end_time`),
]);

export const form = pgTable("form", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("form_id_not_null", sql`NOT NULL id`),
	check("form_name_not_null", sql`NOT NULL name`),
]);
