import re

# Read the file
with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the old logic with new logic
old_code = '''      // Если задача перемещается в колонку "Готово", обновляем её статус
      if (updateData.columnId) {
        const column = await storage.getColumn(updateData.columnId);
        if (column && column.name === "Готово") {
          updateData.status = "done";
        } else if (column) {
          // Если перемещаем из "Готово" в другую колонку, меняем статус обратно
          updateData.status = "В планах";
        }
      }'''

new_code = '''      // Если задача перемещается в колонку, обновляем её статус в зависимости от названия колонки
      if (updateData.columnId) {
        const column = await storage.getColumn(updateData.columnId);
        if (column && column.name) {
          const columnName = column.name.toLowerCase();
          if (columnName === 'готово' || columnName === 'done' || columnName === 'completed') {
            updateData.status = 'done';
          } else if (columnName === 'на проверке' || columnName === 'review' || columnName === 'testing') {
            updateData.status = 'review';
          } else if (columnName === 'в работе' || columnName === 'in progress' || columnName === 'in_progress') {
            updateData.status = 'in_progress';
          } else {
            updateData.status = 'todo';
          }
          console.log('[PATCH] Column:', column.name, '-> status:', updateData.status);
        }
      }'''

content = content.replace(old_code, new_code)

# Write back
with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Fixed routes.ts column name mapping!')
