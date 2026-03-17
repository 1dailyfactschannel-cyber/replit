import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('🚀 Running migration: Make calls.receiver_id nullable...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  try {
    // Execute the ALTER TABLE command
    await db.execute(sql`ALTER TABLE calls ALTER COLUMN receiver_id DROP NOT NULL`);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - calls.receiver_id is now nullable');
    
    // Verify the change
    const result = await db.execute(sql`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'calls' AND column_name = 'receiver_id'
    `);
    
    if (result.length > 0) {
      console.log(`   - Verified: is_nullable = ${result[0].is_nullable}`);
    }
    
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('does not exist')) {
      console.log('ℹ️  Migration already applied or column not found');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

runMigration();
