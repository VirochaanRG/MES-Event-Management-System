import { pgTable, serial, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const form = pgTable("form", {
  id: serial("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const formQuestions = pgTable("form_questions", {
  id: serial("id").primaryKey().notNull(),
  formId: integer("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  questionType: varchar("question_type", { length: 100 }).notNull(),
  questionTitle: text("question_title"),
  optionsCategory: text("options_category"),
  qorder: integer("qorder").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const formAnswers = pgTable("form_answers", {
  id: serial("id").primaryKey().notNull(),
  questionType: varchar("question_type", { length: 100 }).notNull(),
  formId: integer("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  questionId: integer("question_id")
    .notNull()
    .references(() => formQuestions.id, { onDelete: "cascade" }),
  answer: text("answer"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey().notNull(),
  userId: integer("user_id")
    .notNull(),
  formId: integer("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});