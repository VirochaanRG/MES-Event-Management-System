import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';


// Load environment variables from .env
dotenv.config();
export default defineConfig({
  schema: "./src/schemas",
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:KreRSCsiYBjMoNufsEDnuFXQgIrKMaCp@mainline.proxy.rlwy.net:25707/railway',
  },
  verbose: true,
  strict: true,
});