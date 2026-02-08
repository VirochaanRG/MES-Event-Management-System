import { pgTable, serial, varchar, text, timestamp, integer, boolean, unique, customType } from "drizzle-orm/pg-core";
export const events = pgTable("events", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 255 }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    capacity: integer("capacity").default(0),
    isPublic: boolean("is_public").default(true),
    status: varchar("status", { length: 50 }).default("scheduled"),
    cost: integer("cost").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
export const registeredUsers = pgTable("registered_users", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
        .notNull()
        .references(() => events.id, { onDelete: "cascade" }), // Or varchar if you use string IDs
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    instance: integer("instance").default(0), // number of stuff
    registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow(),
    status: varchar("status", { length: 50 }).default("confirmed"), // confirmed, cancelled, waitlist
    paymentStatus: varchar("payment_status", { length: 50 }).default("pending"), // pending, paid, refunded
}, (t) => [
    unique("registration_natural_key").on(t.eventId, t.userEmail, t.instance).nullsNotDistinct()
]);
const bytea = customType({
    dataType() {
        return 'bytea';
    },
});
export const qrCodes = pgTable("qr_codes", {
    id: serial("id").references(() => registeredUsers.id, { onDelete: "cascade" }),
    eventId: integer("event_id").notNull(),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    instance: integer("instance").notNull(),
    image: bytea("image").notNull(),
    // content: varchar("content", {length: 255}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
