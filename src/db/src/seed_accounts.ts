import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "./schemas/users"; // adjust the import path if needed
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import bcrypt from 'bcrypt';
// dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { config } from "../../config/config";
const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

const db = drizzle(pool);

async function seed()
{
  console.log("Seeding test accounts...");
  const passwordHash = await bcrypt.hash("test1234", 10);
  await db.insert(users).values([
    {
      email: "t1@test.com",
      passwordHash: passwordHash,
      roles: ["user"],
    },
    {
      email: "ta1@test.com",
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