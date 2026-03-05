$c = Get-Content 'client\src\components\kanban\TaskDetailsModal.tsx' -Raw;
$old = 'const [showAttachments, setShowAttachments] = useState(false);';
$new = 'const [showAttachments, setShowAttachments] = useState(false);' + [Environment]::NewLine + '  const [showSubtasks, setShowSubtasks] = useState(false);';
$c = $c.Replace($old, $new);
Set-Content 'client\src\components\kanban\TaskDetailsModal.tsx' $c -Encoding UTF8 -NoNewline;
Write-Host 'Done'
