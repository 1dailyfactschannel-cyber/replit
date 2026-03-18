import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeDatabase() {
  console.log('Initializing database...');
  
  // Get database name from environment or extract from DATABASE_URL
  const dbName = process.env.POSTGRES_DB || 
                 process.env.DATABASE_URL?.split('/').pop() || 
                 'db_test';
  
  // Get database user from environment or extract from DATABASE_URL
  const dbUser = process.env.POSTGRES_USER || 'db_test';
  const dbPassword = process.env.POSTGRES_PASSWORD || 'D2rGkB6CaIwpb';
  
  console.log(`Using database name: ${dbName}`);
  console.log(`Using database user: ${dbUser}`);
  
  // Connect to default postgres database first
  // For database initialization, we need superuser privileges
  // Try to use 'postgres' as superuser with the provided password
  const urlMatch = process.env.DATABASE_URL?.match(/postgresql:\/\/([^:]+):([^@]+)@/);
  const urlUser = 'postgres'; // Try superuser first
  const urlPassword = urlMatch ? urlMatch[2] : dbPassword;
  
  console.log(`Using superuser: ${urlUser}`);
  
  // Replace the database name in the connection string with 'postgres'
  let defaultConnectionString = process.env.DATABASE_URL;
  if (defaultConnectionString) {
    // Find the last slash and everything after it, replace with /postgres
    const lastSlashIndex = defaultConnectionString.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      defaultConnectionString = defaultConnectionString.substring(0, lastSlashIndex) + '/postgres';
    }
  }
  
  // Fallback to localhost if DATABASE_URL is not set or invalid
  if (!defaultConnectionString || !defaultConnectionString.includes('@')) {
    defaultConnectionString = `postgresql://${urlUser}:${urlPassword}@localhost:5432/postgres`;
  }
  
  console.log(`Connection string: ${defaultConnectionString?.replace(/:[^@]+@/, ':***@')}`);
  
  if (!defaultConnectionString) {
    console.error('❌ DATABASE_URL is not set correctly');
    process.exit(1);
  }

  const sql = postgres(defaultConnectionString, { max: 1 });

  try {
    // Check if database exists
    const dbCheck = await sql`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `;
    
    if (dbCheck.length === 0) {
      console.log(`Creating database ${dbName}...`);
      try {
        await sql`CREATE DATABASE ${dbName}`;
        console.log(`✅ Database ${dbName} created successfully`);
      } catch (error: any) {
        console.log(`⚠️  Could not create database: ${error.message}`);
        console.log(`ℹ️  Assuming database ${dbName} already exists or will be created externally`);
      }
    } else {
      console.log(`ℹ️  Database ${dbName} already exists`);
    }
    
    // Create user if not exists
    try {
      // Check if user exists first
      const userCheck = await sql`SELECT 1 FROM pg_roles WHERE rolname = ${dbUser}`;
      if (userCheck.length === 0) {
        await sql.unsafe(`CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
        console.log(`✅ User ${dbUser} created`);
      } else {
        console.log(`ℹ️  User ${dbUser} already exists`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not create user: ${error.message}`);
      console.log(`ℹ️  Assuming user ${dbUser} already exists or will be created externally`);
    }
    
    // Grant privileges (if we have permission)
    try {
      await sql.unsafe(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`);
      console.log(`✅ Privileges granted to ${dbUser}`);
    } catch (error: any) {
      console.log(`⚠️  Could not grant privileges: ${error.message}`);
      console.log(`ℹ️  Privileges may already be granted or need to be set manually`);
    }
    
    console.log('✅ Database initialization completed');
    
    // Test connection to the new database
    console.log(`Testing connection to ${dbName} database...`);
    
    // Build connection string for the new database
    const newDbConnectionString = process.env.DATABASE_URL || 
                                  `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`;
    
    const testSql = postgres(newDbConnectionString, { max: 1 });
    
    try {
      const result = await testSql`SELECT current_database(), version();`;
      console.log(`✅ Successfully connected to ${dbName} database`);
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
