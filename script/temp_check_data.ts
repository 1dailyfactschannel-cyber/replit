import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkTable(tableName: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log(`Checking content of table: ${tableName}`);
    const res = await client.query(`SELECT * FROM ${tableName}`);
    console.log(`Found ${res.rowCount} rows in ${tableName}.`);
    if (res.rowCount > 0) {
      console.log('Sample data:', res.rows.slice(0, 5));
    }
  } catch (err) {
    console.error(`Error checking table ${tableName}:`, err);
  } finally {
    client.release();
    await pool.end();
  }
}

(async () => {
  await checkTable('projects');
  await checkTable('tasks');
})();
