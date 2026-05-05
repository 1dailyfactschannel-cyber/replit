import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  // Find the unpublished news
  const [news] = await sql`SELECT id, title, is_published FROM news WHERE is_published = false ORDER BY created_at DESC LIMIT 1`;
  
  if (!news) {
    console.log('No unpublished news found');
    await sql.end();
    return;
  }
  
  console.log('Found unpublished news:', news);
  
  // Check notifications before publish
  const before = await sql`SELECT COUNT(*) as count FROM notifications WHERE type = 'news'`;
  console.log('Notifications before publish:', before[0].count);
  
  await sql.end();
}

main().catch(console.error);
