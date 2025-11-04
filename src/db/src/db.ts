import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { events } from './schemas/events';

// Load environment variables from .env
dotenv.config();

// Create a Postgres connection pool
const pool = new Pool({
  connectionString: "postgres://postgres:password@localhost:5432/db",
});
pool.connect()
  .then((client) =>
  {
    console.log('✅ Connected to PostgreSQL!');
    client.release();
  })
  .catch((err) =>
  {
    console.error('❌ Failed to connect to PostgreSQL:');
    console.error(err);
  });
// Define schema object for drizzle
const schema = { events };

// Initialize drizzle ORM
export const db = drizzle(pool, { schema });