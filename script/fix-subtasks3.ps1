$c = Get-Content 'client\src\components\kanban\TaskDetailsModal.tsx' -Raw;
$old = '              </div>' + [Environment]::NewLine + [Environment]::NewLine + '              {/* Attachments Section */}';
$new = '              </div>' + [Environment]::NewLine + '              )}' + [Environment]::NewLine + [Environment]::NewLine + '              {/* Attachments Section */}';
$c = $c.Replace($old, $new);
Set-Content 'client\src\components\kanban\TaskDetailsModal.tsx' $c -Encoding UTF8 -NoNewline;
Write-Host 'Done'
