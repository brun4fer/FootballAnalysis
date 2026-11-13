import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in .env.local or .env.");
  }

  const pool = new Pool({
    connectionString,
    ssl: /neon\.tech/i.test(connectionString) || /sslmode=require/i.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined
  });

  try {
    const migrationPath = resolve(process.cwd(), "src/db/migrations/0022_goal_match_context.sql");
    const migration = await readFile(migrationPath, "utf8");
    await pool.query(migration);

    const verification = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ANY(current_schemas(false))
        AND table_name = 'goals'
        AND column_name IN ('matchday', 'match_date', 'team_venue')
      ORDER BY column_name
    `);

    if (verification.rowCount !== 3) {
      throw new Error("The goal match context migration did not create all expected columns.");
    }

    console.log("Goal match context migration applied successfully. Existing goals were preserved.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
