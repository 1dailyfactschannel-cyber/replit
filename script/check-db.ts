import pg from 'pg';
const { Pool } = pg;

async function checkMessages() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://db_test:D2rGkB6CaIwpb@10.30.0.136:5532/db_test'
  });

  try {
    // Check messages table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    
    console.log('=== Messages table columns ===');
    columns.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if reply_to_id exists
    const hasReplyToId = columns.rows.some(c => c.column_name === 'reply_to_id');
    console.log(`\nreply_to_id column exists: ${hasReplyToId ? 'YES ✓' : 'NO ✗'}`);

    // Check projects
    const projects = await pool.query('SELECT id, name, status FROM projects');
    console.log('\n=== Projects ===');
    projects.rows.forEach(p => console.log(`  - ${p.name} (${p.status})`));

    // Check boards
    const boards = await pool.query('SELECT id, name, project_id FROM boards');
    console.log('\n=== Boards ===');
    boards.rows.forEach(b => console.log(`  - ${b.name} (project: ${b.project_id})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMessages();
