import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}

if (existsSync(".env")) {
  config({ path: ".env" });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to Vercel env vars or .env.local before running Drizzle commands.");
}

export default defineConfig({
  schema: "./src/schema/**/*.{ts,js}",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl
  }
});
