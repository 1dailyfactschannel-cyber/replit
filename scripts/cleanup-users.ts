import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://teamsync_admin:D2rGkB6CaIwpb@89.208.14.253:5434/teamsync_prod";

async function listAndCleanupUsers() {
  console.log("Connecting to database...");
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    // Get all users
    const users = await db.select().from(schema.users);
    
    console.log("\n=== ВСЕ ПОЛЬЗОВАТЕЛИ ===");
    console.log(`Всего пользователей: ${users.length}\n`);
    
    users.forEach((user, index) => {
      const isTestUser = 
        user.username?.includes('test') ||
        user.username?.includes('qwe') ||
        user.username?.includes('asd') ||
        user.username?.includes('123') ||
        user.email?.includes('test') ||
        user.email?.includes('example') ||
        !user.email?.includes('@');
      
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Тестовый: ${isTestUser ? 'ДА ⚠️' : 'Нет ✓'}`);
      console.log("");
    });

    // Find test users
    const testUsers = users.filter(user => 
      user.username?.includes('test') ||
      user.username?.includes('qwe') ||
      user.username?.includes('asd') ||
      user.username?.includes('123') ||
      user.email?.includes('test') ||
      user.email?.includes('example') ||
      !user.email?.includes('@')
    );

    console.log(`\n=== ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ (найдено: ${testUsers.length}) ===`);
    testUsers.forEach(user => {
      console.log(`- ${user.username} (${user.email}) [ID: ${user.id}]`);
    });

    if (testUsers.length > 0) {
      console.log("\n=== УДАЛЕНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ ===");
      for (const user of testUsers) {
        try {
          // Delete related data first
          await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
          await db.delete(schema.teamMembers).where(eq(schema.teamMembers.userId, user.id));
          await db.delete(schema.taskObservers).where(eq(schema.taskObservers.userId, user.id));
          
          // Delete user
          await db.delete(schema.users).where(eq(schema.users.id, user.id));
          console.log(`✓ Удален: ${user.username} (${user.email})`);
        } catch (error) {
          console.error(`✗ Ошибка удаления ${user.username}:`, error);
        }
      }
      console.log("\n✅ Тестовые пользователи удалены!");
    }

    // Show remaining users
    const remainingUsers = await db.select().from(schema.users);
    console.log(`\n=== ОСТАВШИЕСЯ ПОЛЬЗОВАТЕЛИ (${remainingUsers.length}) ===`);
    remainingUsers.forEach(user => {
      console.log(`- ${user.username} (${user.email})`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

listAndCleanupUsers();
