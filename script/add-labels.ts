import * as fs from 'fs';
const file = 'client/src/components/kanban/TaskDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  /({\\/\\* Priority Section \\*\\/}\\s*\\n\\s*<div className="space-y-1\\.5">\\s*\\n\\s*)(<Select)/,
  '$1<label className="text-xs font-medium text-muted-foreground">Приоритет</label>\\n                $2'
);
content = content.replace(
  /({\\/\\* Task Type Section \\*\\/}\\s*\\n\\s*<div className="space-y-1\\.5">\\s*\\n\\s*)(<Select)/,
  '$1<label className="text-xs font-medium text-muted-foreground">Тип задачи</label>\\n                $2'
);
fs.writeFileSync(file, content, 'utf-8');
console.log('Done');
