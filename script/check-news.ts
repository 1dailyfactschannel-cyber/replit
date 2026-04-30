import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const news = await sql`SELECT id, title, is_published, created_at FROM news ORDER BY created_at DESC LIMIT 5`;
  console.log('NEWS:', JSON.stringify(news, null, 2));
  
  const notifs = await sql`SELECT id, type, message, created_at FROM notifications WHERE type = 'news' ORDER BY created_at DESC LIMIT 5`;
  console.log('NOTIFICATIONS:', JSON.stringify(notifs, null, 2));
  
  await sql.end();
}

main().catch(console.error);
