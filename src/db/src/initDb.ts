import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
const dbUrl = "postgres://postgres:password@localhost:5432/db";
if (!dbUrl) throw new Error('DATABASE_URL not found in .env');

// Extract database name and build a connection to the default "postgres" DB
const match = dbUrl.match(/\/([^/?]+)(\?.*)?$/);
if (!match) throw new Error('Could not parse database name from DATABASE_URL');
const dbName = match[1];
const baseUrl = dbUrl.replace(`/${dbName}`, '/postgres');

async function ensureDatabaseExists()
{
  const client = new Client({ connectionString: baseUrl });
  await client.connect();

  const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  if (result.rowCount === 0)
  {
    console.log(`📦 Creating database "${dbName}"...`);
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Database "${dbName}" created successfully.`);
  } else
  {
    console.log(`✅ Database "${dbName}" already exists.`);
  }

  await client.end();
}

ensureDatabaseExists().catch((err) =>
{
  console.error('❌ Error creating database:', err);
  process.exit(1);
});