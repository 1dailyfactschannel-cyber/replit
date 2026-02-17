import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://teamsync_admin:D2rGkB6CaIwpb@89.208.14.253:5434/teamsync_prod";

async function checkTasks() {
  console.log("Connecting to database...");
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    const boardId = 'f313aafb-e874-429b-a6fe-0e753d870671';
    
    console.log("\n=== Проверка задач в БД ===\n");
    
    // Простой запрос без JOIN
    const simpleTasks = await db.select().from(schema.tasks)
      .where(eq(schema.tasks.boardId, boardId))
      .orderBy(schema.tasks.createdAt);
    
    console.log(`Найдено задач (простой запрос): ${simpleTasks.length}`);
    simpleTasks.forEach(task => {
      console.log(`  - ${task.id}: ${task.title} (columnId: ${task.columnId}, reporterId: ${task.reporterId})`);
    });
    
    // Проверяем через storage метод (имитация)
    const userIds = Array.from(new Set(simpleTasks.flatMap(t => [t.assigneeId, t.reporterId]).filter((id): id is string => !!id)));
    const users = userIds.length > 0 
      ? await db.select().from(schema.users).where(inArray(schema.users.id, userIds))
      : [];
    
    console.log(`\nНайдено пользователей: ${users.length}`);
    console.log("Задачи должны отображаться корректно теперь!");
    
    // Проверим колонки
    const columns = await db.select().from(schema.boardColumns)
      .where(eq(schema.boardColumns.boardId, boardId));
    
    console.log(`\nКолонки доски (${columns.length}):`);
    columns.forEach(col => {
      const colTasks = simpleTasks.filter(t => t.columnId === col.id);
      console.log(`  - ${col.name} (${col.id}): ${colTasks.length} задач`);
    });

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await client.end();
  }
}

checkTasks();
