import re

# Read the file
with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add helper function after imports
import_section_end = '''const storage = getStorage();
let io: SocketIOServer;'''

helper_function = '''const storage = getStorage();
let io: SocketIOServer;

/**
 * Обеспечивает соответствие статуса задачи названию колонки
 * Если статус не соответствует - обновляет его и логирует изменение
 */
async function ensureTaskStatusMatchesColumn(task: any): Promise<any> {
  if (!task.columnId || !task.status) return task;
  
  try {
    const column = await storage.getColumn(task.columnId);
    if (column && column.name) {
      const expectedStatus = getStatusByColumnName(column.name);
      if (task.status !== expectedStatus) {
        console.warn(
          `[STATUS FIX] Task ${task.id}: status "${task.status}" doesn't match column "${column.name}". Expected: "${expectedStatus}". Updating...`
        );
        // Обновляем статус задачи в базе данных
        await storage.updateTask(task.id, { status: expectedStatus });
        return { ...task, status: expectedStatus };
      }
    }
  } catch (error) {
    console.error('[STATUS FIX] Error checking task status:', error);
  }
  
  return task;
}

/**
 * Обеспечивает соответствие статусов для списка задач
 */
async function ensureAllTasksStatusMatch(tasks: any[]): Promise<any[]> {
  const updatedTasks = await Promise.all(
    tasks.map(task => ensureTaskStatusMatchesColumn(task))
  );
  return updatedTasks;
}
'''

content = content.replace(import_section_end, helper_function)

# Write back
with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Added ensureTaskStatusMatchesColumn helper functions!')
