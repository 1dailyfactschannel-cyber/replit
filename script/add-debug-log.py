import re

# Read the file
with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add debug logging to getStatusByColumnName call
old_code = '''        if (column && column.name) {
          updateData.status = getStatusByColumnName(column.name);
          console.log('[PATCH] Column:', column.name, '-> status:', updateData.status);
        }'''

new_code = '''        if (column && column.name) {
          const detectedStatus = getStatusByColumnName(column.name);
          console.log('[DEBUG] Column name:', column.name, '| Normalized:', column.name.toLowerCase().trim(), '| Detected status:', detectedStatus);
          updateData.status = detectedStatus;
          console.log('[PATCH] Column:', column.name, '-> status:', updateData.status);
        }'''

content = content.replace(old_code, new_code)

# Write back
with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Added debug logging!')
