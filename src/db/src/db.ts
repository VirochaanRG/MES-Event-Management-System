import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schemas from './schemas';
// Load environment variables from .env
import { config } from "../../config/config";

// Create a Postgres connection pool
const pool = new Pool({
  connectionString: config.DATABASE_URL,
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