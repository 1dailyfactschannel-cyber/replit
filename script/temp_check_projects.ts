import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkProjects() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log('Checking projects table...');
    const res = await client.query('SELECT * FROM projects');
    console.log('Projects:', res.rows);
  } catch (err) {
    console.error('Error checking projects table:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProjects();
