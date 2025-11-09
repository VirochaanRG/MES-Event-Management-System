import { drizzle } from "drizzle-orm/node-postgres";
import { events } from "./schemas/events"; // adjust the import path if needed
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seed()
{
  console.log("DATABASE_URL =", process.env.DATABASE_URL);
  console.log("Seeding test events...");

  await db.insert(events).values([
    {
      title: "Test Event 1",
      description: "This is a sample event for testing purposes.",
      location: "Test Location A",
      startTime: new Date("2025-01-10T10:00:00Z"),
      endTime: new Date("2025-01-10T12:00:00Z"),
      capacity: 50,
      isPublic: true,
      status: "scheduled",
    },
    {
      title: "Test Event 2",
      description: "A simple placeholder event for local testing.",
      location: "Test Location B",
      startTime: new Date("2025-02-15T14:00:00Z"),
      endTime: new Date("2025-02-15T16:00:00Z"),
      capacity: 30,
      isPublic: false,
      status: "scheduled",
    },
    {
      title: "Test Event 3",
      description: "Third test event for verifying inserts and queries.",
      location: "Test Location C",
      startTime: new Date("2025-03-05T09:00:00Z"),
      endTime: new Date("2025-03-05T11:00:00Z"),
      capacity: 100,
      isPublic: true,
      status: "scheduled",
    },
    {
      title: "Test Event 4",
      description: "Placeholder data for local development testing.",
      location: "Test Location D",
      startTime: new Date("2025-04-20T13:00:00Z"),
      endTime: new Date("2025-04-20T15:00:00Z"),
      capacity: 75,
      isPublic: true,
      status: "scheduled",
    },
    {
      title: "Test Event 5",
      description: "Fifth test event entry for database seeding.",
      location: "Test Location E",
      startTime: new Date("2025-05-30T18:00:00Z"),
      endTime: new Date("2025-05-30T20:00:00Z"),
      capacity: 25,
      isPublic: false,
      status: "scheduled",
    },
  ]);

  console.log("5 test events inserted successfully!");
  await pool.end();
}

seed().catch((err) =>
{
  console.error("Error seeding events:", err);
  pool.end();
});