import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  User,
  Tag,
  MessageSquare,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  MoreVertical,
  Calendar,
  Flag,
  Send,
  Paperclip,
  Loader2,
  FileIcon,
  X,
  Download,
  Check,
  Eye,
  ChevronRight,
  Play,
  Bell,
  RefreshCw,
  Link as LinkIcon,
  PanelRight,
  MoreHorizontal,
  AlignLeft,
  CheckSquare,
  Flame,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Save,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast as sonnerToast } from "sonner";

// Status display names in Russian
const statusNames: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  done: "Готово",
  backlog: "Бэклог",
  "К выполнению": "К выполнению",
  "В работе": "В работе",
  "На проверке": "На проверке",
  "Готово": "Готово",
  "Бэклог": "Бэклог",
  "В планах": "В планах",
  "Сделать": "Сделать",
  "Выполняется": "Выполняется",
};

// Status colors
const statusColors: Record<string, string> = {
  todo: "bg-slate-500",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  done: "bg-emerald-500",
  backlog: "bg-gray-400",
  "К выполнению": "bg-slate-500",
  "В работе": "bg-blue-500",
  "На проверке": "bg-amber-500",
  "Готово": "bg-emerald-500",
  "Бэклог": "bg-gray-400",
  "В планах": "bg-purple-500",
  "Сделать": "bg-slate-500",
  "Выполняется": "bg-blue-500",
};

// Format seconds to readable time
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  } else if (minutes > 0) {
    return `${minutes}м ${secs}с`;
  } else {
    return `${secs}с`;
  }
}

// Task Status Timer Component
function TaskStatusTimer({ taskId }: { taskId: string | number | undefined }) {
  const { data: statusSummary = [], isLoading, error } = useQuery<{
    status: string;
    totalSeconds: number;
    count: number;
  }[]>({
    queryKey: ["/api/tasks", taskId, "status-summary"],
    enabled: !!taskId,
    refetchInterval: 1000, // Refetch every second to update timer
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-destructive text-center py-8">
        Ошибка загрузки данных таймера
      </div>
    );
  }

  if (!statusSummary || statusSummary.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-8">
        Нет данных о времени в статусах
      </div>
    );
  }

  // Calculate total time
  const totalTime = statusSummary.reduce((sum, s) => sum + s.totalSeconds, 0);

  return (
    <div className="space-y-2">
      {/* Total time */}
      <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/10">
        <span className="text-xs font-bold text-primary">Общее время</span>
        <span className="text-sm font-bold text-primary">{formatDuration(totalTime)}</span>
      </div>
      
      {/* Status breakdown */}
      <div className="space-y-1">
        {statusSummary.map((item) => (
          <div 
            key={item.status}
            className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", statusColors[item.status] || "bg-gray-400")} />
              <span className="text-xs font-medium text-foreground">{statusNames[item.status] || item.status}</span>
              <span className="text-[10px] text-muted-foreground">({item.count})</span>
            </div>
            <span className="text-xs font-bold text-foreground">{formatDuration(item.totalSeconds)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Action names in Russian
const actionNames: Record<string, string> = {
  created: "создал(-а) задачу",
  updated: "обновил(-а)",
  status_changed: "изменил(-а) статус",
  assignee_changed: "добавил(-а) исполнителя",
  priority_changed: "изменил(-а) приоритет",
  title_changed: "изменил(-а) название",
  description_changed: "изменил(-а) описание",
  due_date_changed: "изменил(-а) срок",
  labels_changed: "изменил(-а) метки",
  comment_added: "добавил(-а) комментарий",
  subtask_created: "добавил(-а) подзадачу",
  subtask_completed: "завершил(-а) подзадачу",
};

// Format date for activity
function formatActivityDate(dateStr: string): { date: string; time: string } {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  
  if (date.toDateString() === today.toDateString()) {
    return { date: 'Сегодня', time: timeStr };
  } else if (date.toDateString() === yesterday.toDateString()) {
    return { date: 'Вчера', time: timeStr };
  } else {
    return { 
      date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
      time: timeStr 
    };
  }
}

// Task Activity History Component
function TaskActivityHistory({ taskId }: { taskId: string | number | undefined }) {
  const { data: history = [], isLoading } = useQuery<{
    id: string;
    taskId: string;
    userId: string | null;
    action: string;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
    user?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      username: string;
      avatar: string | null;
    };
  }[]>({
    queryKey: [`/api/tasks/${taskId}/history`],
    enabled: !!taskId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-8">
        Нет истории изменений
      </div>
    );
  }

  // Group by date
  const groupedHistory = history.reduce((groups, item) => {
    const { date } = formatActivityDate(item.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, typeof history>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedHistory).map(([date, items]) => (
        <div key={date}>
          <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">
            {date}
          </div>
          <div className="space-y-2">
            {items.map((item) => {
              const { time } = formatActivityDate(item.createdAt);
              const userName = item.user 
                ? `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.username
                : 'Система';
              const actionText = actionNames[item.action] || item.action;
              
              return (
                <div key={item.id} className="flex gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">{time}</span>
                      <span className="font-medium text-foreground">{userName}</span>
                      <span className="text-muted-foreground">{actionText}</span>
                      {item.fieldName && item.action !== 'created' && item.action !== 'comment_added' && (
                        <>
                          <span className="text-muted-foreground">поле</span>
                          <span className="font-medium text-foreground">"{item.fieldName}"</span>
                        </>
                      )}
                      {item.newValue && item.action === 'comment_added' && (
                        <span className="text-muted-foreground truncate max-w-[150px]">"{item.newValue}"</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface Task {
  id: number | string;
  title: string;
  description: string;
  status: string;
  priorityId: string;
  type: string;
  boardId: string;
  columnId: string;
  assignee?: { name: string; avatar?: string };
  assigneeId?: string;
  creator: { name: string; date: string; avatar?: string | null };
  dueDate: string;
  labels: string[];
  tags?: string[];
  subtasks: { id: string | number; title: string; completed: boolean; dueDate?: string }[];
  comments: { id: number; author: { name: string; avatar: string }; text: string; date: string; isOwn?: boolean }[];
  history: { id: number; action: string; user: string; date: string }[];
  observers?: { name: string; avatar?: string }[];
  timeSpent?: string;
  isAccepted?: boolean;
  startTime?: number;
  attachments?: { name: string; url: string; size: string; type: string }[];
  project?: string;
  board?: string;
  number?: string;
}

interface TaskDetailsModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (task: Task) => void;
  onAccept?: (taskId: number) => void;
}

export function TaskDetailsModal({
  task,
  open,
  onOpenChange,
  onUpdate,
  onAccept,
}: TaskDetailsModalProps) {
  const queryClient = useQueryClient();

  // Fetch all users for observer selection
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch observers for the task
  const { data: serverObservers = [] } = useQuery<any[]>({
    queryKey: [`/api/tasks/${task?.id}/observers`],
    enabled: !!task?.id && open,
  });

  // Fetch subtasks for the task
  const { data: serverSubtasks = [] } = useQuery<any[]>({
    queryKey: [`/api/tasks/${task?.id}/subtasks`],
    enabled: !!task?.id && open,
    staleTime: 0,
  });
  
  // Debug log
  useEffect(() => {
    if (open && serverSubtasks) {
      console.log("[Subtask] serverSubtasks loaded:", serverSubtasks);
    }
  }, [open, serverSubtasks]);

  // Fetch task details directly to ensure fresh data
  const { data: serverTask } = useQuery<Task>({
    queryKey: ["/api/tasks", task?.id],
    enabled: !!task?.id && open,
    staleTime: 0, // Always fetch fresh data
  });

  const effectiveTask = serverTask || task;

  const [newTitle, setNewTitle] = useState(effectiveTask?.title || "");
  const [newDescription, setNewDescription] = useState(effectiveTask?.description || "");
  
  // Refs to track server state and avoid overwriting user changes
  const lastServerTitleRef = React.useRef(effectiveTask?.title || "");
  const lastServerDescriptionRef = React.useRef(effectiveTask?.description || "");

  // Update local states when task changes or modal opens
  useEffect(() => {
    if (effectiveTask && open) {
      // Sync title only if server value changed
      const serverTitle = effectiveTask.title || "";
      if (serverTitle !== lastServerTitleRef.current) {
        setNewTitle(serverTitle);
        lastServerTitleRef.current = serverTitle;
      }

      // Sync description only if server value changed
      const serverDesc = effectiveTask.description || "";
      if (serverDesc !== lastServerDescriptionRef.current) {
        setNewDescription(serverDesc);
        lastServerDescriptionRef.current = serverDesc;
      }
      
      setLocalSubtasks(effectiveTask.subtasks || []);
      setAttachments(effectiveTask.attachments || []);
      setTaskNumber(effectiveTask.number || (effectiveTask.id ? effectiveTask.id.toString().slice(-4) : ''));
    }
  }, [effectiveTask, open]); // Depend on task and open state to sync data

  // Sync observers with server data
  useEffect(() => {
    if (serverObservers && serverObservers.length > 0) {
      const formattedObservers = serverObservers.map((user: any) => ({
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username,
        avatar: user.avatar,
      }));
      setLocalObservers(formattedObservers);
    } else if (effectiveTask?.observers) {
      setLocalObservers(effectiveTask.observers);
    }
  }, [serverObservers, effectiveTask]);

  // Sync subtasks - при изменении serverSubtasks
  useEffect(() => {
    if (!open) return;
    if (!serverSubtasks || serverSubtasks.length === 0) {
      console.log("[Subtask] No serverSubtasks, skipping sync");
      return;
    }
    
    console.log("[Subtask] Syncing subtasks, serverSubtasks:", serverSubtasks);
    
    // Маппим isCompleted в completed для совместимости
    const mappedSubtasks = serverSubtasks.map((s: any) => ({
      ...s,
      completed: s.isCompleted || s.completed || false
    }));
    
    // Не обновляем если данные идентичны
    const currentIds = localSubtasks.map(s => String(s.id)).sort();
    const serverIds = mappedSubtasks.map((s: any) => String(s.id)).sort();
    const isSame = currentIds.length === serverIds.length && 
                   currentIds.every((id, i) => id === serverIds[i]);
    if (isSame) {
      console.log("[Subtask] Same subtasks, skipping update");
      return;
    }
    
    console.log("[Subtask] Setting localSubtasks to:", mappedSubtasks);
    setLocalSubtasks(mappedSubtasks);
  }, [open, serverSubtasks]);

  // Sync labels with task data (tags field in database)
  useEffect(() => {
    if (effectiveTask?.tags) {
      setLocalLabels(effectiveTask.tags.map((name: string) => ({ name })));
    } else if (effectiveTask?.labels) {
      // Fallback for backward compatibility
      setLocalLabels(effectiveTask.labels.map((name: string) => ({ name })));
    }
  }, [effectiveTask?.tags, effectiveTask?.labels]);

  // Local state for immediate UI updates
  const [localAssignee, setLocalAssignee] = useState<{ name: string; avatar?: string } | null>(null);
  const [localDueDate, setLocalDueDate] = useState<string | null>(null);
  
  // Sync local assignee with task data
  useEffect(() => {
    if (effectiveTask?.assignee) {
      setLocalAssignee(effectiveTask.assignee);
    } else {
      setLocalAssignee(null);
    }
  }, [effectiveTask?.assignee]);

  // Sync local dueDate with task data
  useEffect(() => {
    if (effectiveTask?.dueDate) {
      setLocalDueDate(effectiveTask.dueDate);
    } else {
      setLocalDueDate(null);
    }
  }, [effectiveTask?.dueDate]);

  // Sync local priority with task data
  // Removed localPriority state to rely on optimistic cache updates for single source of truth
  
  const [attachments, setAttachments] = useState<{ name: string; url: string; size: string; type: string }[]>(effectiveTask?.attachments || []);
  // Removed localPriority state
  


  const [localObservers, setLocalObservers] = useState<{ name: string; avatar?: string }[]>(effectiveTask?.observers || []);
  const [localLabels, setLocalLabels] = useState<{ name: string; pending?: boolean }[]>([]);
  const [localSubtasks, setLocalSubtasks] = useState<{ id: string | number; title: string; completed: boolean; isCompleted?: boolean; dueDate?: string; author?: { name: string; avatar?: string } | null; order?: number }[]>(effectiveTask?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [taskNumber, setTaskNumber] = useState(effectiveTask?.number || (effectiveTask?.id ? effectiveTask.id.toString().slice(-4) : ''));
  
  const handleTaskNumberBlur = () => {
    const originalNumber = effectiveTask?.number || (effectiveTask?.id ? effectiveTask.id.toString().slice(-4) : '');
    if (taskNumber !== originalNumber && effectiveTask?.id) {
      console.log("[TaskDetails] Updating task number from", originalNumber, "to", taskNumber);
      handleUpdate({ number: taskNumber });
    }
  };
  
  // Popover states
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [localComments, setLocalComments] = useState<any[]>([]);
  const { data: serverComments = [] } = useQuery<any[]>({
    queryKey: [`/api/tasks/${task?.id}/comments`],
    enabled: !!task?.id,
  });

  const { data: availableLabels = [] } = useQuery<any[]>({
    queryKey: ["/api/labels"],
  });

  const { data: availablePriorities = [] } = useQuery<any[]>({
    queryKey: ["/api/priorities"],
  });

  // Sync server comments only when they actually change
  const prevCommentsRef = useRef<any[]>([]);
  useEffect(() => {
    if (open && serverComments) {
      // Only update if comments actually changed
      const prevIds = prevCommentsRef.current.map((c: any) => c.id).sort().join(',');
      const currentIds = serverComments.map((c: any) => c.id).sort().join(',');
      if (prevIds !== currentIds) {
        prevCommentsRef.current = serverComments;
        setLocalComments(serverComments);
      }
    }
  }, [open, serverComments]);

  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<{ name: string; url: string; size: string; type: string }[]>([]);
  const [isUploadingCommentFile, setIsUploadingCommentFile] = useState(false);
  
  // Mentions functionality
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Filter users for mentions
  const filteredMentionUsers = users.filter((user: any) => {
    const displayName = user.firstName 
      ? `${user.firstName} ${user.lastName || ''}`.trim() 
      : user.username;
    return displayName.toLowerCase().includes(mentionQuery.toLowerCase());
  });
  
  // Handle mention selection
  const handleMentionSelect = (user: any) => {
    const displayName = user.firstName 
      ? `${user.firstName} ${user.lastName || ''}`.trim() 
      : user.username;
    
    // Find the position of @ in the comment
    const lastAtIndex = newComment.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = newComment.slice(0, lastAtIndex);
      const afterQuery = newComment.slice(lastAtIndex + 1 + mentionQuery.length);
      const newValue = `${beforeAt}@${displayName} ${afterQuery}`;
      setNewComment(newValue);
    }
    
    setShowMentions(false);
    setMentionQuery("");
    inputRef.current?.focus();
  };
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Update mutation for database synchronization
  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!task?.id) throw new Error("ID задачи отсутствует");
      
      const res = await apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
      return res.json();
    },
    onSuccess: (data) => {
      // Update local cache immediately to prevent UI flicker/reversion
      if (onUpdate && data) {
        onUpdate(data);
      }

      if (task?.boardId) {
        queryClient.invalidateQueries({ queryKey: ["/api/boards", task.boardId, "full"] });
      }
      
      // Update specific task cache to avoid stale data flicker
      if (task?.id) {
        queryClient.setQueryData(["/api/tasks", task.id], data);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
    },
    onError: (error) => {
      console.error("Update error:", error);
      sonnerToast.error(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      // Revert optimistic update by invalidating cache
      if (task?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id] });
      }
      
      // Rollback local states if needed
      if (task) {
        setNewTitle(task.title || "");
        setNewDescription(task.description || "");
        setLocalSubtasks(task.subtasks || []);
        setLocalObservers(task.observers || []);
        setTaskNumber(task.number || (task.id ? task.id.toString().slice(-4) : ''));
      }
    }
  });

  const handleUpdate = (updates: Partial<Task>) => {
    console.log("[TaskDetails] handleUpdate called with updates:", updates);
    
    if (!task?.id) {
      sonnerToast.error("Ошибка: ID задачи не найден");
      return;
    }

    if (updates.priority) {
      console.log("[TaskDetails] Updating priority to:", updates.priority);
    }
    
    if (typeof task.id === 'string' && task.id.startsWith('temp-')) {
      return;
    }
    
    // Optimistic local task update via Query Cache
    // Removed setLocalPriority(updates.priority);

    queryClient.setQueryData(["/api/tasks", task.id], (old: any) => {
      if (!old) return old;
      
      const newDisplayData: any = {};
      
      // Handle Assignee display update
      if (updates.assigneeId && users) {
        const newAssignee = users.find((u: any) => u.id === updates.assigneeId);
        if (newAssignee) {
          const displayName = newAssignee.firstName 
            ? `${newAssignee.firstName} ${newAssignee.lastName || ''}` 
            : newAssignee.username;
          newDisplayData.assignee = { 
            id: newAssignee.id,
            name: displayName, 
            avatar: newAssignee.avatar 
          };
        }
      }

      return { ...old, ...updates, ...newDisplayData };
    });

    // Optimistic parent update
    if (onUpdate && effectiveTask) {
      console.log("[TaskDetails] Calling onUpdate with:", { ...effectiveTask, ...updates });
      onUpdate({ ...effectiveTask, ...updates });
    }
    
    updateTaskMutation.mutate(updates);
  };

  const handleTitleBlur = () => {
    if (newTitle !== task?.title) {
      handleUpdate({ title: newTitle });
    }
  };

  const handleDescriptionChange = (content: string) => {
    setNewDescription(content);
  };

  const handleDescriptionBlur = (content: string) => {
    if (content !== task?.description) {
      handleUpdate({ description: content });
    }
  };

  const handleCommentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingCommentFile(true);
    const newAttachments = [...commentAttachments];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Failed to upload file");

        const data = await res.json();
        newAttachments.push({
          name: data.name,
          url: data.url,
          size: `${(data.size / 1024).toFixed(1)} KB`,
          type: data.type
        });
      }
      setCommentAttachments(newAttachments);
      sonnerToast.success("Файлы прикреплены к комментарию");
    } catch (error) {
      console.error("Comment file upload error:", error);
      sonnerToast.error("Ошибка при загрузке файлов для комментария");
    } finally {
      setIsUploadingCommentFile(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && commentAttachments.length === 0) return;
    if (!task?.id) return;

    const commentData = {
      content: newComment,
      attachments: commentAttachments
    };

    try {
      const res = await apiRequest("POST", `/api/tasks/${task.id}/comments`, commentData);
      const savedComment = await res.json();
      
      // Add new comment to local state immediately
      setLocalComments(prev => [savedComment, ...prev]);
      setNewComment("");
      setCommentAttachments([]);
      // Don't invalidate here - local state is already updated
      // Query will refetch when modal is reopened
    } catch (error) {
      console.error("Error adding comment:", error);
      sonnerToast.error("Не удалось отправить комментарий");
    }
  };

  const handleAddSubtask = async () => {
    const title = newSubtaskTitle.trim();
    if (!title || !task?.id) return;
    
    // Создаем временную подзадачу для мгновенного отображения
    const tempId = `temp-${Date.now()}`;
    const tempSubtask = {
      id: tempId,
      taskId: task.id,
      title: title,
      completed: false,
      isCompleted: false,
      order: localSubtasks.length,
      author: { name: "Вы" },
      authorId: null
    };
    
    // Мгновенно обновляем UI
    const optimisticSubtasks = [...localSubtasks, tempSubtask];
    setLocalSubtasks(optimisticSubtasks);
    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
    
    // Update parent component immediately
    if (onUpdate && task) {
      onUpdate({
        ...task,
        subtasks: optimisticSubtasks
      });
    }
    
    // Отправляем запрос в фоне
    try {
      console.log("[Subtask] Sending request with title:", title);
      const res = await apiRequest("POST", `/api/tasks/${task.id}/subtasks`, {
        title: title,
        isCompleted: false,
        order: optimisticSubtasks.length - 1
      });
      const newSub = await res.json();
      console.log("[Subtask] Response:", newSub);
      
      // Заменяем временную подзадачу на реальную
      // Маппим поле isCompleted в completed для совместимости
      const mappedSub = {
        ...newSub,
        completed: newSub.isCompleted || newSub.completed || false
      };
      setLocalSubtasks(prev => prev.map(s => s.id === tempId ? mappedSub : s));
      
      if (onUpdate && task) {
        onUpdate({
          ...task,
          subtasks: task.subtasks ? [...task.subtasks, newSub] : [newSub]
        });
      }
      
      // Инвалидируем кэш в фоне
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/subtasks`] });
      // Также инвалидируем кэш доски
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${task?.boardId}/full`] });
    } catch (error) {
      console.error("[Subtask] Error creating subtask:", error);
      // Откатываем изменения при ошибке
      setLocalSubtasks(prev => prev.filter(s => s.id !== tempId));
      if (onUpdate && task) {
        onUpdate({
          ...task,
          subtasks: task.subtasks || []
        });
      }
      sonnerToast.error("Не удалось создать подзадачу");
    }
  };

  const toggleSubtask = async (id: string | number) => {
    const subtask = localSubtasks.find(s => s.id === id);
    if (!subtask) return;

    const newStatus = !subtask.completed;
    
    // Optimistic update
    const updatedSubtasks = localSubtasks.map(sub => 
      sub.id === id ? { ...sub, completed: newStatus } : sub
    );
    setLocalSubtasks(updatedSubtasks);

    try {
      await apiRequest("PATCH", `/api/subtasks/${id}`, {
        isCompleted: newStatus
      });
      
      // Update parent component with new subtasks data
      if (onUpdate && task) {
        onUpdate({
          ...task,
          subtasks: updatedSubtasks
        });
      }
      
      if (task?.boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${task.boardId}/full`] });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/subtasks`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
    } catch (error) {
      // Revert on error
      setLocalSubtasks(localSubtasks);
      sonnerToast.error("Не удалось обновить статус подзадачи");
    }
  };

  const handleDeleteSubtask = async (id: string | number) => {
    // Optimistic update - мгновенно удаляем из UI
    const previousSubtasks = localSubtasks;
    const updatedSubtasks = localSubtasks.filter(sub => sub.id !== id);
    setLocalSubtasks(updatedSubtasks);

    // Мгновенно обновляем parent
    if (onUpdate && task) {
      onUpdate({
        ...task,
        subtasks: updatedSubtasks
      });
    }

    try {
      await apiRequest("DELETE", `/api/subtasks/${id}`);
      
      // Инвалидируем кэш
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/subtasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${task?.boardId}/full`] });
      
      sonnerToast.success("Подзадача удалена");
    } catch (error) {
      console.error("[Subtask] Error deleting subtask:", error);
      // Откатываем при ошибке
      setLocalSubtasks(previousSubtasks);
      if (onUpdate && task) {
        onUpdate({
          ...task,
          subtasks: previousSubtasks
        });
      }
      sonnerToast.error("Не удалось удалить подзадачу");
    }
  };

  const toggleObserver = async (user: { name: string; avatar?: string; userId?: string }) => {
    if (!task?.id) {
      sonnerToast.error("Ошибка: ID задачи не найден");
      return;
    }
    
    const isObserver = localObservers.some(o => o.name === user.name);
    let updatedObservers;
    if (isObserver) {
      updatedObservers = localObservers.filter(o => o.name !== user.name);
    } else {
      updatedObservers = [...localObservers, user];
    }
    setLocalObservers(updatedObservers);

    try {
      // Find userId for the observer
      const targetUser = users.find((u: any) => {
        const displayName = u.firstName ? `${u.firstName} ${u.lastName || ''}` : u.username;
        return displayName === user.name;
      });
      
      if (!targetUser) {
        throw new Error("User not found");
      }

      // Get current observer user IDs
      const currentObserverIds = serverObservers.map((o: any) => o.id);
      let newObserverIds: string[];
      
      if (isObserver) {
        // Remove user from observers
        newObserverIds = currentObserverIds.filter((id: string) => id !== targetUser.id);
      } else {
        // Add user to observers
        newObserverIds = [...currentObserverIds, targetUser.id];
      }

      console.log("[TaskDetails] Updating observers:", { taskId: task.id, newObserverIds });

      // Use the dedicated observers API endpoint
      const res = await apiRequest("POST", `/api/tasks/${task.id}/observers`, {
        userIds: newObserverIds
      });
      
      if (!res.ok) {
        throw new Error("Failed to update observers");
      }
      
      console.log("[TaskDetails] Observers updated successfully");
      
      // Refresh observers data
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}/observers`] });
    } catch (error) {
      console.error("[TaskDetails] Error updating observers:", error);
      setLocalObservers(localObservers);
      sonnerToast.error("Не удалось обновить наблюдателей");
    }
  };

  const handleAddLabel = (labelName: string) => {
    const trimmedLabel = labelName.trim();
    if (!trimmedLabel || localLabels.some(l => l.name === trimmedLabel)) return;

    // Проверяем, существует ли метка уже в availableLabels
    const existingLabel = availableLabels.find((l: any) => l.name === trimmedLabel);
    
    if (existingLabel) {
      // Метка уже существует, просто добавляем её к задаче
      const updatedLabels = [...localLabels, { name: trimmedLabel, pending: false }];
      setLocalLabels(updatedLabels);
      handleUpdate({ tags: updatedLabels.map(l => l.name) });
      return;
    }

    // Метка не существует, создаем новую
    const tempLabel = { name: trimmedLabel, pending: true };
    setLocalLabels(prev => [...prev, tempLabel]);

    createLabel(trimmedLabel).then(result => {
      if (result.success) {
        setLocalLabels(prev => {
          const updatedLabels = prev.map(l => l.name === trimmedLabel ? { ...l, pending: false } : l);
          // Update the task with the new labels (including the newly added one)
          handleUpdate({ tags: updatedLabels.map(l => l.name) });
          return updatedLabels;
        });
        queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      } else {
        setLocalLabels(prev => prev.filter(l => l.name !== trimmedLabel));
      }
    });
  };

  const createLabel = async (labelName: string) => {
    try {
      const response = await apiRequest("POST", "/api/labels", {
        name: labelName.trim(),
        color: "bg-blue-500" // Default color
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "DUPLICATE_LABEL_NAME") {
          return { success: true, alreadyExists: true };
        }
        throw new Error(errorData.message || "Failed to create label");
      }
      
      const newLabel = await response.json();
      return { success: true, label: newLabel };
    } catch (error) {
      console.error("Error creating label:", error);
      sonnerToast.error(`Не удалось создать метку: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      return { success: false };
    }
  };

  const handleRemoveLabel = (labelName: string) => {
    // Optimistic update - remove label immediately from UI
    setLocalLabels(prev => {
      const updatedLabels = prev.filter(l => l.name !== labelName);
      // Update the task with the new labels (excluding the removed one)
      handleUpdate({ tags: updatedLabels.map(l => l.name) });
      return updatedLabels;
    });
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const labelName = e.currentTarget.value;
      if (!labelName.trim()) return;
      
      handleAddLabel(labelName);
      e.currentTarget.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: FileList | null = null;
    if ("target" in e && e.target instanceof HTMLInputElement) {
      files = e.target.files;
    } else if ("dataTransfer" in e) {
      files = e.dataTransfer.files;
    }

    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);

    const uploadedAttachments = [...(attachments || [])];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        // Actual upload to server
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Failed to upload file");

        const data = await res.json();
        uploadedAttachments.push({
          name: data.name,
          url: data.url,
          size: `${(data.size / 1024).toFixed(1)} KB`,
          type: data.type
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setAttachments(uploadedAttachments);
      handleUpdate({ attachments: uploadedAttachments });
      
      sonnerToast.success("Файлы успешно загружены");
    } catch (error) {
      console.error("Upload error:", error);
      sonnerToast.error("Ошибка при загрузке файлов");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e);
  };

  if (!open) return null;

  if (updateTaskMutation.isPending && !task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background border-none shadow-2xl h-[90vh] flex items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Загрузка задачи</DialogTitle>
            <DialogDescription>Пожалуйста, подождите, пока загружаются детали задачи.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return null;
  }

  const safeTask = {
    ...effectiveTask,
    creator: effectiveTask?.creator || { name: "Неизвестно", date: "", avatar: null },
    history: effectiveTask?.history || [],
    labels: effectiveTask?.labels || [],
    subtasks: effectiveTask?.subtasks || [],
    comments: effectiveTask?.comments || [],
    attachments: effectiveTask?.attachments || [],
    type: effectiveTask?.type || "Задача",
    priorityId: effectiveTask?.priorityId || "",
    status: effectiveTask?.status || "В планах",
    dueDate: effectiveTask?.dueDate || "Не установлен",
    project: effectiveTask?.project || "м4",
    board: effectiveTask?.board || "доска"
  };

  const handleOpenChangeWrapper = (newOpen: boolean) => {
    if (!newOpen) {
      // Closing the modal - save unsaved changes
      if (task) {
        if (newTitle !== task.title) {
          handleUpdate({ title: newTitle });
        }
        if (newDescription !== task.description) {
          handleUpdate({ description: newDescription });
        }
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWrapper}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-[1200px] w-[95vw] h-[90vh] max-h-[900px] flex flex-col p-0 gap-0 overflow-hidden bg-background border-none shadow-2xl font-sans"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{safeTask.title || "Детали задачи"}</DialogTitle>
          <DialogDescription>
            Просмотр и редактирование деталей задачи {safeTask.title}.
          </DialogDescription>
        </DialogHeader>
        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[2px] border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none transition-all animate-in fade-in">
            <div className="bg-background/80 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-primary/20">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Paperclip className="w-8 h-8 text-primary animate-bounce" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">Перенесите файлы сюда</p>
                <p className="text-sm text-muted-foreground mt-1">Отпустите, чтобы загрузить в задачу</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Header / Task Number */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-background/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium font-sans">
            <span className="text-foreground/50">#</span>
            <Input 
              value={taskNumber}
              onChange={(e) => setTaskNumber(e.target.value)}
              onBlur={handleTaskNumberBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className="h-6 w-32 text-sm font-medium bg-transparent border-none focus-visible:ring-0 px-0 text-foreground/70"
              placeholder="Номер"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const taskUrl = `${window.location.origin}/projects/${task?.boardId || ''}?task=${task?.id || ''}`;
                navigator.clipboard.writeText(taskUrl);
                sonnerToast.success("Ссылка скопирована");
              }}
              title="Копировать ссылку"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content Scroll Area */}
          <ScrollArea className="flex-1 border-r border-border/40 bg-card/30 relative">
            <div className="p-8 pb-32 space-y-10 max-w-4xl mx-auto">
              {/* Title Section */}
              <div className="space-y-2 relative">
                <div className="relative flex items-center">
                  <Input 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setNewTitle(task?.title || "");
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTitleBlur();
                      }
                    }}
                    className="text-3xl font-bold border-none bg-transparent pr-12 focus-visible:ring-0 h-auto placeholder:text-muted-foreground/30 font-sans text-black dark:text-white"
                    placeholder="Введите название задачи..."
                  />
                  {newTitle !== task?.title && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        handleTitleBlur();
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      title="Сохранить (Enter)"
                    >
                      <Save className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground/80">
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold tracking-tight uppercase">Описание задачи</span>
                </div>
                <div className="bg-secondary/10 rounded-lg p-0.5 border border-border/30 hover:border-border/60 transition-colors">
                  <RichTextEditor 
                    content={newDescription} 
                    onChange={handleDescriptionChange}
                    onBlur={handleDescriptionBlur}
                    placeholder="Добавьте описание..."
                  />
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 text-muted-foreground/80">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold tracking-tight uppercase">
                      Подзадачи 
                      <span className="ml-1.5 text-primary/60">
                        {localSubtasks.filter(s => s.completed).length}/{localSubtasks.length}
                      </span>
                    </span>
                  </div>
                </div>
                
                <Separator className="opacity-40" />

                <div className="space-y-0.5">
                  {localSubtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-secondary/30 transition-all group"
                    >
                      <button 
                        onClick={() => toggleSubtask(sub.id)}
                        className="shrink-0 transition-transform active:scale-90"
                      >
                        {sub.completed ? (
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors" />
                        )}
                      </button>
                      <span className={cn(
                        "text-sm flex-1 transition-all", 
                        sub.completed ? "text-muted-foreground line-through opacity-60" : "text-black dark:text-white"
                      )}>
                        {sub.title}
                      </span>
                      
                      {sub.author && (
                        <Badge 
                          variant="secondary" 
                          className="text-[9px] px-1.5 py-0 h-5 font-normal shrink-0"
                        >
                          {sub.author.name}
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground/60 hover:text-destructive"
                          onClick={() => handleDeleteSubtask(sub.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        {sub.dueDate && (
                          <Badge variant="destructive" className="h-5 gap-1 text-[9px] font-bold bg-rose-500/90 hover:bg-rose-500 border-none px-1.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {sub.dueDate}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {isAddingSubtask ? (
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-secondary/20">
                    <Input 
                      autoFocus
                      placeholder="Название подзадачи..." 
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSubtask();
                        if (e.key === "Escape") {
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle("");
                        }
                      }}
                      className="h-7 border-none bg-transparent focus-visible:ring-0 text-sm text-black dark:text-white placeholder:text-muted-foreground"
                    />
                    <Button size="sm" onClick={handleAddSubtask} className="h-7 px-2.5 text-xs">
                      Ок
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingSubtask(false)} className="h-7 px-2.5 text-xs">
                      Отмена
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2.5 gap-1.5 text-muted-foreground/70 hover:text-primary hover:bg-primary/5 transition-all -ml-1"
                    onClick={() => setIsAddingSubtask(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Добавить подзадачу</span>
                  </Button>
                )}
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground/80">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold tracking-tight uppercase">Вложения</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      multiple 
                      onChange={handleFileUpload}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 gap-1.5 text-muted-foreground/70 hover:text-primary hover:bg-primary/5 transition-all"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Plus className="w-3 h-3" />
                      <span className="text-[10px] font-medium">Загрузить</span>
                    </Button>
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-1.5 p-2 rounded-lg bg-secondary/10 border border-border/40">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-muted-foreground animate-pulse">Загрузка...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {attachments.map((file, i) => (
                    <div 
                      key={i}
                      className="group relative flex items-center gap-2 p-2 rounded-lg bg-secondary/10 border border-border/30 hover:bg-secondary/20 hover:border-primary/20 transition-all cursor-pointer"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = file.url;
                        link.download = file.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <div className="w-8 h-8 rounded bg-background flex items-center justify-center border border-border/50 group-hover:scale-105 transition-transform shrink-0">
                        {file.type.startsWith("image/") ? (
                          <img src={file.url} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <FileIcon className="w-4 h-4 text-primary/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate pr-5">{file.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{file.size}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newAttachments = attachments.filter((_, idx) => idx !== i);
                          setAttachments(newAttachments);
                          handleUpdate({ attachments: newAttachments });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Section / Tabs */}
              <div className={cn("space-y-3", attachments.length > 0 ? "pt-3" : "pt-1")}>
                <Tabs defaultValue="comments" className="w-full">
                  <div className="flex items-center justify-between border-b border-border/40 pb-px">
                    <TabsList className="bg-transparent p-0 h-auto gap-8 border-none">
                      <TabsTrigger 
                        value="comments" 
                        className="p-0 pb-2 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-bold transition-all gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Комментарии 
                        <span className="text-[10px] opacity-60 font-medium">{localComments.length}</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="timer" 
                        className="p-0 pb-2 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-bold transition-all gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Таймер
                      </TabsTrigger>
                      <TabsTrigger 
                        value="history" 
                        className="p-0 pb-2 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-bold transition-all gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Активность
                      </TabsTrigger>
                    </TabsList>
                    
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pb-2">29.12.2025</span>
                  </div>
                  
                  <TabsContent value="comments" className="pt-2 mt-0">
                    <div className="space-y-1.5 mb-16 min-h-[80px]">
                      {localComments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className={cn(
                            "flex flex-col gap-0 max-w-[85%]",
                            comment.authorId === (users.find(u => u.username === "admin")?.id || "") ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          <div 
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs shadow-sm border",
                              comment.authorId === (users.find(u => u.username === "admin")?.id || "") 
                                ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-sm" 
                                : "bg-card text-foreground border-border/50 rounded-tl-sm"
                            )}
                          >
                             <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] opacity-60 font-medium">{comment.author?.name}</span>
                              <span className="text-xs leading-relaxed">
                                {comment.content?.split(/(@[^\s]+(?:\s[^\s]+)*)/).map((part: string, idx: number) => {
                                  if (part.startsWith('@')) {
                                    return (
                                      <span key={idx} className="text-primary font-semibold bg-primary/10 px-1 rounded">
                                        {part}
                                      </span>
                                    );
                                  }
                                  return part;
                                })}
                              </span>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap gap-0.5">
                                  {comment.attachments.map((file: any, i: number) => (
                                    <a 
                                      key={i} 
                                      href={file.url} 
                                      download={file.name}
                                      className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-background/20 hover:bg-background/40 transition-colors text-[8px]"
                                    >
                                      <Paperclip className="w-2 h-2" />
                                      {file.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[8px] text-muted-foreground/40 uppercase px-1">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="timer" className="pt-2 mt-0">
                    <TaskStatusTimer taskId={task?.id} />
                  </TabsContent>
                  
                  <TabsContent value="history" className="pt-2 mt-0">
                    <TaskActivityHistory taskId={task?.id} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>

          {/* Comment Input Sticky Bottom Area */}
          <div className="absolute bottom-0 left-0 w-[calc(100%-288px)] p-3 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0 z-10">
            <div className="max-w-4xl mx-auto space-y-1.5">
              {/* Comment Attachments Preview */}
              {commentAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 py-1.5 bg-secondary/30 rounded-lg border border-border/40">
                  {commentAttachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded text-[9px] font-medium">
                      <Paperclip className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[80px]">{file.name}</span>
                      <button 
                        onClick={() => setCommentAttachments(commentAttachments.filter((_, idx) => idx !== i))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative group">
                <Input
                  ref={inputRef}
                  placeholder="Напишите комментарий... Используйте @ для упоминания"
                  className="h-10 pl-3 pr-20 bg-background border-border rounded-xl focus-visible:ring-primary/20 transition-all text-sm placeholder:text-muted-foreground shadow-inner text-foreground"
                  value={newComment}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewComment(value);
                    
                    // Check for mentions
                    const lastAtIndex = value.lastIndexOf('@');
                    if (lastAtIndex !== -1) {
                      const afterAt = value.slice(lastAtIndex + 1);
                      const spaceIndex = afterAt.indexOf(' ');
                      const query = spaceIndex === -1 ? afterAt : afterAt.slice(0, spaceIndex);
                      
                      if (!afterAt.includes(' ') && value.length > lastAtIndex + 1) {
                        setMentionQuery(query);
                        setShowMentions(true);
                        setMentionIndex(0);
                      } else if (afterAt.includes(' ')) {
                        setShowMentions(false);
                      }
                    } else {
                      setShowMentions(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (showMentions && filteredMentionUsers.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setMentionIndex((prev) => (prev + 1) % filteredMentionUsers.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setMentionIndex((prev) => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        handleMentionSelect(filteredMentionUsers[mentionIndex]);
                      } else if (e.key === 'Escape') {
                        setShowMentions(false);
                      }
                    } else if (e.key === "Enter") {
                      handleAddComment();
                    }
                  }}
                />
                
                {/* Mentions Dropdown */}
                {showMentions && filteredMentionUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                    <div className="p-1">
                      {filteredMentionUsers.map((user: any, idx: number) => {
                        const displayName = user.firstName 
                          ? `${user.firstName} ${user.lastName || ''}`.trim() 
                          : user.username;
                        return (
                          <button
                            key={user.id}
                            onClick={() => handleMentionSelect(user)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                              idx === mentionIndex ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                            )}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{displayName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <input 
                    type="file" 
                    id="comment-file-upload" 
                    className="hidden" 
                    multiple 
                    onChange={handleCommentFileUpload}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40 rounded-lg",
                      isUploadingCommentFile && "animate-pulse"
                    )}
                    asChild
                  >
                    <label htmlFor="comment-file-upload" className="cursor-pointer">
                      <Paperclip className="w-3.5 h-3.5" />
                    </label>
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-7 w-7 bg-primary/90 hover:bg-primary shadow-md shadow-primary/20 rounded-lg"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() && commentAttachments.length === 0}
                  >
                    <Send className="w-3.5 h-3.5 rotate-0" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-72 bg-secondary/5 shrink-0 overflow-y-auto border-l border-border/40 p-4 custom-scrollbar">
            <div className="space-y-3">
              {/* Status Section */}
              <div className="flex items-center gap-2 mb-4">
                <Select 
                  value={safeTask.status} 
                  onValueChange={(value) => handleUpdate({ status: value })}
                >
                  <SelectTrigger className="flex-1 h-9 bg-card border-border/50 rounded-lg shadow-sm font-bold text-primary px-3 focus:ring-primary/20 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="В планах">В планах</SelectItem>
                    <SelectItem value="В работе">В работе</SelectItem>
                    <SelectItem value="На проверке">На проверке</SelectItem>
                    <SelectItem value="Готово">Готово</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Attributes Blocks */}
              <div className="space-y-1">
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <div 
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="text-[12px] font-bold text-foreground/70 flex-1">Исполнитель</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground/50">{localAssignee?.name || "Не назначен"}</span>
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 rounded-xl overflow-hidden" align="end">
                    <div className="max-h-64 overflow-y-auto">
                      <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Выберите исполнителя</div>
                      {users.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">Нет доступных пользователей</div>
                      ) : (
                        users.map((user: any) => {
                          const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username;
                          const isSelected = localAssignee?.name === displayName;
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                console.log("[TaskDetails] Selected assignee:", user.id, displayName);
                                console.log("[TaskDetails] Current task ID:", task?.id);
                                handleUpdate({ 
                                  assigneeId: user.id 
                                });
                                setAssigneePopoverOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                            >
                              <span className="text-sm font-medium flex-1">{displayName}</span>
                              {isSelected && <Check className="w-4 h-4 text-primary" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {[
                  { 
                    icon: Eye, 
                    label: "Наблюдатели", 
                    value: localObservers.length > 0 ? `${localObservers.length}` : "0",
                    isObservers: true 
                  },
                   {
                      icon: Calendar, 
                      label: "Дата", 
                      value: localDueDate ? (() => {
                        const date = new Date(localDueDate);
                        const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        return `${dateStr}, ${timeStr}`;
                      })() : "Не установлен", 
                      isDate: true 
                    },
                ].map((item, idx) => (
                  <div key={idx}>
                    {(item as any).isObservers ? (
                      <div className="flex flex-col gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <div 
                              className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20"
                            >
                              <item.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                              <span className="text-[12px] font-bold text-foreground/70 flex-1">{item.label}</span>
                              <span className="text-[10px] font-bold text-muted-foreground/50">{localObservers.length}</span>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0 rounded-xl overflow-hidden" align="end">
                            <Command>
                              <CommandInput placeholder="Поиск наблюдателей..." className="h-9 border-none focus:ring-0" />
                              <CommandList className="max-h-64">
                                <CommandEmpty>Пользователь не найден</CommandEmpty>
                                <CommandGroup>
                                  {users.map((user) => {
                                    const isSelected = localObservers.some(o => o.name === (user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username));
                                    const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username;
                                    return (
                                      <CommandItem
                                        key={user.id}
                                        onSelect={() => toggleObserver({ name: displayName, avatar: user.avatar })}
                                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/50"
                                      >
                                        <span className="text-sm font-medium flex-1">{displayName}</span>
                                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        {/* Отображение всех наблюдателей под полем */}
                        {localObservers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-2">
                            {localObservers.map((obs, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className="text-[11px] px-2 py-0.5 h-6 font-normal"
                              >
                                {obs.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (item as any).isDate ? (
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <div 
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20"
                          >
                            <item.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span className="text-[12px] font-bold text-foreground/70 flex-1">{item.label}</span>
                            <span className="text-[10px] font-bold text-muted-foreground/50">{item.value}</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 rounded-xl" align="end">
                          <div className="space-y-3">
                            <CalendarComponent
                              mode="single"
                              selected={localDueDate ? parseISO(localDueDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const [hours, minutes] = selectedTime.split(':').map(Number);
                                  date.setHours(hours, minutes, 0, 0);
                                  handleUpdate({ dueDate: date.toISOString() });
                                  setLocalDueDate(date.toISOString());
                                  setDatePopoverOpen(false);
                                }
                              }}
                              locale={ru}
                              initialFocus
                              formatters={{
                                formatWeekdayName: (date) => {
                                  const weekdays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
                                  return weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1];
                                }
                              }}
                            />
                            <div className="border-t border-border/40 pt-3">
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">Время</label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={selectedTime}
                                  onChange={(e) => {
                                    setSelectedTime(e.target.value);
                                    if (localDueDate) {
                                      const date = new Date(localDueDate);
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      date.setHours(hours, minutes, 0, 0);
                                      handleUpdate({ dueDate: date.toISOString() });
                                    }
                                  }}
                                  className="w-full h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div 
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20"
                      >
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className="text-[12px] font-bold text-foreground/70 flex-1">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground/50">{item.value}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator className="my-4 opacity-30" />

              {/* Priority Section */}
              <div className="space-y-1.5">
                <Select 
                  value={safeTask.priorityId}
                  onValueChange={(value) => handleUpdate({ priorityId: value })}
                >
                  <SelectTrigger className="w-full h-10 bg-secondary/15 border-none rounded-lg px-3 hover:bg-secondary/25 transition-all font-bold text-[13px]">
                    <div className="flex items-center gap-3">
                      {availablePriorities.find(p => p.id === safeTask.priorityId) ? (
                        <>
                          <div className={cn("w-3 h-3 rounded-full", availablePriorities.find(p => p.id === safeTask.priorityId)?.color)} />
                          <span className="text-foreground font-medium">
                            {availablePriorities.find(p => p.id === safeTask.priorityId)?.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-5 h-5" />
                          <span className="text-foreground/70">Без приоритета</span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl min-w-[220px]">
                    {availablePriorities.map((priority: any) => (
                      <SelectItem key={priority.id} value={priority.id} className="text-[14px] py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", priority.color)} />
                          <span className="text-foreground font-medium">{priority.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-4 opacity-30" />

              {/* Labels Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold text-muted-foreground/60">Метки</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md bg-secondary/15 hover:bg-primary/10 hover:text-primary">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 rounded-xl" align="end">
                      <div className="space-y-3">
                        <Input
                          placeholder="Новая метка..."

                                                    onKeyDown={handleKeyDown}
                        />
                        <div className="flex flex-wrap gap-1">
                          {availableLabels.length > 0 ? (
                            availableLabels.map((label: any) => {
                              const isSelected = localLabels.some(l => l.name === label.name);
                              if (isSelected) return null;
                              return (
                                <Badge 
                                  key={label.id} 
                                  variant="secondary" 
                                  className={cn(
                                    "px-2 py-0.5 text-[9px] font-bold border-none rounded-md cursor-pointer transition-all hover:opacity-80",
                                    label.color ? label.color.replace('bg-', 'bg-').replace('500', '500/10') : "bg-primary/10",
                                    label.color ? (label.color.includes('red') || label.color.includes('orange') || label.color.includes('rose') ? "text-white" : label.color.replace('bg-', 'text-').replace('500', '600')) : "text-primary"
                                  )}
                                  onClick={() => handleAddLabel(label.name)}
                                >
                                  {label.name}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">Нет доступных меток</span>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-wrap gap-1">
                  {localLabels.map((label) => {
                    const labelInfo = availableLabels.find((l: any) => l.name === label.name);
                    return (
                      <Badge 
                        key={label.name} 
                        variant="secondary" 
                        className={cn(
                          "px-2 py-0 text-[9px] font-bold border-none rounded-md cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors",
                          label.pending && "opacity-50",
                          labelInfo?.color ? labelInfo.color.replace('bg-', 'bg-').replace('500', '500/10') : "bg-primary/10",
                          labelInfo?.color ? (labelInfo.color.includes('red') || labelInfo.color.includes('orange') || labelInfo.color.includes('rose') ? "text-white" : labelInfo.color.replace('bg-', 'text-').replace('500', '600')) : "text-primary"
                        )}
                        onClick={() => handleRemoveLabel(label.name)}
                        title="Кликните для удаления"
                      >
                        {label.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Footer Metadata */}
              <div className="pt-6 space-y-1.5 px-1">
                <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Создано {safeTask.creator.date}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Создатель</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-primary/70">{safeTask.creator.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Проект</span>
                  <span className="text-[9px] font-bold text-primary/70">{safeTask.project}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
