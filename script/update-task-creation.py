import re

# Read the file
with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace task creation to use getStatusByColumnName
old_code = '''      const taskData = {
        ...sanitizedBody,
        boardId: req.params.boardId,
        columnId: req.body.columnId || columns[0].id,
        reporterId: user.id,
        status: req.body.status || "В планах"
      } as any;'''

new_code = '''      // Determine status based on column
      const targetColumnId = req.body.columnId || columns[0].id;
      const targetColumn = await storage.getColumn(targetColumnId);
      const determinedStatus = targetColumn && targetColumn.name 
        ? getStatusByColumnName(targetColumn.name)
        : 'todo';
      
      const taskData = {
        ...sanitizedBody,
        boardId: req.params.boardId,
        columnId: targetColumnId,
        reporterId: user.id,
        status: req.body.status || determinedStatus
      } as any;'''

content = content.replace(old_code, new_code)

# Write back
with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Updated task creation to auto-determine status from column!')
