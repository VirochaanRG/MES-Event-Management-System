import { pgTable, serial, timestamp, integer, varchar } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
// Custom bytea type for binary data
const bytea = customType({
    dataType() {
        return 'bytea';
    },
});
export const images = pgTable('images', {
    id: serial('id').primaryKey(),
    // Image data stored as bytea (binary data)
    imageData: bytea('image_data').notNull(),
    // Component identifier to associate image with specific component
    component: varchar('component', { length: 255 }).notNull(),
    // Index for ordering or identifying images within a component (nullable)
    index: integer('index'),
    // Optional metadata fields
    fileName: varchar('file_name', { length: 255 }),
    mimeType: varchar('mime_type', { length: 100 }), // e.g., 'image/png', 'image/jpeg'
    fileSize: integer('file_size'), // in bytes
    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
