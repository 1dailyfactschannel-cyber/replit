import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://teamsync_admin:D2rGkB6CaIwpb@89.208.14.253:5434/teamsync_prod";

async function cleanupAllTestData() {
  console.log("Connecting to database...");
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    console.log("\n=== ОЧИСТКА ТЕСТОВЫХ ДАННЫХ ===\n");

    // 1. Get all test users
    const allUsers = await db.select().from(schema.users);
    const testUsers = allUsers.filter(user => 
      user.username?.includes('test') ||
      user.username?.includes('qwe') ||
      user.username?.includes('asd') ||
      user.username?.includes('123') ||
      user.email?.includes('test') ||
      user.email?.includes('example')
    );

    const testUserIds = testUsers.map(u => u.id);
    console.log(`Найдено тестовых пользователей: ${testUsers.length}`);
    testUsers.forEach(u => console.log(`  - ${u.username} (${u.email})`));

    if (testUserIds.length > 0) {
      // 2. Delete task observers for test users
      console.log("\n1. Удаление наблюдателей задач...");
      await db.delete(schema.taskObservers).where(inArray(schema.taskObservers.userId, testUserIds));
      console.log("   ✓ Наблюдатели удалены");

      // 3. Delete comments by test users
      console.log("\n2. Удаление комментариев тестовых пользователей...");
      await db.delete(schema.comments).where(inArray(schema.comments.authorId, testUserIds));
      console.log("   ✓ Комментарии удалены");

      // 4. Delete subtasks of tasks created by test users
      console.log("\n3. Удаление подзадач...");
      const testUserTasks = await db.select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(inArray(schema.tasks.reporterId, testUserIds));
      const testTaskIds = testUserTasks.map(t => t.id);
      
      if (testTaskIds.length > 0) {
        await db.delete(schema.subtasks).where(inArray(schema.subtasks.taskId, testTaskIds));
        console.log(`   ✓ Подзадачи удалены (${testTaskIds.length} задач)`);
      }

      // 5. Delete tasks created by or assigned to test users
      console.log("\n4. Удаление задач...");
      await db.delete(schema.tasks).where(
        inArray(schema.tasks.reporterId, testUserIds)
      );
      await db.delete(schema.tasks).where(
        inArray(schema.tasks.assigneeId, testUserIds)
      );
      console.log("   ✓ Задачи удалены");

      // 6. Delete team memberships
      console.log("\n5. Удаление членов команд...");
      await db.delete(schema.teamMembers).where(inArray(schema.teamMembers.userId, testUserIds));
      console.log("   ✓ Члены команд удалены");

      // 7. Delete user roles
      console.log("\n6. Удаление ролей пользователей...");
      await db.delete(schema.userRoles).where(inArray(schema.userRoles.userId, testUserIds));
      console.log("   ✓ Роли удалены");

      // 8. Delete notifications
      console.log("\n7. Удаление уведомлений...");
      try {
        await db.delete(schema.notifications).where(inArray(schema.notifications.userId, testUserIds));
        console.log("   ✓ Уведомления удалены");
      } catch (e) {
        console.log("   ⚠ Таблица notifications не существует, пропускаем");
      }

      // 9. Delete chat messages
      console.log("\n8. Удаление сообщений чата...");
      await db.delete(schema.messages).where(inArray(schema.messages.senderId, testUserIds));
      console.log("   ✓ Сообщения удалены");

      // 10. Delete chat participants
      console.log("\n9. Удаление участников чатов...");
      await db.delete(schema.chatParticipants).where(inArray(schema.chatParticipants.userId, testUserIds));
      console.log("   ✓ Участники чатов удалены");

      // 11. Finally delete test users
      console.log("\n10. Удаление тестовых пользователей...");
      for (const userId of testUserIds) {
        try {
          await db.delete(schema.users).where(eq(schema.users.id, userId));
          console.log(`   ✓ Удален пользователь с ID: ${userId}`);
        } catch (error) {
          console.error(`   ✗ Ошибка удаления пользователя ${userId}:`, error);
        }
      }
    }

    // 12. Delete test projects and boards
    console.log("\n11. Удаление тестовых проектов и досок...");
    const allProjects = await db.select().from(schema.projects);
    const testProjects = allProjects.filter(p => 
      p.name?.toLowerCase().includes('test') ||
      p.name?.toLowerCase().includes('проект 1') ||
      p.name?.includes('123') ||
      p.description?.toLowerCase()?.includes('test')
    );

    for (const project of testProjects) {
      try {
        // Delete related boards and columns
        const boards = await db.select().from(schema.boards).where(eq(schema.boards.projectId, project.id));
        for (const board of boards) {
          await db.delete(schema.boardColumns).where(eq(schema.boardColumns.boardId, board.id));
          await db.delete(schema.boards).where(eq(schema.boards.id, board.id));
        }
        await db.delete(schema.projects).where(eq(schema.projects.id, project.id));
        console.log(`   ✓ Удален проект: ${project.name}`);
      } catch (error) {
        console.error(`   ✗ Ошибка удаления проекта ${project.name}:`, error);
      }
    }

    console.log("\n=== РЕЗУЛЬТАТ ===");
    const remainingUsers = await db.select().from(schema.users);
    const remainingProjects = await db.select().from(schema.projects);
    const remainingTasks = await db.select().from(schema.tasks);

    console.log(`Пользователей: ${remainingUsers.length}`);
    remainingUsers.forEach(u => console.log(`  - ${u.username} (${u.email})`));
    console.log(`\nПроектов: ${remainingProjects.length}`);
    remainingProjects.forEach(p => console.log(`  - ${p.name}`));
    console.log(`\nЗадач: ${remainingTasks.length}`);

    console.log("\n✅ Очистка завершена!");

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await client.end();
  }
}

cleanupAllTestData();
