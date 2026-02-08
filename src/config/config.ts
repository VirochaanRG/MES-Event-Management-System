import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  ENVIRONMENT: process.env.ENVIRONMENT || "dev",
  VITE_API_URL: process.env.VITE_API_URL || "",
  // Add other environment variables here as needed
} as const;