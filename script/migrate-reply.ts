import pg from 'pg';
const { Pool } = pg;

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://db_test:D2rGkB6CaIwpb@10.30.0.136:5532/db_test'
  });

  try {
    // Try to add column with GRANTEE check
    try {
      await pool.query(`
        ALTER TABLE messages ADD COLUMN reply_to_id UUID;
      `);
      console.log('✓ Added reply_to_id column');
    } catch (e: any) {
      if (e.code === '42701') { // duplicate column
        console.log('✓ reply_to_id column already exists');
      } else {
        console.log('Could not add column directly:', e.message);
      }
    }

    // Add foreign key
    try {
      await pool.query(`
        ALTER TABLE messages 
        ADD CONSTRAINT messages_reply_to_id_fkey 
        FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;
      `);
      console.log('✓ Added foreign key constraint');
    } catch (e: any) {
      if (e.code === '42860') { // duplicate constraint
        console.log('✓ Foreign key already exists');
      } else {
        console.log('Could not add constraint:', e.message);
      }
    }

    // Create index
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS messages_reply_to_id_idx ON messages(reply_to_id);
      `);
      console.log('✓ Created index');
    } catch (e: any) {
      console.log('Could not create index:', e.message);
    }

    // Verify
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'reply_to_id'
    `);
    
    console.log(`\nreply_to_id exists: ${columns.rows.length > 0 ? 'YES ✓' : 'NO ✗'}`);

  } finally {
    await pool.end();
  }
}

migrate();
