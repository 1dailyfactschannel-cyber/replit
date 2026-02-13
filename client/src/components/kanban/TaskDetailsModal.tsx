import React, { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export interface Task {
  id: number | string;
  title: string;
  description: string;
  status: string;
  priority: string;
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
  });

  const [newTitle, setNewTitle] = useState(task?.title || "");
  const [newDescription, setNewDescription] = useState(task?.description || "");

  // Update local states when task prop changes (e.g. after successful mutation or task switch)
  useEffect(() => {
    if (task) {
      setNewTitle(task.title || "");
      setNewDescription(task.description || "");
      setLocalSubtasks(task.subtasks || []);
      setAttachments(task.attachments || []);
    }
  }, [task]);

  // Sync observers with server data
  useEffect(() => {
    if (serverObservers && serverObservers.length > 0) {
      const formattedObservers = serverObservers.map((user: any) => ({
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username,
        avatar: user.avatar,
      }));
      setLocalObservers(formattedObservers);
    } else if (task?.observers) {
      setLocalObservers(task.observers);
    }
  }, [serverObservers, task]);

  // Sync subtasks - при открытии модалки загружаем с сервера
  useEffect(() => {
    if (serverSubtasks && serverSubtasks.length > 0) {
      setLocalSubtasks(serverSubtasks);
    } else if (task?.subtasks) {
      setLocalSubtasks(task.subtasks);
    }
  }, [task?.id, open]);

  // Sync labels with task data
  useEffect(() => {
    if (task?.labels) {
      setLocalLabels(task.labels);
    }
  }, [task?.labels]);

  // Local state for immediate UI updates
  const [localAssignee, setLocalAssignee] = useState<{ name: string; avatar?: string } | null>(null);
  const [localDueDate, setLocalDueDate] = useState<string | null>(null);
  
  // Sync local assignee with task data
  useEffect(() => {
    if (task?.assignee) {
      setLocalAssignee(task.assignee);
    } else {
      setLocalAssignee(null);
    }
  }, [task?.assignee]);

  // Sync local dueDate with task data
  useEffect(() => {
    if (task?.dueDate) {
      setLocalDueDate(task.dueDate);
    } else {
      setLocalDueDate(null);
    }
  }, [task?.dueDate]);

  const [attachments, setAttachments] = useState<{ name: string; url: string; size: string; type: string }[]>(task?.attachments || []);
  const [localObservers, setLocalObservers] = useState<{ name: string; avatar?: string }[]>(task?.observers || []);
  const [localLabels, setLocalLabels] = useState<string[]>(task?.labels || []);
  const [localSubtasks, setLocalSubtasks] = useState<{ id: string | number; title: string; completed: boolean; isCompleted?: boolean; dueDate?: string; author?: { name: string; avatar?: string } | null; order?: number }[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  
  // Popover states
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [localComments, setLocalComments] = useState<any[]>([]);
  const { data: serverComments = [] } = useQuery<any[]>({
    queryKey: [`/api/tasks/${task?.id}/comments`],
    enabled: !!task?.id,
  });

  useEffect(() => {
    if (serverComments && serverComments.length > 0) {
      setLocalComments(serverComments);
    }
  }, [serverComments]);

  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<{ name: string; url: string; size: string; type: string }[]>([]);
  const [isUploadingCommentFile, setIsUploadingCommentFile] = useState(false);
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
      if (task?.boardId) {
        queryClient.invalidateQueries({ queryKey: [`/api/boards/${task.boardId}/full`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id] });
      if (onUpdate && data) onUpdate(data);
    },
    onError: (error) => {
      console.error("Update error:", error);
      sonnerToast.error(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      // Rollback local states if needed
      if (task) {
        setNewTitle(task.title || "");
        setNewDescription(task.description || "");
        setLocalSubtasks(task.subtasks || []);
        setLocalObservers(task.observers || []);
      }
    }
  });

  const handleUpdate = (updates: Partial<Task>) => {
    console.log("[TaskDetails] handleUpdate called with:", updates);
    console.log("[TaskDetails] Current task:", task);
    console.log("[TaskDetails] Task ID:", task?.id, "Type:", typeof task?.id);
    
    if (!task?.id) {
      console.error("[TaskDetails] No task ID available!");
      sonnerToast.error("Ошибка: ID задачи не найден");
      return;
    }
    
    if (typeof task.id === 'string' && task.id.startsWith('temp-')) {
      console.log("[TaskDetails] Skipping update for temp task");
      return;
    }
    
    // Immediate UI update for assignee change
    if (updates.assigneeId && users) {
      const newAssignee = users.find((u: any) => u.id === updates.assigneeId);
      if (newAssignee) {
        const displayName = newAssignee.firstName 
          ? `${newAssignee.firstName} ${newAssignee.lastName || ''}` 
          : newAssignee.username;
        setLocalAssignee({ name: displayName, avatar: newAssignee.avatar });
      }
    }
    
    // Immediate UI update for dueDate change
    if (updates.dueDate) {
      setLocalDueDate(updates.dueDate);
    }
    
    console.log("[TaskDetails] Calling mutation with:", updates);
    updateTaskMutation.mutate(updates);
  };

  const handleTitleBlur = () => {
    console.log("[TaskDetails] Title blur, newTitle:", newTitle, "task.title:", task?.title);
    if (newTitle !== task?.title) {
      console.log("[TaskDetails] Updating title to:", newTitle);
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
      
      setLocalComments([savedComment, ...localComments]);
      setNewComment("");
      setCommentAttachments([]);
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}/comments`] });
    } catch (error) {
      sonnerToast.error("Не удалось отправить комментарий");
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task?.id) return;
    
    // Создаем временную подзадачу для мгновенного отображения
    const tempId = `temp-${Date.now()}`;
    const tempSubtask = {
      id: tempId,
      taskId: task.id,
      title: newSubtaskTitle,
      completed: false,
      isCompleted: false,
      order: localSubtasks.length,
      author: { name: "Вы" }, // Показываем как текущего пользователя
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
      const res = await apiRequest("POST", `/api/tasks/${task.id}/subtasks`, {
        title: newSubtaskTitle,
        completed: false
      });
      const newSub = await res.json();
      
      // Заменяем временную подзадачу на реальную
      setLocalSubtasks(prev => prev.map(s => s.id === tempId ? newSub : s));
      
      if (onUpdate && task) {
        onUpdate({
          ...task,
          subtasks: task.subtasks ? [...task.subtasks, newSub] : [newSub]
        });
      }
      
      // Инвалидируем кэш в фоне
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/subtasks`] });
    } catch (error) {
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
      
      // Только инвалидируем запрос подзадач (без лишних запросов)
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/subtasks`] });
      
      sonnerToast.success("Подзадача удалена");
    } catch (error) {
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

  const handleAddLabel = (label: string) => {
    if (!label.trim() || localLabels.includes(label.trim())) return;
    const updatedLabels = [...localLabels, label.trim()];
    setLocalLabels(updatedLabels);
    handleUpdate({ tags: updatedLabels });
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const updatedLabels = localLabels.filter(label => label !== labelToRemove);
    setLocalLabels(updatedLabels);
    handleUpdate({ tags: updatedLabels });
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

  // Ensure task has all required properties for rendering
  const reversePriorityMap: Record<string, string> = {
    "Без приоритета": "low",
    "Низкий": "low",
    "Средний": "medium",
    "Высокий": "high",
    "Критический": "critical"
  };

  const handlePriorityChange = (displayValue: string) => {
    const dbValue = reversePriorityMap[displayValue] || "medium";
    handleUpdate({ priority: dbValue });
  };

  const priorityMap: Record<string, string> = {
    "low": "Низкий",
    "medium": "Средний",
    "high": "Высокий",
    "critical": "Критический",
    "Низкий": "Низкий",
    "Средний": "Средний",
    "Высокий": "Высокий",
    "Критический": "Критический",
    "Без приоритета": "Без приоритета"
  };

  const safeTask = {
    ...task,
    creator: task?.creator || { name: "Неизвестно", date: "", avatar: null },
    history: task?.history || [],
    labels: task?.labels || [],
    subtasks: task?.subtasks || [],
    comments: task?.comments || [],
    attachments: task?.attachments || [],
    type: task?.type || "Задача",
    priority: priorityMap[task?.priority || "medium"] || "Средний",
    status: task?.status || "В планах",
    dueDate: task?.dueDate || "Не установлен",
    project: task?.project || "м4",
    board: task?.board || "доска"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        {/* Top Header / Breadcrumbs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-background/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium font-sans">
            <span>{safeTask.project}</span>
            <ChevronRight className="w-3 h-3" />
            <span>{safeTask.board}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/70">Разработка #{safeTask.id}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-semibold px-3 border-border/60 hover:bg-secondary/50">
              <Play className="w-3 h-3 fill-current" />
              Запустить
            </Button>
            <Separator orientation="vertical" className="h-4 mx-1 opacity-50" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border border-background" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <LinkIcon className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <PanelRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-4 h-4" />
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
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setNewTitle(task?.title || "");
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        handleTitleBlur();
                      }
                    }}
                    className="text-3xl font-bold border-none bg-transparent pr-12 focus-visible:ring-0 h-auto placeholder:text-muted-foreground/30 font-sans"
                    placeholder="Введите название задачи..."
                  />
                  {newTitle !== task?.title && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        console.log("[TaskDetails] Save button clicked");
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
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-muted-foreground/80">
                  <AlignLeft className="w-4 h-4" />
                  <span className="text-sm font-semibold tracking-tight uppercase">Описание задачи</span>
                </div>
                <div className="bg-secondary/10 rounded-xl p-1 border border-border/30 hover:border-border/60 transition-colors">
                  <RichTextEditor 
                    content={newDescription} 
                    onChange={handleDescriptionChange}
                    onBlur={handleDescriptionBlur}
                    placeholder="Добавьте детальное описание..."
                  />
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="space-y-5">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5 text-muted-foreground/80">
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-tight uppercase">
                      Подзадачи 
                      <span className="ml-2 text-primary/60">
                        {localSubtasks.filter(s => s.completed).length}/{localSubtasks.length}
                      </span>
                    </span>
                  </div>
                </div>
                
                <Separator className="opacity-40" />

                <div className="space-y-1">
                  {localSubtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-secondary/30 transition-all group"
                    >
                      <button 
                        onClick={() => toggleSubtask(sub.id)}
                        className="shrink-0 transition-transform active:scale-90"
                      >
                        {sub.completed ? (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors" />
                        )}
                      </button>
                      <span className={cn(
                        "text-[15px] flex-1 font-medium transition-all", 
                        sub.completed ? "text-muted-foreground line-through opacity-60" : "text-foreground/90"
                      )}>
                        {sub.title}
                      </span>
                      
                      {sub.author && (
                        <Badge 
                          variant="secondary" 
                          className="text-[10px] px-2 py-0.5 h-6 font-normal shrink-0"
                        >
                          {sub.author.name}
                        </Badge>
                      )}
                      
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground/60 hover:text-destructive"
                          onClick={() => handleDeleteSubtask(sub.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {sub.dueDate && (
                          <Badge variant="destructive" className="h-6 gap-1.5 text-[10px] font-bold bg-rose-500/90 hover:bg-rose-500 border-none px-2">
                            <Calendar className="w-3 h-3" />
                            {sub.dueDate}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  ))}
                </div>

                {isAddingSubtask ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/20">
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
                      className="h-9 border-none bg-transparent focus-visible:ring-0 text-sm"
                    />
                    <Button size="sm" onClick={handleAddSubtask} className="h-8">
                      Ок
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingSubtask(false)} className="h-8">
                      Отмена
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 px-3 gap-2 text-muted-foreground/70 hover:text-primary hover:bg-primary/5 transition-all -ml-1"
                    onClick={() => setIsAddingSubtask(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-tight">Добавить подзадачу</span>
                  </Button>
                )}
              </div>

              {/* Attachments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-muted-foreground/80">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-tight uppercase">Вложения</span>
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
                      className="h-8 px-2.5 gap-2 text-muted-foreground/70 hover:text-primary hover:bg-primary/5 transition-all"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">Загрузить</span>
                    </Button>
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2 p-4 rounded-xl bg-secondary/10 border border-border/40">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-muted-foreground animate-pulse">Загрузка файлов...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {attachments.map((file, i) => (
                    <div 
                      key={i}
                      className="group relative flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-border/30 hover:bg-secondary/20 hover:border-primary/20 transition-all cursor-pointer"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = file.url;
                        link.download = file.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border/50 group-hover:scale-105 transition-transform">
                        {file.type.startsWith("image/") ? (
                          <img src={file.url} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <FileIcon className="w-5 h-5 text-primary/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate pr-6">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tighter">{file.size}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newAttachments = attachments.filter((_, idx) => idx !== i);
                          setAttachments(newAttachments);
                          handleUpdate({ attachments: newAttachments });
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Section / Tabs */}
              <div className="pt-6 space-y-6">
                <Tabs defaultValue="comments" className="w-full">
                  <div className="flex items-center justify-between border-b border-border/40 pb-px">
                    <TabsList className="bg-transparent p-0 h-auto gap-8 border-none">
                      <TabsTrigger 
                        value="comments" 
                        className="p-0 pb-3 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-sm font-bold transition-all gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Комментарии 
                        <span className="text-xs opacity-60 font-medium">{localComments.length}</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="timer" 
                        className="p-0 pb-3 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-sm font-bold transition-all gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Таймер
                      </TabsTrigger>
                      <TabsTrigger 
                        value="history" 
                        className="p-0 pb-3 bg-transparent border-b-2 border-transparent rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-sm font-bold transition-all gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Активность
                      </TabsTrigger>
                    </TabsList>
                    
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pb-3">29.12.2025</span>
                  </div>
                  
                  <TabsContent value="comments" className="pt-6 mt-0">
                    <div className="space-y-4 mb-24 min-h-[200px]">
                      {localComments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className={cn(
                            "flex flex-col gap-1 max-w-[80%]",
                            comment.authorId === (users.find(u => u.username === "admin")?.id || "") ? "ml-auto items-end" : "items-start"
                          )}
                        >
                          <div 
                            className={cn(
                              "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm border",
                              comment.authorId === (users.find(u => u.username === "admin")?.id || "") 
                                ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none" 
                                : "bg-card text-foreground border-border/50 rounded-tl-none"
                            )}
                          >
                            <div className="flex flex-col gap-2">
                              <span className="text-xs opacity-70 mb-1">{comment.author?.name}</span>
                              {comment.content}
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {comment.attachments.map((file: any, i: number) => (
                                    <a 
                                      key={i} 
                                      href={file.url} 
                                      download={file.name}
                                      className="flex items-center gap-1.5 p-1.5 rounded-lg bg-background/20 hover:bg-background/40 transition-colors text-[10px]"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      {file.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-1">
                            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tighter">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ScrollArea>

          {/* Comment Input Sticky Bottom Area */}
          <div className="absolute bottom-0 left-0 w-[calc(100%-288px)] p-6 bg-gradient-to-t from-background via-background/95 to-transparent shrink-0 z-10">
            <div className="max-w-4xl mx-auto space-y-2">
              {/* Comment Attachments Preview */}
              {commentAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 py-2 bg-secondary/30 rounded-xl border border-border/40">
                  {commentAttachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-lg text-[10px] font-bold">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button 
                        onClick={() => setCommentAttachments(commentAttachments.filter((_, idx) => idx !== i))}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                  <Avatar className="w-6 h-6 grayscale opacity-50">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>@</AvatarFallback>
                  </Avatar>
                </div>
                <Input 
                  placeholder="Напишите комментарий..." 
                  className="h-14 pl-14 pr-24 bg-secondary/20 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all text-[15px] font-medium placeholder:text-muted-foreground/40 shadow-inner"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
                      "h-9 w-9 text-muted-foreground/60 hover:text-foreground hover:bg-secondary/40 rounded-xl",
                      isUploadingCommentFile && "animate-pulse"
                    )}
                    asChild
                  >
                    <label htmlFor="comment-file-upload" className="cursor-pointer">
                      <Paperclip className="w-4 h-4" />
                    </label>
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-9 w-9 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 rounded-xl"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() && commentAttachments.length === 0}
                  >
                    <Send className="w-4 h-4 rotate-0" />
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
                        {localAssignee?.avatar && (
                          <Avatar className="w-5 h-5 border border-background">
                            <AvatarImage src={localAssignee.avatar} />
                            <AvatarFallback className="text-[8px]">{localAssignee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        )}
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
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
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
                  { icon: CheckSquare, label: "Подзадачи", value: `${localSubtasks.filter(s => s.completed).length}/${localSubtasks.length}` },
                  { icon: Paperclip, label: "Файлы", value: attachments.length > 0 ? `${attachments.length}` : "0" },
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
                                        <Avatar className="w-6 h-6">
                                          <AvatarImage src={user.avatar} />
                                          <AvatarFallback>{displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
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
                          {(item as any).avatar && (
                            <Avatar className="w-5 h-5 border border-background">
                              <AvatarImage src={(item as any).avatar} />
                              <AvatarFallback className="text-[8px]">{(item as any).value?.substring(0, 2).toUpperCase() || ''}</AvatarFallback>
                            </Avatar>
                          )}
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
                  value={safeTask.priority}
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger className="w-full h-10 bg-secondary/15 border-none rounded-lg px-3 hover:bg-secondary/25 transition-all font-bold text-[13px]">
                    <div className="flex items-center gap-3">
                      {safeTask.priority === "Без приоритета" && (
                        <>
                          <span className="w-5 h-5" />
                          <span className="text-foreground/70">Без приоритета</span>
                        </>
                      )}
                      {safeTask.priority === "Низкий" && (
                        <>
                          <SignalLow className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
                          <span className="text-blue-500">Низкий</span>
                        </>
                      )}
                      {safeTask.priority === "Средний" && (
                        <>
                          <SignalMedium className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
                          <span className="text-orange-500">Средний</span>
                        </>
                      )}
                      {safeTask.priority === "Высокий" && (
                        <>
                          <SignalHigh className="w-5 h-5 text-rose-500" strokeWidth={2.5} />
                          <span className="text-rose-500">Высокий</span>
                        </>
                      )}
                      {safeTask.priority === "Критический" && (
                        <>
                          <Flame className="w-5 h-5 text-rose-600" strokeWidth={2.5} />
                          <span className="text-rose-600">Критический</span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl min-w-[220px]">
                    <SelectItem value="Без приоритета" className="text-[14px] py-3">
                      <div className="flex items-center justify-between w-full">
                        <span>Без приоритета</span>
                        {safeTask.priority === "Без приоритета" && <Check className="w-5 h-5 ml-4" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="Низкий" className="text-[14px] py-3 text-blue-500">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <SignalLow className="w-5 h-5" strokeWidth={2.5} />
                          <span>Низкий</span>
                        </div>
                        {safeTask.priority === "Низкий" && <Check className="w-5 h-5 ml-4" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="Средний" className="text-[14px] py-3 text-orange-500">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <SignalMedium className="w-5 h-5" strokeWidth={2.5} />
                          <span>Средний</span>
                        </div>
                        {safeTask.priority === "Средний" && <Check className="w-5 h-5 ml-4" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="Высокий" className="text-[14px] py-3 text-rose-500">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <SignalHigh className="w-5 h-5" strokeWidth={2.5} />
                          <span>Высокий</span>
                        </div>
                        {safeTask.priority === "Высокий" && <Check className="w-5 h-5 ml-4" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="Критический" className="text-[14px] py-3 text-foreground">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Flame className="w-5 h-5 text-rose-600" strokeWidth={2.5} />
                          <span>Критический</span>
                        </div>
                        {safeTask.priority === "Критический" && <Check className="w-5 h-5 ml-4" />}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Fields Button */}
              <Button variant="ghost" className="w-full h-9 justify-start gap-2.5 bg-secondary/15 hover:bg-secondary/25 rounded-lg px-3 text-foreground/70 transition-all">
                <AlignLeft className="w-3.5 h-3.5" />
                <span className="text-[12px] font-bold">Поля пользователя</span>
              </Button>

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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddLabel(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="h-8 text-sm"
                        />
                        <div className="flex flex-wrap gap-1">
                          {localLabels.map((label: string) => (
                            <Badge 
                              key={label} 
                              variant="secondary" 
                              className="px-2 py-0.5 text-[9px] font-bold bg-primary/10 text-primary border-none rounded-md cursor-pointer hover:bg-destructive/20 hover:text-destructive"
                              onClick={() => handleRemoveLabel(label)}
                            >
                              {label} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-wrap gap-1">
                  {localLabels.map((label: string) => (
                    <Badge 
                      key={label} 
                      variant="secondary" 
                      className="px-2 py-0 text-[9px] font-bold bg-primary/10 text-primary border-none rounded-md cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                      onClick={() => handleRemoveLabel(label)}
                      title="Кликните для удаления"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Footer Metadata */}
              <div className="pt-6 space-y-1.5 px-1">
                <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Создано {safeTask.creator.date}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Создатель</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="w-3.5 h-3.5">
                      {safeTask.creator.avatar && <AvatarImage src={safeTask.creator.avatar} />}
                      <AvatarFallback className="text-[7px]">{safeTask.creator.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
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
