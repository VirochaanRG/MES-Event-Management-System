import
{
  pgTable, serial, varchar, text, timestamp, integer, boolean,
  unique, customType, uniqueIndex,
  json
} from "drizzle-orm/pg-core";
import { form } from "./form";

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
  registrationForm: json("registration_form"), // Stores the form schema/configuration
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const registeredUsers = pgTable("registered_users", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  instance: integer("instance").default(0),
  details: json("details"), // Stores the user's form responses
  registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow(),
  status: varchar("status", { length: 50 }).default("confirmed"),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
},
  (t) => [
    unique("registration_natural_key").on(
      t.eventId,
      t.userEmail,
      t.instance
    ).nullsNotDistinct()
  ]
);

const bytea = customType<{ data: Buffer; notNull: true; }>({
  dataType()
  {
    return 'bytea';
  },
});

export const qrCodes = pgTable("qr_codes", {
  id: serial("id").references(() => registeredUsers.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  instance: integer("instance").notNull(),
  image: bytea("image").notNull(),
  content: varchar("content", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('qr_code_idx').on(table.content)
]);

export const eventForms = pgTable("event_forms", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  formId: integer("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
},
  (t) => [
    unique("event_form_unique").on(t.eventId, t.formId),
  ]
);

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const announcementReads = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id")
    .notNull()
    .references(() => announcements.id, { onDelete: "cascade" }),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }).defaultNow(),
},
  (t) => [
    unique("announcement_read_unique").on(t.announcementId, t.userEmail),
  ]
);
