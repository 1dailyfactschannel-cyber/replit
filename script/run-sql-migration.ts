import { Pool } from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runSqlMigration() {
  console.log('🚀 Running SQL migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });

  try {
    const client = await pool.connect();
    
    try {
      // Read the SQL migration file
      const migrationPath = join(__dirname, '../migrations/0001_initial_schema.sql');
      const sql = readFileSync(migrationPath, 'utf8');
      
      console.log('📝 Executing SQL migration...');
      
      // Split SQL into statements (simple approach)
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      let executedCount = 0;
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await client.query(statement);
            executedCount++;
          } catch (error: any) {
            // Skip errors for already existing objects
            if (error.code !== '42P07' && error.code !== '42710' && error.code !== '23505') {
              console.warn(`⚠️  Warning executing statement: ${error.message}`);
            }
          }
        }
      }
      
      console.log(`✅ Executed ${executedCount} SQL statements`);
      
      // Verify tables were created
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log('\n📋 Created tables:');
      result.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
      
      console.log(`\n✅ Total tables created: ${result.rowCount}`);
      
    } finally {
      client.release();
    }
    
    console.log('✅ SQL migration completed successfully');
    
  } catch (error: any) {
    console.error('❌ SQL migration failed:');
    console.error('Error:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runSqlMigration();