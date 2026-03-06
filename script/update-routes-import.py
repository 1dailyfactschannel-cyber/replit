import re

# Read the file
with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import after existing imports
old_import = 'import * as schema from "@shared/schema";'
new_import = '''import * as schema from "@shared/schema";
import { getStatusByColumnName } from "../shared/column-status-mapping";'''

content = content.replace(old_import, new_import)

# Replace inline mapping with function call
old_code = '''        if (column && column.name) {
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
        }'''

new_code = '''        if (column && column.name) {
          updateData.status = getStatusByColumnName(column.name);
          console.log('[PATCH] Column:', column.name, '-> status:', updateData.status);
        }'''

content = content.replace(old_code, new_code)

# Write back
with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Updated routes.ts to use getStatusByColumnName!')
