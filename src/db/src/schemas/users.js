import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    // Store hashed password - NEVER store plain text passwords
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    roles: text("roles").array().notNull().default(["user"]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
