import { pgTable, serial, varchar, text, timestamp, integer, json, boolean } from "drizzle-orm/pg-core";

export const modularForms = pgTable("modular_forms", {
  id: serial("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  isPublic: boolean("is_public").notNull().default(false)
});

export const form = pgTable("form", {
  id: serial("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  moduleId: integer("module_id").references(() => modularForms.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").notNull().default(false),
  unlockAt: timestamp("unlock_at", { withTimezone: true }),
});

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey().notNull(),
  userId: text("user_id")
    .notNull(),
  formId: integer("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  parentQuestionId: integer("parent_question_id").references(() => formQuestions.id),
  enablingAnswers: json("enabling_answers").$type<number[]>(),
  required: boolean("required").notNull().default(false)
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  submissionId: integer("submission_id").references(() => formSubmissions.id, { onDelete: "cascade" })
});

export const formConditions = pgTable("form_conditions", {
  id: serial("id").primaryKey().notNull(),
  formId: integer("form_id")
    .notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  conditionType: text("condition_type").notNull(),
  dependentFormId: integer("dependent_form_id").notNull()
    .references(() => form.id, { onDelete: "cascade" }),
  dependentQuestionId: integer("dependent_question_id")
    .references(() => formQuestions.id, { onDelete: "cascade" }),
  dependentAnswerIdx: integer("dependent_answer_idx")
});


