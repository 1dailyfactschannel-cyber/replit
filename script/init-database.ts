import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeDatabase() {
  console.log('Initializing database...');
  
  // Connect to default postgres database first
  const defaultConnectionString = process.env.DATABASE_URL?.replace('/ds_test', '/postgres');
  
  if (!defaultConnectionString) {
    console.error('❌ DATABASE_URL is not set correctly');
    process.exit(1);
  }

  const sql = postgres(defaultConnectionString, { max: 1 });

  try {
    // Check if database exists
    const dbCheck = await sql`
      SELECT 1 FROM pg_database WHERE datname = 'ds_test'
    `;
    
    if (dbCheck.length === 0) {
      console.log('Creating database ds_test...');
      await sql`CREATE DATABASE ds_test;`;
      console.log('✅ Database ds_test created successfully');
    } else {
      console.log('ℹ️  Database ds_test already exists');
    }
    
    // Create user if not exists
    try {
      await sql`CREATE USER db_test WITH PASSWORD 'D2rGkB6CaIwpb';`;
      console.log('✅ User db_test created');
    } catch (error: any) {
      if (error.code === '42710') {
        console.log('ℹ️  User db_test already exists');
      } else {
        throw error;
      }
    }
    
    // Grant privileges
    await sql`GRANT ALL PRIVILEGES ON DATABASE ds_test TO db_test;`;
    console.log('✅ Privileges granted to db_test');
    
    console.log('✅ Database initialization completed');
    
    // Test connection to the new database
    console.log('Testing connection to ds_test database...');
    const testSql = postgres(process.env.DATABASE_URL!, { max: 1 });
    
    try {
      const result = await testSql`SELECT current_database(), version();`;
      console.log('✅ Successfully connected to ds_test database');
      console.log('Current database:', result[0].current_database);
      console.log('PostgreSQL version:', result[0].version);
    } finally {
      await testSql.end();
    }
    
  } catch (error: any) {
    console.error('❌ Database initialization failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the initialization
initializeDatabase();
