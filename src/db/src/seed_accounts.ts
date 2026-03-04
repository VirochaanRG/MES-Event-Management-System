import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "./schemas/users"; // adjust the import path if needed
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import bcrypt from 'bcrypt';
// dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new Pool({
  connectionString: "postgres://postgres:password@localhost:5432/db",
});

const db = drizzle(pool);

async function seed()
{
  console.log("Seeding test accounts...");
  const passwordHash = await bcrypt.hash("test1234", 10);
  await db.insert(users).values([
    {
      email: "test1@test.com",
      passwordHash: passwordHash,
      roles: ["user"],
    },
    {
      email: "testa1@test.com",
      passwordHash: passwordHash,
      roles: ["user", "admin", "all"],
    },
    {
      email: "test2@test.com",
      passwordHash: passwordHash,
      roles: ["user"],
    },
    {
      email: "testa2@test.com",
      passwordHash: passwordHash,
      roles: ["user", "admin", "all"],
    },
  ]);
  console.log("Accounts inserted successfully!");
  await pool.end();
}

seed().catch((err) =>
{
  console.error("Error seeding events:", err);
  pool.end();
});