import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgresql://teamsync_admin:D2rGkB6CaIwpb@89.208.14.253:5434/teamsync_prod";

async function addIndexes() {
  console.log("Connecting to database...");
  const client = postgres(connectionString);

  try {
    console.log("\n=== Добавление индексов для оптимизации ===\n");

    // Add indexes for subtasks
    await client`CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON subtasks(task_id);`;
    console.log("✓ Индекс subtasks_task_id_idx создан");

    // Add indexes for comments
    await client`CREATE INDEX IF NOT EXISTS comments_task_id_idx ON comments(task_id);`;
    console.log("✓ Индекс comments_task_id_idx создан");
    await client`CREATE INDEX IF NOT EXISTS comments_author_id_idx ON comments(author_id);`;
    console.log("✓ Индекс comments_author_id_idx создан");
    await client`CREATE INDEX IF NOT EXISTS comments_created_at_idx ON comments(created_at);`;
    console.log("✓ Индекс comments_created_at_idx создан");

    // Add indexes for messages (chat)
    await client`CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages(chat_id);`;
    console.log("✓ Индекс messages_chat_id_idx создан");
    await client`CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);`;
    console.log("✓ Индекс messages_sender_id_idx создан");

    // Add indexes for boards
    await client`CREATE INDEX IF NOT EXISTS boards_project_id_idx ON boards(project_id);`;
    console.log("✓ Индекс boards_project_id_idx создан");

    // Add indexes for board columns
    await client`CREATE INDEX IF NOT EXISTS board_columns_board_id_idx ON board_columns(board_id);`;
    console.log("✓ Индекс board_columns_board_id_idx создан");

    // Add indexes for projects
    await client`CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);`;
    console.log("✓ Индекс projects_owner_id_idx создан");
    await client`CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);`;
    console.log("✓ Индекс projects_status_idx создан");

    // Add indexes for task observers
    await client`CREATE INDEX IF NOT EXISTS task_observers_task_id_idx ON task_observers(task_id);`;
    console.log("✓ Индекс task_observers_task_id_idx создан");
    await client`CREATE INDEX IF NOT EXISTS task_observers_user_id_idx ON task_observers(user_id);`;
    console.log("✓ Индекс task_observers_user_id_idx создан");

    // Add partial index for active tasks (common query)
    await client`CREATE INDEX IF NOT EXISTS tasks_active_idx ON tasks(board_id, column_id) WHERE status != 'done';`;
    console.log("✓ Частичный индекс tasks_active_idx создан");

    // Analyze tables for query planner
    await client`ANALYZE users;`;
    await client`ANALYZE tasks;`;
    await client`ANALYZE projects;`;
    await client`ANALYZE comments;`;
    await client`ANALYZE messages;`;
    console.log("✓ Таблицы проанализированы для оптимизатора запросов");

    console.log("\n✅ Все индексы успешно созданы!");

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await client.end();
  }
}

addIndexes();
