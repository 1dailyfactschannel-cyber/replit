$c = Get-Content 'client\src\components\kanban\TaskDetailsModal.tsx' -Raw;
$c = $c.Replace("{/* Priority Section */}", 
'
$menu
'
 + "{/* Priority Section */}");
Set-Content 'client\src\components\kanban\TaskDetailsModal.tsx' $c -Encoding UTF8 -NoNewline;
Write-Host 'Done'
