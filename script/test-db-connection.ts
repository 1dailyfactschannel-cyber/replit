import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test connection with simple query
    console.log('Executing test query...');
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT version();');
      console.log('✅ Database connection successful!');
      console.log('PostgreSQL Version:', result.rows[0].version);
      
      // Test if database exists and is accessible
      const dbResult = await client.query('SELECT current_database();');
      console.log('Connected to database:', dbResult.rows[0].current_database);
      
      // Test if we can list tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      if (tablesResult.rows.length > 0) {
        console.log('Existing tables:');
        tablesResult.rows.forEach(row => {
          console.log(`  - ${row.table_name}`);
        });
      } else {
        console.log('No tables found in public schema');
      }
      
    } finally {
      client.release();
    }
    
    console.log('✅ Connection test completed successfully');
    
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection();