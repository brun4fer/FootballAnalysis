import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL is not set. Drizzle client will throw if used.");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

