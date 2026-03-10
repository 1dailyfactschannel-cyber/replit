import postgres from 'postgres';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('Reading migration file...');
    const migrationPath = join(process.cwd(), 'migrations', 'add_yandex_calendar.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'yandex%'
      ORDER BY table_name
    `;
    
    console.log('\nCreated tables:');
    tables.forEach((t: any) => console.log(`  ✓ ${t.table_name}`));

  } catch (error: any) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
