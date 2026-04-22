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

  const client = postgres(dbUrl, { max: 1 });

  try {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
      const filepath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filepath, 'utf-8');
      console.log(`Running migration: ${file}`);
      try {
        await client.unsafe(sql);
        console.log(`✓ ${file}`);
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(`⊘ ${file} (already applied)`);
        } else {
          console.error(`✗ ${file} failed:`, err.message);
        }
      }
    }

    console.log('Migrations completed');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await client.end();
  }
}

runMigrations().then(() => {
  console.log('Starting server...');
  import('../dist/index.js');
}).catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
