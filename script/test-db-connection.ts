import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  try {
    // Test connection with simple query
    console.log('Executing test query...');
    
    const version = await sql`SELECT version();`;
    console.log('✅ Database connection successful!');
    console.log('PostgreSQL Version:', version[0].version);
    
    // Test if database exists and is accessible
    const dbResult = await sql`SELECT current_database();`;
    console.log('Connected to database:', dbResult[0].current_database);
    
    // Test if we can list tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    if (tables.length > 0) {
      console.log('Existing tables:');
      tables.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('No tables found in public schema');
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
    await sql.end();
  }
}

// Run the test
testDatabaseConnection();
