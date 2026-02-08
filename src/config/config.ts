import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// For ES modules
const rootPath = path.resolve(process.cwd(), ".ENV");

const result = dotenv.config({ path: rootPath })
if (result.error)
{
  console.error("❌ Dotenv Error:", result.error);
}
export const config = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  ENVIRONMENT: process.env.ENVIRONMENT || "dev",
  VITE_API_URL: process.env.VITE_API_URL || "",
  // Add other environment variables here as needed
} as const;