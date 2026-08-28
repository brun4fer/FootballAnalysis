import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalForMediaDb = globalThis as unknown as { footballMediaPool?: Pool };

function connectionString() {
  const value = process.env.MEDIA_DATABASE_URL?.trim();
  if (!value) throw new Error("Missing MEDIA_DATABASE_URL.");
  return value;
}

export const mediaPool =
  globalForMediaDb.footballMediaPool ??
  new Pool({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: false },
    max: 5
  });

if (process.env.NODE_ENV !== "production") globalForMediaDb.footballMediaPool = mediaPool;

export async function mediaQuery<Row extends QueryResultRow>(text: string, values: unknown[] = []) {
  return mediaPool.query<Row>(text, values);
}

export async function withMediaTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await mediaPool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
