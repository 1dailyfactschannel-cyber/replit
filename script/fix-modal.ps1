$c = Get-Content 'client\src\components\kanban\TaskDetailsModal.tsx' -Raw;
$old = '  const [attachments, setAttachments] = useState';
$new = '  const [showAttachments, setShowAttachments] = useState(false);' + [Environment]::NewLine + '  const [attachments, setAttachments] = useState';
$c = $c.Replace($old, $new);
Set-Content 'client\src\components\kanban\TaskDetailsModal.tsx' $c -Encoding UTF8 -NoNewline;
Write-Host 'Done'
