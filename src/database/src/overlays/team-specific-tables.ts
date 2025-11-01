import { pgTable, serial, varchar, timestamp, text, boolean, integer, json } from 'drizzle-orm/pg-core';
import { users } from '@large-event/database/schemas';

export const teamDProjects = pgTable('teamd_projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active'),
  leadId: integer('lead_id').references(() => users.id),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type TeamDProject = typeof teamDProjects.$inferSelect;
export type NewTeamDProject = typeof teamDProjects.$inferInsert;