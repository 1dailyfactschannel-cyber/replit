import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set, skipping migrations');
    return;
  }

  console.log('Connecting to database for migrations...');

  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('Migrations directory not found:', migrationsDir);
      return;
    }

    const allFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Only run numbered migrations (0001_*, 0020_*, etc.), skip all_migrations.sql and ad-hoc files
    const files = allFiles.filter(f => /^\d{4}_/.test(f));

    console.log(`Found ${files.length} numbered migration files (skipped ${allFiles.length - files.length} non-numbered)`);

    for (const file of files) {
      const filepath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filepath, 'utf-8');
      console.log(`Running migration: ${file}`);
      
      // Use a fresh client for each migration to avoid transaction state issues
      const client = postgres(dbUrl, { max: 1 });
      try {
        await client.unsafe(sql);
        console.log(`✓ ${file}`);
      } catch (err) {
        if (err.message && (err.message.includes('already exists') || err.message.includes('AlreadyExists'))) {
          console.log(`⊘ ${file} (already applied)`);
        } else {
          console.error(`✗ ${file} failed:`, err.message);
        }
      } finally {
        await client.end();
      }
    }

    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

runMigrations().then(() => {
  console.log('Starting server...');
  import('../dist/index.js').catch((err) => {
    console.error('Server import failed:', err);
    process.exit(1);
  });
}).catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
