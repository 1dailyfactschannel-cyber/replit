import postgres from 'postgres';

async function run() {
  const sql = postgres('postgresql://db_test:D2rGkB6CaIwpb@10.30.0.136:5532/db_test');
  try {
    await sql`ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;`;
    console.log('1. knowledge_sections.workspace_id OK');
  } catch (e) {
    console.error('1. ERROR:', e);
  }
  try {
    await sql`ALTER TABLE knowledge_articles ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;`;
    console.log('2. knowledge_articles.workspace_id OK');
  } catch (e) {
    console.error('2. ERROR:', e);
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_kb_sections_workspace ON knowledge_sections(workspace_id);`;
    console.log('3. idx_kb_sections_workspace OK');
  } catch (e) {
    console.error('3. ERROR:', e);
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_kb_articles_workspace ON knowledge_articles(workspace_id);`;
    console.log('4. idx_kb_articles_workspace OK');
  } catch (e) {
    console.error('4. ERROR:', e);
  }
  await sql.end();
  console.log('Done');
}

run();
