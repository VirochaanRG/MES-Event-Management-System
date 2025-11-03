import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/overlays/*.ts', '../../../../shared/database/src/schemas/*.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/large_event_db',
  },
  verbose: true,
  strict: true,
});