import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { events } from './schemas/events';
import { form } from './schemas/form';
import * as schemas from './schemas';
// Load environment variables from .env
dotenv.config();

// Create a Postgres connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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



// Initialize drizzle ORM
export const db = drizzle(pool, { schema: schemas });