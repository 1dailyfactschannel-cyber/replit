import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema';
import { PostgresStorage } from '../server/postgres-storage';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });
const storage = new PostgresStorage(db);

async function main() {
  const [newsItem] = await db.select().from(schema.news).where(eq(schema.news.isPublished, false)).orderBy(schema.news.createdAt).limit(1);
  
  if (!newsItem) {
    console.log('No unpublished news');
    await client.end();
    return;
  }
  
  console.log('Publishing:', newsItem.id, newsItem.title);
  
  const updated = await storage.updateNews(newsItem.id, {
    isPublished: true,
    publishedAt: new Date(),
  });
  
  console.log('Updated:', updated);
  
  // Create notifications
  const allUsers = await db.select({ id: schema.users.id }).from(schema.users);
  console.log('Users count:', allUsers.length);
  
  for (const user of allUsers) {
    await storage.createNotification({
      userId: user.id,
      type: "news",
      message: JSON.stringify({
        action: "news_published",
        newsId: updated.id,
        title: updated.title,
        userName: "Test",
      }),
      link: `/news/${updated.id}`,
      isRead: false,
    });
  }
  
  const notifs = await db.select().from(schema.notifications).where(eq(schema.notifications.type, 'news'));
  console.log('Created notifications:', notifs.length);
  
  await client.end();
}

main().catch(console.error);
