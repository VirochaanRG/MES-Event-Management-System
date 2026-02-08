import { defineConfig } from 'drizzle-kit';

import { config } from "../config/config";

// Load environment variables from .env
;
export default defineConfig({
  schema: "./src/schemas",
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});