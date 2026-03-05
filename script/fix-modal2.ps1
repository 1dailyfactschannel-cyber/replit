$c = Get-Content 'client\src\components\kanban\TaskDetailsModal.tsx' -Raw;
$old = '              {/* Attachments Section */}' + [Environment]::NewLine + '              <div className="space-y-2">';
$new = '              {/* Attachments Section */}' + [Environment]::NewLine + '              {showAttachments && (' + [Environment]::NewLine + '              <div className="space-y-2">';
$c = $c.Replace($old, $new);
Set-Content 'client\src\components\kanban\TaskDetailsModal.tsx' $c -Encoding UTF8 -NoNewline;
Write-Host 'Done'
