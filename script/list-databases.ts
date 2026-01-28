import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function listDatabases() {
  console.log('Listing available databases...');
  
  // Connect to default postgres database to list all databases
  const connectionString = process.env.DATABASE_URL?.replace(/\/[^\/]*$/, '/postgres');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connectionString,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
      console.log('Available databases:');
      result.rows.forEach(row => {
        console.log(`  - ${row.datname}`);
      });
      
      // Also check if our target database exists
      const dbName = process.env.DATABASE_URL?.split('/').pop();
      const dbExists = result.rows.some(row => row.datname === dbName);
      
      if (dbExists) {
        console.log(`✅ Database ${dbName} exists`);
      } else {
        console.log(`❌ Database ${dbName} does not exist`);
      }
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('❌ Failed to list databases:');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the function
listDatabases();