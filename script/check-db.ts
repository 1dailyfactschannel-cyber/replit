import postgres from 'postgres';

async function checkMessages() {
  const sql = postgres(process.env.DATABASE_URL || 'postgresql://db_test:D2rGkB6CaIwpb@10.30.0.136:5532/db_test');

  try {
    // Check messages table structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `;
    
    console.log('=== Messages table columns ===');
    columns.forEach((row: any) => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if reply_to_id exists
    const hasReplyToId = columns.some((c: any) => c.column_name === 'reply_to_id');
    console.log(`\nreply_to_id column exists: ${hasReplyToId ? 'YES ✓' : 'NO ✗'}`);

    // Check projects
    const projects = await sql`SELECT id, name, status FROM projects`;
    console.log('\n=== Projects ===');
    projects.forEach((p: any) => console.log(`  - ${p.name} (${p.status})`));

    // Check boards
    const boards = await sql`SELECT id, name, project_id FROM boards`;
    console.log('\n=== Boards ===');
    boards.forEach((b: any) => console.log(`  - ${b.name} (project: ${b.project_id})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkMessages();
