// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const calendar = sqliteTable('calendar', { id: integer('id').primaryKey(), feed: text('feed').notNull(), events: text('events').notNull().default('[]'), changes: text('changes').notNull().default('[]'), syncedAt: text('synced_at'), error: text('error') });
