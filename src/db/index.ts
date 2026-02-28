import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it in your environment (Vercel or .env.local).");
}

const useSsl =
  /neon\.tech/i.test(connectionString) ||
  /sslmode=require/i.test(connectionString) ||
  process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

export const db = drizzle(pool, { schema });
