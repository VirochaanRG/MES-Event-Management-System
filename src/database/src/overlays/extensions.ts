import { pgTable, serial, varchar, timestamp, text, integer } from 'drizzle-orm/pg-core';
import { users } from '@large-event/database/schemas';

export const teamDNotifications = pgTable('teamd_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  isRead: varchar('is_read', { length: 10 }).default('false'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const teamDActivityLogs = pgTable('teamd_activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: integer('resource_id'),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export type TeamDNotification = typeof teamDNotifications.$inferSelect;
export type NewTeamDNotification = typeof teamDNotifications.$inferInsert;
export type TeamDActivityLog = typeof teamDActivityLogs.$inferSelect;
export type NewTeamDActivityLog = typeof teamDActivityLogs.$inferInsert;