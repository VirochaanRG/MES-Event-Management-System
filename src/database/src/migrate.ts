import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as sharedSchema from '@large-event/database/schemas';
import * as overlaySchema from './overlays';

async function runTeamDMigrations() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/large_event_db';

  console.log('🚀 Running Team D database migrations...');
  console.log(`📍 Database: ${connectionString.replace(/:[^:@]*@/, ':***@')}`);

  const pool = new Pool({
    connectionString,
  });

  const mergedSchema = {
    ...sharedSchema,
    ...overlaySchema,
  };

  const db = drizzle(pool, { schema: mergedSchema });

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Team D migrations completed successfully!');
  } catch (error) {
    console.error('❌ Team D migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTeamDMigrations();