import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgresql://teamsync_admin:D2rGkB6CaIwpb@89.208.14.253:5434/teamsync_prod";

async function cleanupSessions() {
  console.log("Connecting to database...");
  const client = postgres(connectionString);

  try {
    console.log("\n=== Очистка сессий ===\n");

    // Check if sessions table exists
    const tableExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sessions'
      );
    `;

    if (!tableExists[0].exists) {
      console.log("Таблица sessions не существует. Создание...");
      await client`
        CREATE TABLE IF NOT EXISTS "sessions" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL,
          CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
        );
      `;
      console.log("✓ Таблица sessions создана");
      return;
    }

    // Get all sessions
    const sessions = await client`SELECT sid, sess, expire FROM sessions`;
    console.log(`Всего сессий: ${sessions.length}`);

    // Delete expired sessions
    const expiredCount = await client`
      DELETE FROM sessions 
      WHERE expire < NOW() 
      RETURNING sid;
    `;
    console.log(`✓ Удалено просроченных сессий: ${expiredCount.length}`);

    // Get remaining sessions
    const remainingSessions = await client`SELECT sid, sess, expire FROM sessions`;
    console.log(`Оставшихся сессий: ${remainingSessions.length}`);

    // Get existing user IDs to check for orphaned sessions
    const existingUsers = await client`SELECT id FROM users`;
    const existingUserIds = new Set(existingUsers.map(u => u.id));
    console.log(`\nСуществующих пользователей: ${existingUserIds.size}`);

      // Show active sessions (non-expired)
    if (remainingSessions.length > 0) {
      console.log("\nАктивные сессии:");
      const orphanedSessions: string[] = [];
      
      for (const session of remainingSessions) {
        const sessData = session.sess;
        const passportUser = sessData.passport?.user;
        const isOrphaned = passportUser && !existingUserIds.has(passportUser);
        
        if (isOrphaned) {
          orphanedSessions.push(session.sid);
        }
        
        console.log(`  - SID: ${session.sid.substring(0, 20)}... UserID: ${passportUser || 'N/A'} ${isOrphaned ? '[ORPHANED]' : ''} Expire: ${session.expire}`);
      }

      // Delete orphaned sessions
      if (orphanedSessions.length > 0) {
        console.log(`\nУдаление ${orphanedSessions.length} orphaned сессий...`);
        for (const sid of orphanedSessions) {
          const sidStr = String(sid);
          await client`DELETE FROM sessions WHERE sid = ${sidStr}`;
          console.log(`  ✓ Удалена сессия: ${sidStr.substring(0, 20)}...`);
        }
        console.log(`✓ Удалено orphaned сессий: ${orphanedSessions.length}`);
      }
    }

    console.log("\n✅ Очистка сессий завершена!");

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await client.end();
  }
}

cleanupSessions();
