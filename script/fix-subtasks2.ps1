$c = Get-Content 'client\src\components\kanban\TaskDetailsModal.tsx' -Raw;
$old = '              {/* Subtasks Section */}' + [Environment]::NewLine + '              <div className="space-y-3">';
$new = '              {/* Subtasks Section */}' + [Environment]::NewLine + '              {showSubtasks && (' + [Environment]::NewLine + '              <div className="space-y-3">';
$c = $c.Replace($old, $new);
Set-Content 'client\src\components\kanban\TaskDetailsModal.tsx' $c -Encoding UTF8 -NoNewline;
Write-Host 'Done'
