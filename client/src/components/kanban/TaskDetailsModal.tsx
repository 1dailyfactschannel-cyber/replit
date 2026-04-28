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
  ChevronDown,
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
  Archive,
  RotateCcw,
  ListChecks,
  Coins,
  Link2,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDisplayNameByStatus } from "@shared/column-status-mapping";
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

// Status colors
const statusColors: Record<string, string> = {
  "В планах": "bg-purple-500",
  "В работе": "bg-blue-500",
  "На проверке": "bg-amber-500",
  "Готово": "bg-emerald-500",
  "Бэклог": "bg-gray-400",
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

// Task Status Timer Component with user breakdown
function TaskStatusTimer({ taskId }: { taskId: string | number | undefined }) {
  const { data: userTimeSummary = [], isLoading, error } = useQuery<{
    status: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    totalSeconds: number;
    count: number;
  }[]>({
    queryKey: ["/api/tasks", taskId, "user-time-summary"],
    enabled: !!taskId,
    refetchInterval: 60000,
  });

  console.log("[TaskStatusTimer] taskId:", taskId, "data:", userTimeSummary, "error:", error);

  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(new Set());

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

  if (!userTimeSummary || userTimeSummary.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-8">
        Нет данных о времени в статусах
      </div>
    );
  }

  // Group by status
  const statusGroups = userTimeSummary.reduce((acc, item) => {
    if (!acc[item.status]) {
      acc[item.status] = {
        users: [],
        totalSeconds: 0,
      };
    }
    acc[item.status].users.push(item);
    acc[item.status].totalSeconds += item.totalSeconds;
    return acc;
  }, {} as Record<string, { users: typeof userTimeSummary; totalSeconds: number }>);

  // Calculate total time
  const totalTime = Object.values(statusGroups).reduce((sum, group) => sum + group.totalSeconds, 0);

  const toggleStatus = (status: string) => {
    const newExpanded = new Set(expandedStatuses);
    if (newExpanded.has(status)) {
      newExpanded.delete(status);
    } else {
      newExpanded.add(status);
    }
    setExpandedStatuses(newExpanded);
  };

  return (
    <div className="space-y-2">
      {/* Total time */}
      <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/10">
        <span className="text-xs font-bold text-foreground">Общее время</span>
        <span className="text-sm font-bold text-foreground">{formatDuration(totalTime)}</span>
      </div>
      
      {/* Status breakdown with expandable users */}
      <div className="space-y-1">
        {Object.entries(statusGroups).map(([status, group]) => (
          <div key={status} className="bg-secondary/30 rounded-lg overflow-hidden">
            {/* Status header - clickable to expand */}
            <button
              onClick={() => toggleStatus(status)}
              className="w-full flex items-center justify-between p-2 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-transform",
                  statusColors[status] || "bg-gray-400",
                  expandedStatuses.has(status) && "scale-125"
                )} />
                <span className="text-xs font-medium text-foreground">{status}</span>
                <span className="text-[10px] text-muted-foreground">({group.users.length})</span>
                {expandedStatuses.has(status) ? (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs font-bold text-foreground">{formatDuration(group.totalSeconds)}</span>
            </button>
            
            {/* Expanded users list */}
            {expandedStatuses.has(status) && (
              <div className="border-t border-border/30">
                {group.users.map((user) => (
                  <div
                    key={`${status}-${user.userId}`}
                    className="flex items-center justify-between px-2 py-1.5 pl-6 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {user.userAvatar ? (
                        <img
                          src={user.userAvatar}
                          alt={user.userName}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                          {user.userName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="text-[11px] text-foreground">{user.userName}</span>
                      <span className="text-[9px] text-muted-foreground">({user.count})</span>
                    </div>
                    <span className="text-[11px] font-medium text-foreground">{formatDuration(user.totalSeconds)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Action names in Russian - simplified to just show the action type
const actionNames: Record<string, string> = {
  created: "создал(-а) задачу",
  updated: "изменил(-а)",
  status_changed: "изменил(-а)",
  assignee_changed: "изменил(-а)",
  priority_changed: "изменил(-а)",
  title_changed: "изменил(-а)",
  description_changed: "изменил(-а)",
  due_date_changed: "изменил(-а)",
  labels_changed: "изменил(-а)",
  comment_added: "добавил(-а) комментарий",
  subtask_created: "добавил(-а) подзадачу",
  subtask_completed: "завершил(-а) подзадачу",
  column_changed: "изменил(-а)",
  order_changed: "изменил(-а)",
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
              
              // Field translations for old records
              const fieldTranslations: Record<string, string> = {
                columnId: 'Колонка',
                order: 'Порядок',
                assigneeId: 'Исполнитель',
                status: 'Статус',
                priorityId: 'Приоритет',
                title: 'Название',
                description: 'Описание',
                dueDate: 'Срок',
                tags: 'Метки',
                boardId: 'Доска',
                type: 'Тип',
                storyPoints: 'Story Points',
                startDate: 'Дата начала',
                completedAt: 'Дата завершения',
                timeSpent: 'Затраченное время',
                archived: 'Архив',
              };
              
              // Translate field name if needed
              const displayFieldName = fieldTranslations[item.fieldName || ''] || item.fieldName;
              
              // Format values (remove quotes if they look like UUIDs)
              const formatValue = (val: string | null) => {
                if (!val) return '';
                // If it looks like a UUID, show it shortened
                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
                  return `ID:${val.substring(0, 8)}...`;
                }
                return val;
              };
              
              return (
                <div key={item.id} className="flex gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">{time}</span>
                      <span className="font-medium text-foreground">{userName}</span>
                      <span className="text-muted-foreground">{actionText}</span>
                      
                      {/* For created action */}
                      {item.action === 'created' && (
                        <span className="text-muted-foreground">задачу</span>
                      )}
                      
                      {/* For field changes with old and new values */}
                      {displayFieldName && item.action !== 'created' && item.action !== 'comment_added' && (
                        <>
                          <span className="font-medium text-foreground">{displayFieldName}</span>
                          {item.oldValue && item.newValue ? (
                            <span className="text-muted-foreground">
                              с <span className="line-through text-muted-foreground/60">"{formatValue(item.oldValue)}"</span> на <span className="font-medium text-primary">"{formatValue(item.newValue)}"</span>
                            </span>
                          ) : item.newValue ? (
                            <span className="text-muted-foreground">
                              на <span className="font-medium text-primary">"{formatValue(item.newValue)}"</span>
                            </span>
                          ) : null}
                        </>
                      )}
                      
                      {/* For comments */}
                      {item.action === 'comment_added' && item.newValue && (
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
  priorityId: string | null;
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
  workspaceId?: string | null;
}

export function TaskDetailsModal({
  task,
  open,
  onOpenChange,
  onUpdate,
  onAccept,
  workspaceId,
}: TaskDetailsModalProps) {
  const queryClient = useQueryClient();
  
  // Fetch all users for observer selection
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    staleTime: 60000, // Cache users for 1 minute
  });

  // Fetch board columns for status selection
  const { data: boardData } = useQuery<any>({
    queryKey: ["/api/boards", task?.boardId, "full"],
    enabled: !!task?.boardId && open,
    staleTime: 0, // Always fetch fresh data when modal opens
  });

  // Get unique status options from board columns
  const statusOptions = boardData?.columns?.map((col: any) => col.name) || [];

  const isTempTask = !!task?.id && typeof task.id === 'string' && task.id.startsWith('temp-');

  // Fetch observers for the task
  const { data: serverObservers = [] } = useQuery<any[]>({
    queryKey: [`/api/tasks/${task?.id}/observers`],
    enabled: !!task?.id && !isTempTask && open,
  });

  // Fetch subtasks for the task
  const { data: serverSubtasks = [], isFetched: isSubtasksFetched } = useQuery<any[]>({
    queryKey: [`/api/tasks/${task?.id}/subtasks`],
    enabled: !!task?.id && !isTempTask && open,
    staleTime: 30000, // Cache for 30 seconds
  });
  
  // Use task.status directly instead of effectiveTask.status to get updated values
  // Fetch task details directly to ensure fresh data
  const { data: serverTask } = useQuery<Task>({
    queryKey: ["/api/tasks", task?.id],
    enabled: !!task?.id && !isTempTask && open,
    staleTime: 30000, // Cache for 30 seconds instead of always fetching fresh
  });

  // Fetch points settings for displaying rewards
  const { data: pointsSettings = [] } = useQuery<any[]>({
    queryKey: ["/api/points-settings"],
    enabled: open,
    staleTime: 60000,
  });

  // Fetch task dependencies
  const { data: taskDependencies = [] } = useQuery<any[]>({
    queryKey: [`/api/tasks/${task?.id}/dependencies`],
    enabled: !!task?.id && !isTempTask && open,
    staleTime: 30000,
  });

  // Fetch sprints for the task's project
  const projectId = boardData?.projectId;
  const { data: projectSprints = [] } = useQuery<any[]>({
    queryKey: [`/api/projects/${projectId}/sprints`],
    enabled: !!projectId && open,
    staleTime: 60000,
  });

  // Mutation to update task sprint
  const updateTaskSprintMutation = useMutation({
    mutationFn: async ({ sprintId }: { sprintId: string | null }) => {
      const res = await fetch(`/api/tasks/${task?.id}/sprint`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId }),
      });
      if (!res.ok) throw new Error("Failed to update sprint");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", task?.boardId, "full"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sprints`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      sonnerToast.success("Спринт обновлен");
    },
    onError: () => {
      sonnerToast.error("Ошибка обновления спринта");
    },
  });

  const effectiveTask: any = serverTask || task;

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
      
      // Only overwrite subtasks if server returned actual data
      const incomingSubtasks = effectiveTask.subtasks || [];
      if (incomingSubtasks.length > 0) {
        setLocalSubtasks(incomingSubtasks);
      }
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
    if (!open || !isSubtasksFetched) return;
    
    console.log("[Subtask] Checking serverSubtasks:", serverSubtasks);
    
    // Маппим isCompleted в completed для совместимости
    const mappedSubtasks = (serverSubtasks || []).map((s: any) => ({
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
  }, [open, serverSubtasks, isSubtasksFetched]);

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
  const [localAssignee, setLocalAssignee] = useState<{ id?: string; name: string; avatar?: string } | null>(null);
  const [localDueDate, setLocalDueDate] = useState<string | null>(null);
  // Initialize localStatus with task status from props (use column name directly)
  const [localStatus, setLocalStatus] = useState<string>(() => {
    return task?.status || "В планах";
  });
  
  // Use localStatus directly for display
  const currentStatus = localStatus || "В планах";
  
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

  // Sync local status with task data (use status directly from task)
  useEffect(() => {
    const rawStatus = task?.status || effectiveTask?.status;
    if (rawStatus) {
      setLocalStatus(rawStatus);
    }
  }, [task?.status, effectiveTask?.status]);

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
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: availableLabels = [] } = useQuery<any[]>({
    queryKey: ["/api/labels"],
  });

  const { data: availablePriorities = [] } = useQuery<any[]>({
    queryKey: ["/api/priorities"],
  });

  const { data: availableTaskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
  });

  // Sync server comments only when they actually change
  const prevCommentsRef = useRef<string>("");
  useEffect(() => {
    if (open && serverComments) {
      const currentIds = serverComments.map((c: any) => c.id).sort().join(',');
      if (prevCommentsRef.current !== currentIds) {
        prevCommentsRef.current = currentIds;
        setLocalComments(serverComments);
      }
    }
  }, [open, serverComments]);

  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<{ name: string; url: string; size: string; type: string }[]>([]);
  const [isUploadingCommentFile, setIsUploadingCommentFile] = useState(false);
  
  // Image viewer state
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);

  // Dependency search state
  const [depSearchQuery, setDepSearchQuery] = useState("");
  const [depSearchResults, setDepSearchResults] = useState<any[]>([]);
  const [isSearchingDeps, setIsSearchingDeps] = useState(false);
  const [selectedDepTask, setSelectedDepTask] = useState<any | null>(null);
  const [selectedDepType, setSelectedDepType] = useState<"blocks" | "relates_to">("blocks");
  const [showAddDepPopover, setShowAddDepPopover] = useState(false);
  
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
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  // Auto-expand sections if task has subtasks or attachments
  useEffect(() => {
    if (effectiveTask) {
      // Check all possible sources of subtasks
      const hasSubtasks = (effectiveTask.subtasks && effectiveTask.subtasks.length > 0) ||
                         (serverSubtasks && serverSubtasks.length > 0) ||
                         (localSubtasks && localSubtasks.length > 0);
      
      if (hasSubtasks) {
        setShowSubtasks(true);
      }
      
      if (effectiveTask.attachments && effectiveTask.attachments.length > 0) {
        setShowAttachments(true);
      }
    }
  }, [effectiveTask?.id, serverSubtasks, localSubtasks]);

  // Update mutation for database synchronization
  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      if (!task?.id) throw new Error("ID задачи отсутствует");
      
      const res = await apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
      return res.json();
    },
    onSuccess: (data) => {
      // Skip onUpdate call here - optimistic update already happened in handleUpdate
      // Server data may have old values and would overwrite the optimistic update
      
      // Only update task cache with enriched data (for assignee)
      const enrichedData: any = { ...data };
      if (data.assigneeId && users) {
        const user = users.find((u: any) => u.id === data.assigneeId);
        if (user) {
          enrichedData.assignee = {
            id: user.id,
            name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username,
            avatar: user.avatar
          };
        }
      }
      
      // Only update specific task cache (not board cache, to avoid overwriting column changes)
      if (task?.id) {
        queryClient.setQueryData(["/api/tasks", task.id], enrichedData);
      }
      
      // Invalidate timer data to refresh user time tracking
      if (task?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "user-time-summary"] });
      }
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

  // Dependency mutations
  const addDependencyMutation = useMutation({
    mutationFn: async ({ targetTaskId, type }: { targetTaskId: string; type: string }) => {
      const res = await apiRequest("POST", `/api/tasks/${task?.id}/dependencies`, { targetTaskId, type });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/dependencies`] });
      sonnerToast.success("Связь добавлена");
    },
    onError: (error: any) => {
      sonnerToast.error(`Ошибка: ${error.message || 'Не удалось добавить связь'}`);
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async (depId: string) => {
      await apiRequest("DELETE", `/api/tasks/${task?.id}/dependencies/${depId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/dependencies`] });
      sonnerToast.success("Связь удалена");
    },
    onError: (error: any) => {
      sonnerToast.error(`Ошибка: ${error.message || 'Не удалось удалить связь'}`);
    },
  });

  // Search tasks for dependency linking
  const searchTasksForLink = async (query: string) => {
    if (!query || query.length < 1 || !task?.id) return [];
    setIsSearchingDeps(true);
    try {
      const url = workspaceId
        ? `/api/workspaces/${workspaceId}/tasks/search?q=${encodeURIComponent(query)}`
        : `/api/tasks/search-for-link?q=${encodeURIComponent(query)}&excludeTaskId=${task.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      return await res.json();
    } catch (error) {
      console.error("Error searching tasks:", error);
      return [];
    } finally {
      setIsSearchingDeps(false);
    }
  };

  const handleUpdate = (updates: Partial<Task>) => {
    console.log("[TaskDetails] handleUpdate called with updates:", updates);
    
    if (!task?.id) {
      sonnerToast.error("Ошибка: ID задачи не найден");
      return;
    }

    if (updates.priorityId !== undefined) {
      console.log("[TaskDetails] Updating priority to:", updates.priorityId);
      if (updates.priorityId === "") {
        updates.priorityId = null as any;
      }
    }
    
    const isTempTask = typeof task.id === 'string' && task.id.startsWith('temp-');
    
    // Optimistic local task update via Query Cache
    // Build the full assignee object for display
    const newDisplayData: any = {};
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

    // When status changes, also update columnId to match the new column
    if (updates.status && boardData?.columns) {
      const matchingColumn = boardData.columns.find((col: any) => col.name === updates.status);
      if (matchingColumn) {
        newDisplayData.columnId = matchingColumn.id;
        // Optimistically update localStatus for immediate UI feedback
        setLocalStatus(updates.status);
      }
    }

    // Update individual task query cache
    queryClient.setQueryData(["/api/tasks", task.id], (old: any) => {
      if (!old || !old.id) return old;
      return { ...old, ...updates, ...newDisplayData };
    });

    // Update board query cache (for kanban board display)
    if (task.boardId) {
      queryClient.setQueryData(["/api/boards", task.boardId, "full"], (old: any) => {
        if (!old) return old;
        
        // Update flat tasks array
        let newTasks = old.tasks;
        if (Array.isArray(newTasks)) {
          newTasks = newTasks.map((t: any) => t.id === task.id ? { ...t, ...updates, ...newDisplayData } : t);
        }
        
        // Handle both array and object formats for columns
        let newColumns = old.columns;
        const taskToMove = old.columns?.flatMap((c: any) => c.tasks || []).find((t: any) => t.id === task.id);
        // Fallback to flat tasks array if columns don't contain nested tasks
        const fallbackTask = old.tasks?.find((t: any) => t.id === task.id);
        const baseTask = taskToMove || fallbackTask || task;
        const enrichedTask = { ...baseTask, ...updates, ...newDisplayData };
        
        if (Array.isArray(newColumns)) {
          // When status changes, move task between columns
          if (newDisplayData.columnId && task.columnId !== newDisplayData.columnId) {
            newColumns = newColumns.map((column: any) => {
              const taskInColumn = (column.tasks || []).find((t: any) => t.id === task.id);
              if (taskInColumn) {
                // Task is in this column - remove it if it's moving to another column
                if (column.id !== newDisplayData.columnId) {
                  return { ...column, tasks: (column.tasks || []).filter((t: any) => t.id !== task.id) };
                }
              }
              // Add task to the target column
              if (column.id === newDisplayData.columnId) {
                const taskExists = (column.tasks || []).some((t: any) => t.id === task.id);
                if (!taskExists) {
                  return { ...column, tasks: [...(column.tasks || []), enrichedTask] };
                } else {
                  // Task already in column, just update it
                  return { ...column, tasks: (column.tasks || []).map((t: any) => t.id === task.id ? enrichedTask : t) };
                }
              }
              return column;
            });
          } else {
            // No column change, just update in place
            newColumns = newColumns.map((column: any) => ({
              ...column,
              tasks: (column.tasks || []).map((t: any) => {
                if (t.id === task.id) {
                  return { ...t, ...updates, ...newDisplayData };
                }
                return t;
              })
            }));
          }
        } else if (newColumns && typeof newColumns === 'object') {
          // Object format (keyed by columnId)
          newColumns = { ...newColumns };
          const enrichedTask = { ...task, ...updates, ...newDisplayData };
          
          if (newDisplayData.columnId && task.columnId !== newDisplayData.columnId) {
            // Moving task between columns
            for (const columnId in newColumns) {
              const column = newColumns[columnId];
              const taskInColumn = (column.tasks || []).find((t: any) => t.id === task.id);
              if (taskInColumn) {
                if (columnId !== newDisplayData.columnId) {
                  // Remove from old column
                  newColumns[columnId] = {
                    ...column,
                    tasks: (column.tasks || []).filter((t: any) => t.id !== task.id)
                  };
                }
              }
            }
            // Add to new column
            if (newColumns[newDisplayData.columnId]) {
              const targetColumn = newColumns[newDisplayData.columnId];
              const taskExists = (targetColumn.tasks || []).some((t: any) => t.id === task.id);
              if (!taskExists) {
                newColumns[newDisplayData.columnId] = {
                  ...targetColumn,
                  tasks: [...(targetColumn.tasks || []), enrichedTask]
                };
              }
            }
          } else {
            // No column change, just update in place
            for (const columnId in newColumns) {
              const column = newColumns[columnId];
              newColumns[columnId] = {
                ...column,
                tasks: (column.tasks || []).map((t: any) => {
                  if (t.id === task.id) {
                    return { ...t, ...updates, ...newDisplayData };
                  }
                  return t;
                })
              };
            }
          }
        }
        
        return { ...old, tasks: newTasks, columns: newColumns };
      });
    }

    // Optimistic parent update - use task instead of effectiveTask to get latest values
    if (onUpdate && task) {
      console.log("[TaskDetails] Calling onUpdate with:", { ...task, ...updates, ...newDisplayData });
      onUpdate({ ...task, ...updates, ...newDisplayData });
    }
    
    // Update local status for immediate UI feedback
    if (updates.status) {
      setLocalStatus(updates.status);
    }
    
    // Skip API call for temp tasks (they'll be created on the server later)
    if (isTempTask) {
      return;
    }
    
    // Include columnId in API call if status changed
    const apiUpdates = { ...updates };
    if (newDisplayData.columnId) {
      apiUpdates.columnId = newDisplayData.columnId;
    }
    
    updateTaskMutation.mutate(apiUpdates);
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
      
      // Invalidate comments query to ensure fresh data on next open
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}/comments`] });
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

    // Update board cache for immediate UI update
    if (task.boardId) {
      queryClient.setQueryData(["/api/boards", task.boardId, "full"], (old: any) => {
        if (!old) return old;
        
        let newColumns = old.columns;
        if (Array.isArray(newColumns)) {
          newColumns = newColumns.map((column: any) => ({
            ...column,
            tasks: (column.tasks || []).map((t: any) => {
              if (t.id === task.id) {
                return { ...t, observers: updatedObservers };
              }
              return t;
            })
          }));
        } else if (newColumns && typeof newColumns === 'object') {
          newColumns = { ...newColumns };
          for (const columnId in newColumns) {
            const columnTasks = newColumns[columnId]?.tasks || [];
            newColumns[columnId] = {
              ...newColumns[columnId],
              tasks: columnTasks.map((t: any) => {
                if (t.id === task.id) {
                  return { ...t, observers: updatedObservers };
                }
                return t;
              })
            };
          }
        }
        
        return { ...old, columns: newColumns };
      });
    }

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
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background border-none shadow-2xl h-[95vh] flex items-center justify-center">
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

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-w-[1200px] w-[95vw] h-[90vh] max-h-[900px] flex flex-col p-0 gap-0 overflow-hidden bg-background border-none shadow-2xl font-sans"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{effectiveTask.title || "Детали задачи"}</DialogTitle>
          <DialogDescription>
            Просмотр и редактирование деталей задачи {effectiveTask.title}.
          </DialogDescription>
        </DialogHeader>
        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[2px] border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none transition-all animate-in fade-in">
            <div className="bg-background/80 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-primary/20">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Paperclip className="w-8 h-8 text-foreground animate-bounce" />
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
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-8 w-8",
                effectiveTask?.archived 
                  ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" 
                  : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
              )}
              onClick={() => {
                const newArchived = !effectiveTask?.archived;
                handleUpdate({ archived: newArchived } as any);
                sonnerToast.success(newArchived ? "Задача архивирована" : "Задача восстановлена");
              }}
              title={effectiveTask?.archived ? "Восстановить" : "В архив"}
            >
              {effectiveTask?.archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Blocked task warning */}
        {taskDependencies.some((d: any) => d.type === "blocks" && d.direction === "incoming" && d.taskStatus !== "Готово") && (
          <div className="px-6 py-2 bg-amber-50/80 border-b border-amber-200/50 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-800">
              Задача заблокирована: {" "}
              {taskDependencies
                .filter((d: any) => d.type === "blocks" && d.direction === "incoming" && d.taskStatus !== "Готово")
                .map((d: any) => `#${d.taskNumber || d.taskId.slice(-4)} ${d.taskTitle}`)
                .join(", ")}
            </span>
          </div>
        )}

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
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-primary/10"
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
              {showSubtasks && (
              <div className="space-y-3">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 text-muted-foreground/80">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold tracking-tight uppercase">
                      Подзадачи 
                      <span className="ml-1.5 text-foreground/60">
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
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-foreground-foreground">
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
                    className="h-7 px-2.5 gap-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-primary/5 transition-all -ml-1"
                    onClick={() => setIsAddingSubtask(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Добавить подзадачу</span>
                  </Button>
                )}
              </div>

              )}

              {/* Dependencies Section */}
              {(showDependencies || taskDependencies.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 text-muted-foreground/80">
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold tracking-tight uppercase">
                      Связи
                      <span className="ml-1.5 text-foreground/60">
                        {taskDependencies.length}
                      </span>
                    </span>
                  </div>
                </div>
                
                <Separator className="opacity-40" />

                <div className="space-y-1.5">
                  {taskDependencies.map((dep: any) => {
                    const isBlocked = dep.type === "blocks" && dep.direction === "incoming";
                    const isBlocks = dep.type === "blocks" && dep.direction === "outgoing";
                    const label = isBlocks
                      ? "Блокирует"
                      : isBlocked
                      ? "Заблокирована"
                      : "Связана";
                    const isDone = dep.taskStatus === "Готово";
                    const badgeColor = isBlocks || isBlocked
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-blue-100 text-blue-700 border-blue-200";

                    return (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-secondary/30 transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("text-[9px] font-semibold px-1 py-0.5 rounded border shrink-0", badgeColor)}>
                            {label}
                          </span>
                          <span className={cn("text-xs truncate", isDone && "line-through text-muted-foreground/60")}>
                            #{dep.taskNumber || dep.taskId.slice(-4)} {dep.taskTitle}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeDependencyMutation.mutate(dep.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Add dependency inline */}
                <Popover open={showAddDepPopover} onOpenChange={setShowAddDepPopover}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2.5 gap-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-primary/5 transition-all -ml-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Добавить связь</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold">Новая связь</div>
                      <Input
                        placeholder="Поиск задачи по названию..."
                        value={depSearchQuery}
                        onChange={(e) => {
                          setDepSearchQuery(e.target.value);
                          if (e.target.value.length >= 2) {
                            searchTasksForLink(e.target.value).then(setDepSearchResults);
                          } else {
                            setDepSearchResults([]);
                          }
                        }}
                        className="h-8 text-xs"
                      />
                      {isSearchingDeps && (
                        <div className="text-xs text-muted-foreground">Поиск...</div>
                      )}
                      {depSearchResults.length > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {depSearchResults.map((result: any) => (
                            <button
                              key={result.id}
                              onClick={() => setSelectedDepTask(result)}
                              className={cn(
                                "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors",
                                selectedDepTask?.id === result.id
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-muted"
                              )}
                            >
                              <div className={cn("font-medium truncate", selectedDepTask?.id === result.id && "text-primary")}>{result.title}</div>
                              <div className="text-[10px] text-muted-foreground">
                                #{result.number || result.id.slice(-4)} · {result.projectName}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <Select
                        value={selectedDepType}
                        onValueChange={(v: any) => setSelectedDepType(v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blocks">Блокирует</SelectItem>
                          <SelectItem value="relates_to">Связана с</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        disabled={!selectedDepTask || addDependencyMutation.isPending}
                        onClick={() => {
                          if (selectedDepTask) {
                            addDependencyMutation.mutate(
                              { targetTaskId: selectedDepTask.id, type: selectedDepType },
                              {
                                onSuccess: () => {
                                  setShowAddDepPopover(false);
                                  setDepSearchQuery("");
                                  setDepSearchResults([]);
                                  setSelectedDepTask(null);
                                },
                              }
                            );
                          }
                        }}
                      >
                        {addDependencyMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Создать связь"
                        )}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              )}

              {/* Attachments Section */}
              {showAttachments && (
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
                      className="h-6 px-2 gap-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-primary/5 transition-all"
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
                          <FileIcon className="w-4 h-4 text-foreground/60" />
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
              )}

              {/* Activity Section / Tabs */}
              <div className={cn("space-y-3", attachments.length > 0 ? "pt-3" : "pt-1")}>
                <Tabs defaultValue="comments" className="w-full">
                  <div className="flex items-center justify-between border-b border-border/40 pb-px">
                    <TabsList className="bg-transparent p-0 h-auto gap-8 border-none">
                      <TabsTrigger 
                        value="comments" 
                        className="p-0 pb-2 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-xs font-bold transition-all gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Комментарии 
                        <span className="text-[10px] opacity-60 font-medium">{localComments.length}</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="timer" 
                        className="p-0 pb-2 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-xs font-bold transition-all gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Таймер
                      </TabsTrigger>
                      <TabsTrigger 
                        value="history" 
                        className="p-0 pb-2 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-xs font-bold transition-all gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Активность
                      </TabsTrigger>
                    </TabsList>
                    
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pb-2">29.12.2025</span>
                  </div>
                  
                  <TabsContent value="comments" className="pt-4 mt-0 flex flex-col h-full">
                    {/* Modern Chat Messages Area */}
                    <div className="flex-1 space-y-4 mb-20 px-2 overflow-y-auto">
                      {localComments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                            <MessageSquare className="w-7 h-7 text-primary/60" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Нет сообщений</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Начните переписку прямо сейчас</p>
                        </div>
                      ) : (
                        localComments.map((comment, index) => {
                          const isOwn = comment.authorId === (users.find(u => u.username === "admin")?.id || "");
                          const showDate = index === 0 || new Date(comment.createdAt).toDateString() !== new Date(localComments[index - 1]?.createdAt).toDateString();
                          
                          return (
                            <div key={comment.id}>
                              {/* Date separator */}
                              {showDate && (
                                <div className="flex items-center gap-3 my-6">
                                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                                  <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                                    {new Date(comment.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                                  </span>
                                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                                </div>
                              )}
                              
                              <div className={cn(
                                "flex gap-3 max-w-[88%]",
                                isOwn ? "ml-auto flex-row-reverse" : "flex-row"
                              )}>
                                {/* Avatar */}
                                <div className={cn(
                                  "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-semibold shadow-sm overflow-hidden",
                                  !comment.author?.avatar && (isOwn 
                                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
                                    : "bg-gradient-to-br from-secondary to-muted text-foreground")
                                )}>
                                  {comment.author?.avatar ? (
                                    <img 
                                      src={comment.author.avatar} 
                                      alt={comment.author?.name} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // Fallback to initials if image fails to load
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    comment.author?.name?.charAt(0).toUpperCase() || "U"
                                  )}
                                </div>
                                
                                {/* Message bubble */}
                                <div className={cn(
                                  "flex flex-col gap-1",
                                  isOwn ? "items-end" : "items-start"
                                )}>
                                  <div className={cn(
                                    "relative px-4 py-2.5 rounded-2xl shadow-sm",
                                    isOwn 
                                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm" 
                                      : "bg-gradient-to-br from-card to-secondary/50 text-foreground border border-border/30 rounded-bl-sm"
                                  )}>
                                    {/* Author name */}
                                    <div className={cn(
                                      "text-[10px] font-semibold mb-1",
                                      isOwn ? "text-primary-foreground/70" : "text-primary/70"
                                    )}>
                                      {comment.author?.name}
                                    </div>
                                    
                                    {/* Content */}
                                    <p className="text-[13px] leading-relaxed">
                                      {(() => {
                                        // Build regex from all user display names to match exact mentions
                                        const userNames = users.map((user: any) => {
                                          return user.firstName 
                                            ? `${user.firstName} ${user.lastName || ''}`.trim() 
                                            : user.username;
                                        }).filter(Boolean);
                                        
                                        if (userNames.length === 0) {
                                          return comment.content;
                                        }
                                        
                                        // Escape special regex characters in names
                                        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const namePattern = userNames.map(escapeRegex).join('|');
                                        const mentionPattern = new RegExp(`@(${namePattern})(?=\\s|$)`, 'g');
                                        
                                        const parts: React.ReactNode[] = [];
                                        let lastIndex = 0;
                                        let match;
                                        
                                        while ((match = mentionPattern.exec(comment.content || '')) !== null) {
                                          // Add text before mention
                                          if (match.index > lastIndex) {
                                            parts.push(comment.content?.slice(lastIndex, match.index));
                                          }
                                          
                                          // Add highlighted mention
                                          parts.push(
                                            <span key={match.index} className={cn(
                                              "font-semibold px-1.5 py-0.5 rounded-md",
                                              isOwn 
                                                ? "bg-primary-foreground/20 text-primary-foreground" 
                                                : "bg-primary/10 text-primary"
                                            )}>
                                              {match[0]}
                                            </span>
                                          );
                                          
                                          lastIndex = mentionPattern.lastIndex;
                                        }
                                        
                                        // Add remaining text
                                        if (lastIndex < (comment.content?.length || 0)) {
                                          parts.push(comment.content?.slice(lastIndex));
                                        }
                                        
                                        return parts.length > 0 ? parts : comment.content;
                                      })()}
                                    </p>
                                    
                                    {/* Attachments */}
                                    {comment.attachments && comment.attachments.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {comment.attachments.map((file: any, i: number) => {
                                          // Check if file is an image
                                          const isImage = file.type?.startsWith('image/') || 
                                            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
                                          
                                          if (isImage) {
                                            return (
                                              <div
                                                key={i}
                                                onClick={() => setSelectedImage({ url: file.url, name: file.name })}
                                                className={cn(
                                                  "relative cursor-pointer overflow-hidden rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg group",
                                                  isOwn 
                                                    ? "bg-primary-foreground/10" 
                                                    : "bg-background/50 border border-border/20"
                                                )}
                                              >
                                                <img
                                                  src={file.url}
                                                  alt={file.name}
                                                  className="w-full max-w-[200px] h-auto max-h-[150px] object-cover"
                                                  onError={(e) => {
                                                    // Fallback to file icon if image fails to load
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                  }}
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                                </div>
                                              </div>
                                            );
                                          }
                                          
                                          // Non-image files - show as before
                                          return (
                                            <a 
                                              key={i} 
                                              href={file.url} 
                                              download={file.name}
                                              className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all hover:scale-[1.02]",
                                                isOwn 
                                                  ? "bg-primary-foreground/15 hover:bg-primary-foreground/25" 
                                                  : "bg-background/50 hover:bg-background/80 border border-border/20"
                                              )}
                                            >
                                              <div className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center",
                                                isOwn ? "bg-primary-foreground/20" : "bg-primary/10"
                                              )}>
                                                <Paperclip className="w-3.5 h-3.5" />
                                              </div>
                                              <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                                            </a>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Timestamp */}
                                  <span className="text-[10px] text-muted-foreground/40 font-medium px-1">
                                    {new Date(comment.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
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

          {/* Modern Comment Input Sticky Bottom Area */}
          <div className="absolute bottom-0 left-0 w-[calc(100%-288px)] p-4 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-sm shrink-0 z-10 border-t border-border/30">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* Modern Comment Attachments Preview */}
              {commentAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-secondary/20 rounded-2xl border border-border/30">
                  {commentAttachments.map((file, i) => {
                    // Check if file is an image
                    const isImage = file.type?.startsWith('image/') || 
                      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
                    
                    if (isImage) {
                      return (
                        <div key={i} className="relative group">
                          <div 
                            className="w-20 h-20 rounded-xl overflow-hidden bg-background shadow-sm border border-border/20 cursor-pointer"
                            onClick={() => setSelectedImage({ url: file.url, name: file.name })}
                          >
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <button 
                            onClick={() => setCommentAttachments(commentAttachments.filter((_, idx) => idx !== i))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    }
                    
                    // Non-image files
                    return (
                      <div key={i} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm border border-border/20">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Paperclip className="w-3 h-3 text-primary" />
                        </div>
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <button 
                          onClick={() => setCommentAttachments(commentAttachments.filter((_, idx) => idx !== i))}
                          className="w-5 h-5 rounded-full bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modern Input Container */}
              <div className="relative">
                <div className={cn(
                  "flex items-end gap-2 bg-card/80 backdrop-blur-sm rounded-2xl border shadow-sm transition-all duration-200",
                  "focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/5"
                )}>
                  {/* Attachment Button */}
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
                      "h-10 w-10 ml-2 my-1.5 flex-shrink-0 rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-secondary transition-all",
                      isUploadingCommentFile && "animate-pulse"
                    )}
                    asChild
                  >
                    <label htmlFor="comment-file-upload" className="cursor-pointer">
                      <Paperclip className="w-[18px] h-[18px]" />
                    </label>
                  </Button>
                  
                  {/* Modern Text Input */}
                  <div className="flex-1 min-h-[52px] max-h-[200px] py-3 relative">
                    <textarea
                      ref={inputRef as any}
                      placeholder="Напишите сообщение..."
                      className="w-full h-full bg-transparent border-0 resize-none focus:ring-0 focus:outline-none text-[14px] leading-relaxed placeholder:text-muted-foreground/50 py-0.5"
                      value={newComment}
                      rows={1}
                      onInput={(e: any) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }}
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
                          } else if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleMentionSelect(filteredMentionUsers[mentionIndex]);
                          } else if (e.key === 'Escape') {
                            setShowMentions(false);
                          }
                        } else if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                  </div>
                  
                  {/* Modern Send Button */}
                  <Button 
                    size="icon" 
                    className={cn(
                      "h-10 w-10 mr-2 my-1.5 flex-shrink-0 rounded-xl transition-all duration-200",
                      (newComment.trim() || commentAttachments.length > 0)
                        ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/25 text-primary-foreground scale-100"
                        : "bg-secondary text-muted-foreground scale-95"
                    )}
                    onClick={handleAddComment}
                    disabled={!newComment.trim() && commentAttachments.length === 0}
                  >
                    <Send className={cn(
                      "w-[18px] h-[18px] transition-transform",
                      (newComment.trim() || commentAttachments.length > 0) && "rotate-0"
                    )} />
                  </Button>
                </div>
                
                {/* Modern Mentions Dropdown */}
                {showMentions && filteredMentionUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-popover/95 backdrop-blur-sm border border-border/50 rounded-2xl shadow-xl z-50 max-h-60 overflow-auto">
                    <div className="p-2">
                      <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 py-1.5">
                        Упомянуть пользователя
                      </div>
                      {filteredMentionUsers.map((user: any, idx: number) => {
                        const displayName = user.firstName 
                          ? `${user.firstName} ${user.lastName || ''}`.trim() 
                          : user.username;
                        return (
                          <button
                            key={user.id}
                            onClick={() => handleMentionSelect(user)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all",
                              idx === mentionIndex 
                                ? "bg-primary/10 text-foreground shadow-sm" 
                                : "hover:bg-secondary/60"
                            )}
                          >
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold">
                              {displayName?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium truncate">{displayName}</span>
                              <span className="text-[10px] text-muted-foreground/60">@{user.username}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Right Sidebar */}
          <div className="w-72 bg-secondary/5 shrink-0 overflow-y-auto border-l border-border/40 p-4 custom-scrollbar">
            <div className="space-y-3">
              {/* Status Section */}
              <div className="flex items-center gap-2 mb-4">
                <Select 
                  value={currentStatus} 
                  onValueChange={(value) => {
                    setLocalStatus(value);
                    handleUpdate({ status: value });
                  }}
                >
                  <SelectTrigger className="flex-1 h-9 bg-background border border-input rounded-lg shadow-sm font-bold text-foreground px-3 focus:ring-2 focus:ring-primary/20 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStatus === 'Готово' ? '#10b981' : currentStatus === 'В работе' ? '#3b82f6' : currentStatus === 'На проверке' ? '#f59e0b' : '#64748b' }} />
                      <span className="text-foreground font-medium">{currentStatus}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-background" style={{ zIndex: 9999 }}>
                    {statusOptions.length > 0 ? (
                      statusOptions.map((status: string) => (
                        <SelectItem key={status} value={status} className="text-foreground">{status}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="В планах" className="text-foreground">В планах</SelectItem>
                        <SelectItem value="В работе" className="text-foreground">В работе</SelectItem>
                        <SelectItem value="На проверке" className="text-foreground">На проверке</SelectItem>
                        <SelectItem value="Готово" className="text-foreground">Готово</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Points Reward Badge */}
              {(() => {
                const setting = pointsSettings.find((s: any) => s.statusName === currentStatus && s.isActive);
                if (setting) {
                  return (
                    <div className="flex flex-col gap-1 px-3 py-2 mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-amber-700 dark:text-amber-300">
                          +{setting.pointsAmount} баллов за этот статус
                        </span>
                      </div>
                      {setting.maxTimeInStatus > 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="w-3 h-3" />
                          <span>Максимум {setting.maxTimeInStatus} минут в статусе</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Attributes Blocks */}
              <div className="space-y-1">
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button 
                      type="button" aria-label="Выбрать исполнителя"
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20 w-full text-left"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="text-[12px] font-bold text-foreground/70 flex-1">Исполнитель</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground/50">{localAssignee?.name || "Не назначен"}</span>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 rounded-xl overflow-hidden" align="end" sideOffset={8} style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                    <div className="max-h-64 overflow-y-auto" style={{ pointerEvents: 'auto' }}>
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
                                // Update local state immediately
                                setLocalAssignee({ id: user.id, name: displayName, avatar: user.avatar });
                                handleUpdate({ 
                                  assigneeId: user.id 
                                });
                                setAssigneePopoverOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left cursor-pointer"
                              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                            >
                              <span className="text-sm font-medium flex-1">{displayName}</span>
                              {isSelected && <Check className="w-4 h-4 text-foreground" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {[
                  { 
                    icon: ListChecks, 
                    label: "Подзадачи", 
                    value: localSubtasks.length > 0 ? `${localSubtasks.filter(s => s.completed).length}/${localSubtasks.length}` : "0",
                    isSubtasks: true 
                  },
                  { 
                    icon: Link2, 
                    label: "Связи", 
                    value: taskDependencies.length > 0 ? `${taskDependencies.length}` : "0",
                    isDependencies: true 
                  },
                  { 
                    icon: Eye, 
                    label: "Наблюдатели", 
                    value: localObservers.length > 0 ? `${localObservers.length}` : "0",
                    isObservers: true 
                  },
                  { 
                    icon: Paperclip, 
                    label: "Вложения", 
                    value: attachments.length > 0 ? `${attachments.length}` : "0",
                    isAttachments: true 
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
                    {(item as any).isSubtasks ? (
                      <button 
                        type="button" 
                        onClick={() => setShowSubtasks(!showSubtasks)}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg transition-colors w-full text-left",
                          showSubtasks ? "bg-secondary/25" : "bg-secondary/15 hover:bg-secondary/25"
                        )}
                      >
                        <item.icon className={cn("w-3.5 h-3.5 shrink-0", showSubtasks ? "text-primary" : "text-muted-foreground/60")} />
                        <span className={cn("text-[12px] font-bold flex-1 truncate", showSubtasks ? "text-primary" : "text-foreground/70")}>{item.label}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">{item.value}</span>
                      </button>
                    ) : (item as any).isDependencies ? (
                      <button 
                        type="button" 
                        onClick={() => setShowDependencies(!showDependencies)}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg transition-colors w-full text-left",
                          showDependencies ? "bg-secondary/25" : "bg-secondary/15 hover:bg-secondary/25"
                        )}
                      >
                        <item.icon className={cn("w-3.5 h-3.5 shrink-0", showDependencies ? "text-primary" : "text-muted-foreground/60")} />
                        <span className={cn("text-[12px] font-bold flex-1 truncate", showDependencies ? "text-primary" : "text-foreground/70")}>{item.label}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">{item.value}</span>
                      </button>
                    ) : (item as any).isAttachments ? (
                      <button 
                        type="button" 
                        onClick={() => setShowAttachments(!showAttachments)}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg transition-colors w-full text-left",
                          showAttachments ? "bg-secondary/25" : "bg-secondary/15 hover:bg-secondary/25"
                        )}
                      >
                        <item.icon className={cn("w-3.5 h-3.5 shrink-0", showAttachments ? "text-primary" : "text-muted-foreground/60")} />
                        <span className={cn("text-[12px] font-bold flex-1 truncate", showAttachments ? "text-primary" : "text-foreground/70")}>{item.label}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">{item.value}</span>
                      </button>
                    ) : (item as any).isObservers ? (
                      <div className="flex flex-col gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button 
                              type="button" 
                              aria-label="Наблюдатели" 
                              className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20 w-full text-left"
                            >
                              <item.icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                              <span className="text-[12px] font-bold text-foreground/70 flex-1 truncate">{item.label}</span>
                              <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">{localObservers.length}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0 rounded-xl overflow-hidden" align="end" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                            <Command>
                              <CommandInput placeholder="Поиск наблюдателей..." className="h-9 border-none focus:ring-0" />
                              <CommandList className="max-h-64" style={{ pointerEvents: 'auto' }}>
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
                                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                      >
                                        <span className="text-sm font-medium flex-1">{displayName}</span>
                                        {isSelected && <Check className="w-4 h-4 text-foreground" />}
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
                          <button 
                            type="button"
                            aria-label="Дата"
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20 w-full text-left"
                          >
                            <item.icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                            <span className="text-[12px] font-bold text-foreground/70 flex-1 truncate">{item.label}</span>
                            <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">{item.value}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 rounded-xl" align="end" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
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
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20 w-full text-left"
                      >
                        <item.icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                        <span className="text-[12px] font-bold text-foreground/70 flex-1 truncate">{item.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-muted-foreground/50">{item.value}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Sprint selector */}
                {projectSprints.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 transition-colors group cursor-pointer border border-transparent hover:border-border/20 w-full text-left"
                      >
                        <Flag className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                        <span className="text-[12px] font-bold text-foreground/70 flex-1 truncate">Спринт</span>
                        <span className="text-[10px] font-bold text-muted-foreground/50 shrink-0">
                          {effectiveTask?.sprintId
                            ? projectSprints.find((s: any) => s.id === effectiveTask.sprintId)?.name || "—"
                            : "Бэклог"
                          }
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 rounded-xl overflow-hidden" align="end" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                      <div className="max-h-64 overflow-y-auto" style={{ pointerEvents: 'auto' }}>
                        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">Выберите спринт</div>
                        <button
                          type="button"
                          onClick={() => updateTaskSprintMutation.mutate({ sprintId: null })}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left cursor-pointer",
                            !effectiveTask?.sprintId && "bg-secondary/30"
                          )}
                        >
                          <span className="text-sm font-medium flex-1">Бэклог</span>
                          {!effectiveTask?.sprintId && <Check className="w-4 h-4 text-foreground" />}
                        </button>
                        {projectSprints.map((sprint: any) => {
                          const isActive = sprint.status === "active";
                          const isSelected = effectiveTask?.sprintId === sprint.id;
                          return (
                            <button
                              key={sprint.id}
                              type="button"
                              onClick={() => updateTaskSprintMutation.mutate({ sprintId: sprint.id })}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left cursor-pointer",
                                isSelected && "bg-secondary/30"
                              )}
                            >
                              <span className="text-sm font-medium flex-1">{sprint.name}</span>
                              {isActive && (
                                <Badge variant="secondary" className="text-[9px] h-5 px-1.5 font-normal bg-emerald-100 text-emerald-700 border-emerald-200">
                                  Активный
                                </Badge>
                              )}
                              {isSelected && <Check className="w-4 h-4 text-foreground" />}
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <Separator className="my-4 opacity-30" />

              {/* Priority Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Приоритет</label>
                <Select
                  value={effectiveTask.priorityId || ""}
                  onValueChange={(value) => handleUpdate({ priorityId: (value || null) as string | null })}
                >
                  <SelectTrigger className="w-full h-10 bg-secondary/15 border-none rounded-lg px-3 hover:bg-secondary/25 transition-all font-bold text-[13px]">
                    <div className="flex items-center gap-3">
                      {effectiveTask.priorityId && availablePriorities?.find(p => p.id === effectiveTask.priorityId) ? (
                        <>
                          <div className={cn("w-3 h-3 rounded-full", availablePriorities.find(p => p.id === effectiveTask.priorityId)?.color || "bg-muted")} />
                          <span className="text-foreground font-medium">
                            {availablePriorities.find(p => p.id === effectiveTask.priorityId)?.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 rounded-full bg-muted border border-border" />
                          <span className="text-muted-foreground font-medium">Без приоритета</span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl min-w-[220px]">
                    {availablePriorities?.map((priority: any) => (
                      <SelectItem key={priority.id} value={priority.id} className="text-[14px] py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", priority.color || "bg-muted")} />
                          <span className="text-foreground font-medium">{priority.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Type Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Тип задачи</label>
                <Select
                  value={effectiveTask.taskTypeId || ""}
                  onValueChange={(value) => handleUpdate({ taskTypeId: value || null } as any)}
                >
                  <SelectTrigger className="w-full h-10 bg-secondary/15 border-none rounded-lg px-3 hover:bg-secondary/25 transition-all font-bold text-[13px]">
                    <div className="flex items-center gap-3">
                      {availableTaskTypes.find(t => t.id === effectiveTask.taskTypeId) ? (
                        <>
                          <div className={cn("w-3 h-3 rounded-full", availableTaskTypes.find(t => t.id === effectiveTask.taskTypeId)?.color)} />
                          <span className="text-foreground font-medium">
                            {availableTaskTypes.find(t => t.id === effectiveTask.taskTypeId)?.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-5 h-5" />
                          <span className="text-foreground/70">Тип задачи</span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl min-w-[220px]">
                    {availableTaskTypes.map((taskType: any) => (
                      <SelectItem key={taskType.id} value={taskType.id} className="text-[14px] py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", taskType.color)} />
                          <span className="text-foreground font-medium">{taskType.name}</span>
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
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-md bg-secondary/15 hover:bg-primary/10 hover:text-foreground">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 rounded-xl" align="end" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
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
                              const getColors = (color: string) => {
                                if (color.includes('red') || color.includes('rose')) return { bg: '#fef2f2', text: '#dc2626' };
                                if (color.includes('blue')) return { bg: '#dbeafe', text: '#2563eb' };
                                if (color.includes('green') || color.includes('emerald')) return { bg: '#dcfce7', text: '#16a34a' };
                                if (color.includes('yellow') || color.includes('amber')) return { bg: '#fef9c3', text: '#ca8a04' };
                                if (color.includes('purple') || color.includes('indigo')) return { bg: '#f3e8ff', text: '#9333ea' };
                                if (color.includes('pink')) return { bg: '#fce7f3', text: '#db2777' };
                                if (color.includes('orange')) return { bg: '#ffedd5', text: '#ea580c' };
                                if (color.includes('gray') || color.includes('slate')) return { bg: '#f1f5f9', text: '#475569' };
                                return { bg: '#f1f5f9', text: '#475569' };
                              };
                              const colors = getColors(label.color || '');
                              return (
                                <Badge 
                                  key={label.id}
                                  className="px-2 py-0.5 text-[10px] font-medium border-none rounded-sm cursor-pointer hover:opacity-80 transition-all"
                                  style={{ backgroundColor: colors.bg, color: colors.text }}
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
                    const getColors = (color: string) => {
                      if (color.includes('red') || color.includes('rose')) return { bg: '#fef2f2', text: '#dc2626' };
                      if (color.includes('blue')) return { bg: '#dbeafe', text: '#2563eb' };
                      if (color.includes('green') || color.includes('emerald')) return { bg: '#dcfce7', text: '#16a34a' };
                      if (color.includes('yellow') || color.includes('amber')) return { bg: '#fef9c3', text: '#ca8a04' };
                      if (color.includes('purple') || color.includes('indigo')) return { bg: '#f3e8ff', text: '#9333ea' };
                      if (color.includes('pink')) return { bg: '#fce7f3', text: '#db2777' };
                      if (color.includes('orange')) return { bg: '#ffedd5', text: '#ea580c' };
                      if (color.includes('gray') || color.includes('slate')) return { bg: '#f1f5f9', text: '#475569' };
                      return { bg: '#f1f5f9', text: '#475569' };
                    };
                    const colors = getColors(labelInfo?.color || '');
                    return (
                      <Badge 
                        key={label.name} 
                        className={cn(
                          "px-2 py-0 text-[10px] font-medium border-none rounded-sm cursor-pointer hover:opacity-80 transition-colors",
                          label.pending && "opacity-50"
                        )}
                        style={{ backgroundColor: colors.bg, color: colors.text }}
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
                <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Создано {effectiveTask.creator.date}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Создатель</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-foreground/70">{effectiveTask.creator.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Проект</span>
                  <span className="text-[9px] font-bold text-foreground/70">{effectiveTask.project}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Image Lightbox Dialog */}
    <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
        <div className="relative flex items-center justify-center min-h-[200px] max-h-[85vh]">
          {selectedImage && (
            <>
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-[85vh] object-contain"
                onClick={() => setSelectedImage(null)}
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage.url;
                    link.download = selectedImage.name;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                {selectedImage.name}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
