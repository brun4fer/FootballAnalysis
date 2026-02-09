const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/postgres';
const pool = new Pool({ connectionString });

(async () => {
  try {
    const res = await pool.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name;");
    console.table(res.rows);
  } catch (e) {
    console.error('ERROR:', e.message || e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
