import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[migrate] DATABASE_URL not set, skipping migrations');
    return;
  }

  console.log('[migrate] Connecting to database for migrations...');

  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('[migrate] Migrations directory not found:', migrationsDir);
      return;
    }

    const allFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Only run the newest migrations that add missing columns
    // Skip all older migrations to avoid partial-application errors
    const targetFiles = ['0020_add_work_time.sql', '0021_add_missing_columns.sql'];
    const files = allFiles.filter(f => targetFiles.includes(f));

    console.log(`[migrate] Will run ${files.length} targeted migration(s)`);

    for (const file of files) {
      const filepath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filepath, 'utf-8');
      console.log(`[migrate] Running: ${file}`);
      
      const client = postgres(dbUrl, { max: 1 });
      try {
        await client.unsafe(sql);
        console.log(`[migrate] ✓ ${file}`);
      } catch (err) {
        if (err.message && (err.message.includes('already exists') || err.message.includes('AlreadyExists'))) {
          console.log(`[migrate] ⊘ ${file} (already applied)`);
        } else {
          console.error(`[migrate] ✗ ${file} failed:`, err.message);
        }
      } finally {
        await client.end().catch(() => {});
      }
    }

    console.log('[migrate] Migrations completed');
  } catch (error) {
    console.error('[migrate] Migration error:', error.message);
  }
}

runMigrations();
