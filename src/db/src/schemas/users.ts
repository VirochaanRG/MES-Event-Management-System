import { pgTable, serial, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  // Store hashed password - NEVER store plain text passwords
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  roles: text("roles").array().notNull().default(["user"]),
  resetPasswordToken: varchar("reset_password_token", { length: 255 }),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pushTokens = pgTable("push_tokens", {
  id: serial("id").primaryKey(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  token: varchar("token", { length: 500 }).notNull().unique(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  isMcmasterStudent: boolean("is_mcmaster_student").notNull().default(false),
  faculty: varchar("faculty", { length: 150 }),
  program: varchar("program", { length: 150 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});