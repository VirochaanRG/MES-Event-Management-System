import { drizzle } from "drizzle-orm/node-postgres";
import { events } from "./schemas/events";
import { users } from "./schemas/users"; // adjust the import path if needed
// adjust the import path if needed
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";
import bcrypt from 'bcrypt';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});



const db = drizzle(pool);

async function seed()
{
  console.log("Seeding test events...");
  const DEFAULT_REGISTRATION_FORM = {
    questions: [
      {
        id: '1',
        label: 'First Name',
        question_type: 'text_answer',
        options: [],
        required: true
      },
      {
        id: '2',
        label: 'Last Name',
        question_type: 'text_answer',
        options: [],
        required: true
      },
      {
        id: '3',
        label: 'Email',
        question_type: 'text_answer',
        options: [],
        required: true
      }
    ]
  };
  await db.insert(events).values([
    {
      title: "Test Event 1",
      description: "This is a sample event for testing purposes.",
      location: "Test Location A",
      startTime: new Date("2026-01-10T10:00:00Z"),
      endTime: new Date("2026-01-10T12:00:00Z"),
      capacity: 50,
      isPublic: true,
      status: "scheduled",
      registrationForm: DEFAULT_REGISTRATION_FORM,
    },
    {
      title: "Test Event 2",
      description: "A simple placeholder event for local testing.",
      location: "Test Location B",
      startTime: new Date("2026-02-15T14:00:00Z"),
      endTime: new Date("2026-02-15T16:00:00Z"),
      capacity: 30,
      isPublic: false,
      status: "scheduled",
      registrationForm: DEFAULT_REGISTRATION_FORM,
    },
    {
      title: "Test Event 3",
      description: "Third test event for verifying inserts and queries.",
      location: "Test Location C",
      startTime: new Date("2026-03-05T09:00:00Z"),
      endTime: new Date("2026-03-05T11:00:00Z"),
      capacity: 100,
      isPublic: true,
      status: "scheduled",
      registrationForm: DEFAULT_REGISTRATION_FORM,
    },
    {
      title: "Test Event 4",
      description: "Placeholder data for local development testing.",
      location: "Test Location D",
      startTime: new Date("2026-04-20T13:00:00Z"),
      endTime: new Date("2026-04-20T15:00:00Z"),
      capacity: 75,
      isPublic: true,
      status: "scheduled",
      registrationForm: DEFAULT_REGISTRATION_FORM,
    },
    {
      title: "Test Event 5",
      description: "Fifth test event entry for database seeding.",
      location: "Test Location E",
      startTime: new Date("2026-05-30T18:00:00Z"),
      endTime: new Date("2026-05-30T20:00:00Z"),
      capacity: 25,
      isPublic: false,
      status: "scheduled",
      registrationForm: DEFAULT_REGISTRATION_FORM,
    },
  ]);
  console.log("5 test events inserted successfully!");
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
