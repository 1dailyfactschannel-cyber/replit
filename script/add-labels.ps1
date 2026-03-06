$c = Get-Content 'client\src\components\kanban\TaskDetailsModal.tsx' -Raw -Encoding UTF8;
$old = '              {/* Priority Section */}' + [Environment]::NewLine + '              <div className="space-y-1.5">' + [Environment]::NewLine + '                <Select';
$new = '              {/* Priority Section */}' + [Environment]::NewLine + '              <div className="space-y-1.5">' + [Environment]::NewLine + '                <label className="text-xs font-medium text-muted-foreground">Приоритет</label>' + [Environment]::NewLine + '                <Select';
$c = $c.Replace($old, $new);
$old2 = '              {/* Task Type Section */}' + [Environment]::NewLine + '              <div className="space-y-1.5">' + [Environment]::NewLine + '                <Select';
$new2 = '              {/* Task Type Section */}' + [Environment]::NewLine + '              <div className="space-y-1.5">' + [Environment]::NewLine + '                <label className="text-xs font-medium text-muted-foreground">Тип задачи</label>' + [Environment]::NewLine + '                <Select';
$c = $c.Replace($old2, $new2);
Set-Content 'client\src\components\kanban\TaskDetailsModal.tsx' $c -Encoding UTF8 -NoNewline;
Write-Host 'Done'
