import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function getTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'");
    console.log(res.rows.map(r => r.tablename).join('\n'));
  } finally {
    client.release();
    await pool.end();
  }
}

getTables();
