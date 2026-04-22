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

    // Only run numbered migrations (0001_*, 0020_*, etc.)
    const files = allFiles.filter(f => /^\d{4}_/.test(f));

    console.log(`[migrate] Found ${files.length} numbered migration files (skipped ${allFiles.length - files.length} non-numbered)`);

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
