import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useRenderCount, usePropChanges } from "@/debug-hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Label as LabelType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  User,
  Tag,
  MessageSquare,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Circle,
  MoreVertical,
  Calendar as CalendarIcon,
  Flag,
  Send,
  Paperclip,
  Loader2,
  FileIcon,
  X,
  Download,
  Check,
  Eye,
  ChevronDown,
} from "lucide-react";
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
import { toast } from "sonner";

export interface Task {
  id: number;
  dbId?: string; // ID задачи в базе данных
  title: string;
  description: string;
  status: string;
  priority: "Низкий" | "Средний" | "Высокий" | "Критический";
  type: string;
  assignee: { name: string; avatar?: string };
  creator: { name: string; date: string };
  dueDate: string;
  labels: string[];
  subtasks: { id: number; title: string; completed: boolean }[];
  comments: { id: number; author: { name: string; avatar?: string }; text: string; date: string }[];
  history: { id: number; action: string; user: string; date: string }[];
  observers?: { name: string; avatar?: string }[];
  timeSpent?: string;
  isAccepted?: boolean;
  startTime?: number;
}

interface TaskDetailsModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (task: Task) => void;
  onAccept?: (taskId: number) => void;
  boardId?: string; // ID доски для создания задач
}

export function TaskDetailsModal({
  task,
  open,
  onOpenChange,
  onUpdate,
  onAccept,
  boardId,
}: TaskDetailsModalProps) {
  // Диагностика
  const renderCount = useRenderCount('TaskDetailsModal');
  usePropChanges({ task, open, onUpdate, onAccept, boardId }, 'TaskDetailsModal');
  
  console.log('=== TASK DETAILS MODAL RENDER START ===');
  console.log('Props received:', { task: !!task, open, onUpdate: !!onUpdate, onAccept: !!onAccept, boardId });
  console.log('Render count:', renderCount);
  if (task) {
    console.log('Task details:', {
      id: task.id,
      dbId: task.dbId,
      title: task.title,
      status: task.status
    });
  }
  
  const { user } = useUser();
  console.log('User context:', !!user);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachments, setAttachments] = useState<{ id?: string; name: string; size: string; type: string; data?: string; uploadedAt?: string }[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState<{ id: number; dbId?: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [localComments, setLocalComments] = useState<{ id: number; dbId?: string; author: { name: string; avatar?: string }; text: string; date: string }[]>([]);
  const [localObservers, setLocalObservers] = useState<{ userId?: string; name: string; avatar?: string }[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<{ name: string; size: string; type: string }[]>([]);
  const [taskDbId, setTaskDbId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Используем useMemo для вычисления локальных меток
  const localLabels = useMemo(() => {
    return task?.labels || [];
  }, [task?.id, task?.labels]);
  
  // Удален useEffect который вызывал бесконечный цикл
  
  // Загрузка меток из базы данных
  const { data: availableLabels = [] } = useQuery<LabelType[]>({
    queryKey: ["labels"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/labels");
      const jsonData = await response.json();
      return Array.isArray(jsonData) ? jsonData : [];
    },
  });
  
  // Фильтрация и сортировка меток
  const filteredAndSortedLabels = React.useMemo(() => {
    // Фильтрация по поисковому запросу
    let filtered = availableLabels.filter(label => 
      label.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Сортировка: сначала добавленные к этой задаче, затем по частоте использования
    filtered.sort((a, b) => {
      const aAdded = localLabels.includes(a.name);
      const bAdded = localLabels.includes(b.name);
      
      // Сначала добавленные метки
      if (aAdded && !bAdded) return -1;
      if (!aAdded && bAdded) return 1;
      
      // Затем по алфавиту
      return a.name.localeCompare(b.name);
    });
    
    return filtered;
  }, [availableLabels, searchTerm, localLabels]);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);
  const [localAssignee, setLocalAssignee] = useState<{ name: string; avatar?: string }>(task?.assignee || { name: "" });
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [localPriority, setLocalPriority] = useState<Task["priority"]>(task?.priority || "Средний");
  const [localStatus, setLocalStatus] = useState<string>(task?.status || "В планах");
  const formatDateWithTime = (dateStr: string) => {
    if (!dateStr || dateStr === "Не установлен") return "Не установлен";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };
  
  const [localDueDate, setLocalDueDate] = useState<string>(() => formatDateWithTime(task?.dueDate || "Не установлен"));

  // Функция для обновления задачи в БД
  const updateTaskInDB = async (updates: any) => {
    if (!taskDbId) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskDbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        console.error('Failed to update task in DB');
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Функция для логирования истории изменений
  const logTaskHistory = async (action: string, fieldName?: string, oldValue?: string, newValue?: string) => {
    if (!taskDbId || !user?.id) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskDbId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action,
          fieldName,
          oldValue,
          newValue
        })
      });
      
      if (response.ok) {
        // Перезагружаем историю после добавления записи
        const historyResponse = await fetch(`/api/tasks/${taskDbId}/history`);
        if (historyResponse.ok) {
          const history = await historyResponse.json();
          setTaskHistory(history);
        }
      }
    } catch (error) {
      console.error('Error logging task history:', error);
    }
  };

  // Используем useRef для отслеживания уже загруженных задач
  const loadedTaskIds = React.useRef<Set<string>>(new Set());
  
  React.useEffect(() => {
    console.log('=== USE EFFECT TRIGGERED ===');
    console.log('Task dependency:', task?.dbId);
    console.log('Task object in effect:', task);
    
    if (task && task.dbId) {
      // Проверяем, загружали ли мы уже эту задачу
      if (loadedTaskIds.current.has(task.dbId)) {
        console.log('Task already loaded, skipping...');
        return;
      }
      
      console.log('Loading new task data...');
      loadedTaskIds.current.add(task.dbId);
      
      // Обновляем локальные состояния только один раз
      setLocalSubtasks(task.subtasks || []);
      setLocalComments(task.comments || []);
      setLocalObservers(task.observers || []);
      setTaskDbId(task.dbId);
      setLocalAssignee(task.assignee || { name: "" });
      setLocalPriority(task.priority || "Средний");
      setLocalStatus(task.status || "В планах");
      setLocalDueDate(formatDateWithTime(task.dueDate));
      
      console.log('Local states updated');
      
      // Асинхронные загрузки данных
      const loadAllDataTask = async () => {
        try {
          // Параллельная загрузка всех данных
          const [
            subtasksResponse,
            commentsResponse, 
            observersResponse,
            historyResponse,
            attachmentsResponse
          ] = await Promise.all([
            fetch(`/api/tasks/${task.dbId}/subtasks`),
            fetch(`/api/tasks/${task.dbId}/comments`),
            fetch(`/api/tasks/${task.dbId}/observers`),
            fetch(`/api/tasks/${task.dbId}/history`),
            fetch(`/api/tasks/${task.dbId}/attachments`)
          ]);

          // Обработка подзадач
          if (subtasksResponse.ok) {
            const subtasks = await subtasksResponse.json();
            const formattedSubtasks = subtasks.map((sub: any) => ({
              id: Date.now() + Math.random(),
              dbId: sub.id,
              title: sub.title,
              completed: sub.isCompleted || false
            }));
            setLocalSubtasks(formattedSubtasks);
          }

          // Обработка комментариев
          if (commentsResponse.ok) {
            const comments = await commentsResponse.json();
            const formattedComments = comments.map((comment: any) => {
              const authorName = `${comment.authorFirstName || ''} ${comment.authorLastName || ''}`.trim() || comment.authorUsername;
              const timeAgo = getTimeAgo(new Date(comment.createdAt));
              
              return {
                id: Date.now() + Math.random(),
                dbId: comment.id,
                author: {
                  name: authorName,
                  avatar: comment.authorAvatar
                },
                text: comment.content,
                date: timeAgo
              };
            });
            setLocalComments(formattedComments);
          }

          // Обработка наблюдателей
          if (observersResponse.ok) {
            const observers = await observersResponse.json();
            const formattedObservers = observers.map((obs: any) => {
              const name = `${obs.firstName || ''} ${obs.lastName || ''}`.trim() || obs.username;
              return {
                userId: obs.userId,
                name: name,
                avatar: obs.avatar
              };
            });
            setLocalObservers(formattedObservers);
          }

          // Обработка истории
          if (historyResponse.ok) {
            const history = await historyResponse.json();
            setTaskHistory(history);
          }

          // Обработка вложений
          if (attachmentsResponse.ok) {
            const attachmentsData = await attachmentsResponse.json();
            setAttachments(attachmentsData);
          }
        } catch (error) {
          console.error('Error loading task data:', error);
        }
      };
      
      loadAllDataTask();
    }
    
    // Загружаем список всех пользователей (один раз)
    if (availableUsers.length === 0) {
      const loadUsers = async () => {
        try {
          const response = await fetch('/api/users');
          if (response.ok) {
            const users = await response.json();
            setAvailableUsers(users);
          } else {
            console.error('Failed to load users:', response.status, response.statusText);
            toast.error('Не удалось загрузить список пользователей');
          }
        } catch (error) {
          console.error('Error loading users:', error);
          toast.error('Ошибка загрузки списка исполнителей');
        }
      };
      loadUsers();
    }
    
    console.log('=== USE EFFECT COMPLETED ===');
  }, [task?.dbId, availableUsers.length]);

  // Вспомогательная функция для форматирования времени
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !taskDbId) return;
    
    try {
      // Создаём комментарий в БД
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskDbId,
          authorId: user.id,
          content: newComment,
          attachments: commentAttachments.length > 0 ? commentAttachments : null
        })
      });
      
      if (response.ok) {
        const createdComment = await response.json();
        const authorName = `${createdComment.authorFirstName || ''} ${createdComment.authorLastName || ''}`.trim() || createdComment.authorUsername;
        
        const comment = {
          id: Date.now(),
          dbId: createdComment.id,
          author: { 
            name: authorName
          },
          text: newComment,
          date: "Только что",
          attachments: commentAttachments
        };
        
        const updatedComments = [comment, ...localComments];
        setLocalComments(updatedComments);
        setNewComment("");
        setCommentAttachments([]);
        
        if (task && onUpdate) {
          onUpdate({ ...task, comments: updatedComments });
        }
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const handleCommentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      type: file.type
    }));

    setCommentAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeCommentAttachment = (index: number) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const deleteComment = async (id: number) => {
    const comment = localComments.find(c => c.id === id);
    if (!comment) return;
    
    // Удаляем из БД если есть dbId
    if (comment.dbId) {
      try {
        await fetch(`/api/comments/${comment.dbId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
    
    const updatedComments = localComments.filter(c => c.id !== id);
    setLocalComments(updatedComments);
    if (task && onUpdate) {
      onUpdate({ ...task, comments: updatedComments });
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !taskDbId) return;
    
    try {
      // Создаём подзадачу в БД
      const response = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskDbId,
          title: newSubtaskTitle,
          isCompleted: false,
          order: localSubtasks.length
        })
      });
      
      if (response.ok) {
        const createdSubtask = await response.json();
        const newSub = {
          id: Date.now(),
          dbId: createdSubtask.id,
          title: newSubtaskTitle,
          completed: false
        };
        const updatedSubtasks = [...localSubtasks, newSub];
        setLocalSubtasks(updatedSubtasks);
        setNewSubtaskTitle("");
        if (task && onUpdate) {
          onUpdate({ ...task, subtasks: updatedSubtasks });
        }
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  };

  const toggleSubtask = async (id: number) => {
    const subtask = localSubtasks.find(sub => sub.id === id);
    if (!subtask) return;
    
    const updatedSubtasks = localSubtasks.map(sub => 
      sub.id === id ? { ...sub, completed: !sub.completed } : sub
    );
    setLocalSubtasks(updatedSubtasks);
    
    // Обновляем в БД если есть dbId
    if (subtask.dbId) {
      try {
        await fetch(`/api/subtasks/${subtask.dbId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCompleted: !subtask.completed })
        });
      } catch (error) {
        console.error('Error updating subtask:', error);
      }
    }
    
    if (task && onUpdate) {
      onUpdate({ ...task, subtasks: updatedSubtasks });
    }
  };

  const deleteSubtask = async (id: number) => {
    const subtask = localSubtasks.find(sub => sub.id === id);
    if (!subtask) return;
    
    // Удаляем из БД если есть dbId
    if (subtask.dbId) {
      try {
        await fetch(`/api/subtasks/${subtask.dbId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error deleting subtask:', error);
      }
    }
    
    const updatedSubtasks = localSubtasks.filter(sub => sub.id !== id);
    setLocalSubtasks(updatedSubtasks);
    if (task && onUpdate) {
      onUpdate({ ...task, subtasks: updatedSubtasks });
    }
  };

  const toggleObserver = async (selectedUser: { id?: string; name: string; avatar?: string }) => {
    if (!taskDbId) return;
    
    console.log('toggleObserver called with boardId:', boardId, 'taskDbId:', taskDbId);
    
    const userId = selectedUser.id || availableUsers.find(u => `${u.firstName || ''} ${u.lastName || ''}`.trim() === selectedUser.name || u.username === selectedUser.name)?.id;
    if (!userId) return;
    
    const isObserver = localObservers.some(o => o.userId === userId);
    
    try {
      if (isObserver) {
        // Удаляем наблюдателя - сначала обновляем UI
        const updatedObservers = localObservers.filter(o => o.userId !== userId);
        setLocalObservers(updatedObservers);
        
        // Затем синхронизируем с БД
        const response = await fetch(`/api/tasks/${taskDbId}/observers/${userId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Не очищаем кэш localStorage, так как мы не используем кэширование в production
          
          // Обновляем родительский компонент только после успешного удаления
          if (task && onUpdate) {
            onUpdate({ ...task, observers: updatedObservers });
          }
          toast.success('Наблюдатель удалён');
        } else {
          // Откатываем изменения если произошла ошибка
          setLocalObservers(localObservers);
          toast.error('Ошибка при удалении наблюдателя');
        }
      } else {
        // Добавляем наблюдателя - сначала обновляем UI оптимистично
        const tempObserver = {
          userId: userId,
          name: selectedUser.name,
          avatar: selectedUser.avatar
        };
        const updatedObservers = [...localObservers, tempObserver];
        setLocalObservers(updatedObservers);
        
        // Затем синхронизируем с БД
        const response = await fetch(`/api/tasks/${taskDbId}/observers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        
        if (response.ok) {
          const newObserver = await response.json();
          const observerName = `${newObserver.firstName || ''} ${newObserver.lastName || ''}`.trim() || newObserver.username;
          const finalObservers = [...localObservers, {
            userId: newObserver.userId,
            name: observerName,
            avatar: newObserver.avatar
          }];
          setLocalObservers(finalObservers);
          
          // Не очищаем кэш localStorage, так как мы не используем кэширование в production
          
          // Обновляем родительский компонент только после успешного добавления
          if (task && onUpdate) {
            onUpdate({ ...task, observers: finalObservers });
          }
          toast.success('Наблюдатель добавлен');
        } else {
          // Откатываем изменения если произошла ошибка
          setLocalObservers(localObservers);
          toast.error('Ошибка при добавлении наблюдателя');
        }
      }
    } catch (error) {
      console.error('Error toggling observer:', error);
      toast.error('Ошибка при изменении наблюдателей');
      // Откатываем изменения
      setLocalObservers(localObservers);
    }
  };

  const addLabel = async (labelName: string) => {
    if (!labelName.trim() || !taskDbId) return;
    
    // Проверяем, что метка еще не добавлена
    if (localLabels.includes(labelName)) {
      toast.error('Метка уже добавлена');
      return;
    }
    
    const updatedLabels = [...localLabels, labelName];
    
    try {
      await updateTaskInDB({ tags: updatedLabels });
      await logTaskHistory('добавил метку', 'tags', undefined, labelName);
      // localLabels теперь вычисляется через useMemo, обновляем через onUpdate
      if (task && onUpdate) {
        onUpdate({ ...task, labels: updatedLabels });
      }
      toast.success('Метка добавлена');
    } catch (error) {
      console.error('Error adding label:', error);
      toast.error('Ошибка при добавлении метки');
    }
  };

  const removeLabel = async (labelToRemove: string) => {
    if (!taskDbId) return;
    
    const updatedLabels = localLabels.filter(label => label !== labelToRemove);
    
    try {
      await updateTaskInDB({ tags: updatedLabels });
      await logTaskHistory('удалил метку', 'tags', labelToRemove, undefined);
      // localLabels теперь вычисляется через useMemo, обновляем через onUpdate
      if (task && onUpdate) {
        onUpdate({ ...task, labels: updatedLabels });
      }
    } catch (error) {
      console.error('Error removing label:', error);
    }
  };

  const handleDownloadFile = (fileName: string, fileData?: string) => {
    try {
      if (fileData) {
        // Если есть base64-данные, скачиваем их
        const link = document.createElement("a");
        link.href = fileData;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        toast.success(`Файл ${fileName} начал скачиваться`);
      } else {
        // Запасной вариант - mock-файл
        const blob = new Blob(["Mock file content"], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(`Файл ${fileName} начал скачиваться`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Ошибка при скачивании файла');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskDbId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Читаем файл как base64
      const reader = new FileReader();
      reader.onloadstart = () => setUploadProgress(10);
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 80;
          setUploadProgress(10 + progress);
        }
      };
      
      reader.onload = async () => {
        try {
          setUploadProgress(90);
          const base64Data = reader.result as string;
          
          // Сохраняем в БД
          const response = await fetch(`/api/tasks/${taskDbId}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              type: file.type,
              data: base64Data
            })
          });
          
          if (response.ok) {
            const newAttachment = await response.json();
            setAttachments([...attachments, newAttachment]);
            await logTaskHistory('добавил вложение', undefined, undefined, file.name);
            toast.success(`Файл ${file.name} успешно загружен`);
          } else {
            toast.error('Ошибка при загрузке файла');
          }
          
          setUploadProgress(100);
          setTimeout(() => setIsUploading(false), 500);
        } catch (error) {
          console.error('Error uploading file:', error);
          toast.error('Ошибка при загрузке файла');
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Ошибка чтения файла');
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('Ошибка при загрузке файла');
      setIsUploading(false);
    }
  };

  const removeAttachment = async (index: number) => {
    if (!taskDbId) return;
    
    const attachment = attachments[index];
    if (!attachment.id) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskDbId}/attachments/${attachment.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setAttachments(attachments.filter((_, i) => i !== index));
        await logTaskHistory('удалил вложение', undefined, attachment.name);
        toast.success('Файл успешно удалён');
      } else {
        toast.error('Ошибка при удалении файла');
      }
    } catch (error) {
      console.error('Error removing attachment:', error);
      toast.error('Ошибка при удалении файла');
    }
  };

  if (!task) {
    if (!open) return null;
    // Show empty form for new task
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border bg-card">
            <DialogTitle className="text-xl font-bold leading-tight">
              Новая задача
            </DialogTitle>
            <DialogDescription className="sr-only">
              Создание новой задачи в проекте
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Название задачи</Label>
              <Input 
                id="title" 
                placeholder="Введите название..." 
                className="h-12 text-lg font-semibold"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-card">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button onClick={async () => {
              if (newTitle.trim() && user && boardId) {
                try {
                  // Создаём задачу в базе данных
                  const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: newTitle,
                      description: '',
                      boardId: boardId,
                      status: 'todo',
                      priority: 'medium',
                      type: 'task',
                      assigneeId: user.id, // Создатель автоматически становится исполнителем
                      reporterId: user.id // Создатель задачи
                    })
                  });
                  
                  if (response.ok) {
                    const createdTask = await response.json();
                    const creatorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
                    // Передаём задачу в локальном формате
                    onUpdate?.({
                      id: Date.now(),
                      dbId: createdTask.id, // Сохраняем ID из БД
                      title: createdTask.title,
                      description: createdTask.description || "",
                      status: "В планах",
                      priority: "Средний",
                      type: "Задача",
                      assignee: { name: creatorName, avatar: user.avatar }, // Создатель — исполнитель
                      creator: { name: creatorName, date: new Date().toLocaleDateString('ru-RU') },
                      dueDate: "Не установлен",
                      labels: [],
                      subtasks: [],
                      comments: [],
                      history: []
                    });
                    setNewTitle("");
                    onOpenChange(false);
                    toast.success("Задача успешно создана");
                  } else {
                    toast.error("Ошибка при создании задачи");
                  }
                } catch (error) {
                  console.error('Error creating task:', error);
                  toast.error("Ошибка при создании задачи");
                }
              }
            }}>Создать задачу</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                TS-{task.id}
              </Badge>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-muted-foreground text-xs">{task.type}</span>
            </div>
            <div className="flex items-center gap-2">
              {!task.isAccepted && (
                <Button 
                  size="sm" 
                  className="h-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 animate-pulse mr-2"
                  onClick={() => onAccept?.(task.id)}
                >
                  <Check className="w-3.5 h-3.5" /> Принять
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold leading-tight">
            {task.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Детали и редактирование задачи {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-border">
            <div className="space-y-8">
              {/* Description Section */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                  Описание
                </Label>
                <RichTextEditor 
                  content={task.description} 
                  onChange={async (content) => {
                    // Обновляем описание в БД
                    await updateTaskInDB({ description: content });
                    await logTaskHistory('изменил описание', 'description');
                    onUpdate?.({ ...task, description: content });
                  }}
                  placeholder="Добавьте детальное описание задачи..."
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground/70 uppercase tracking-wide flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Вложения
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs gap-1"
                      asChild
                    >
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Plus className="w-3 h-3" /> Добавить файл
                      </label>
                    </Button>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="p-3 rounded-lg border border-border/40 bg-secondary/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-muted-foreground italic">Загрузка файла...</span>
                      </div>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                  </div>
                )}

                {/* Attachments List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-secondary/20 transition-colors group relative"
                    >
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <FileIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate pr-6">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{file.size}</p>
                      </div>
                      <div className="flex items-center gap-1 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleDownloadFile(file.name, file.data)}
                          title="Скачать"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeAttachment(idx)}
                          title="Удалить"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                    Подзадачи
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Добавить подзадачу..." 
                      className="h-7 text-xs w-48"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    />
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAddSubtask}>
                      <Plus className="w-3 h-3" /> Добавить
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {localSubtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-secondary/20 transition-colors group"
                    >
                      <button onClick={() => toggleSubtask(sub.id)}>
                        {sub.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      <span className={cn("text-sm flex-1", sub.completed && "line-through text-muted-foreground")}>
                        {sub.title}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => deleteSubtask(sub.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                {localSubtasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      <span>Прогресс</span>
                      <span>{Math.round((localSubtasks.filter(s => s.completed).length / localSubtasks.length) * 100)}%</span>
                    </div>
                    <Progress value={(localSubtasks.filter(s => s.completed).length / localSubtasks.length) * 100} className="h-1" />
                  </div>
                )}
              </div>

              {/* Activity Section (Comments & History) */}
              <div className="space-y-4 pt-4">
                <Tabs defaultValue="comments" className="w-full">
                  <TabsList className="bg-secondary/50 p-1 w-full justify-start border-none h-11">
                    <TabsTrigger value="comments" className="gap-2 px-6 h-9">
                      <MessageSquare className="w-4 h-4" />
                      Комментарии
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 px-6 h-9">
                      <History className="w-4 h-4" />
                      История
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="comments" className="pt-4 space-y-6 mt-0">
                    <div className="flex gap-4">
                      <Avatar className="w-8 h-8 shrink-0">
                        {user?.avatar ? (
                          <AvatarImage src={user.avatar} />
                        ) : null}
                        <AvatarFallback className="text-xs font-semibold">
                          {user?.firstName && user?.lastName 
                            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                            : user?.username ? user.username.substring(0, 2).toUpperCase() : "ВЫ"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea 
                          placeholder="Напишите комментарий..." 
                          className="min-h-[100px] text-sm bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        
                        {commentAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 py-2">
                            {commentAttachments.map((file, idx) => (
                              <Badge key={idx} variant="secondary" className="gap-1 px-2 py-1">
                                <FileIcon className="w-3 h-3" />
                                <span className="max-w-[100px] truncate">{file.name}</span>
                                <button onClick={() => removeCommentAttachment(idx)} className="hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <input
                              type="file"
                              id="comment-file-input"
                              className="hidden"
                              multiple
                              onChange={handleCommentFileUpload}
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              asChild
                            >
                              <label htmlFor="comment-file-input" className="cursor-pointer">
                                <Paperclip className="w-4 h-4" />
                              </label>
                            </Button>
                          </div>
                          <Button size="sm" className="h-8" onClick={handleAddComment} disabled={!newComment.trim() && commentAttachments.length === 0}>
                            Отправить
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {localComments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-4 group">
                          <Avatar className="w-8 h-8 shrink-0">
                            {comment.author?.avatar ? (
                              <AvatarImage src={comment.author.avatar} />
                            ) : null}
                            <AvatarFallback className="text-xs font-semibold">
                              {comment.author?.name 
                                ? comment.author.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
                                : "ВЫ"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{comment.author?.name || "Вы"}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{comment.date}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                onClick={() => deleteComment(comment.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="space-y-2 leading-relaxed bg-secondary/20 p-3 rounded-lg border border-border/40">
                              <div className="text-sm text-foreground/80">{comment.text}</div>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/20">
                                  {comment.attachments.map((file: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-background/50 border border-border/30 text-[10px] font-medium group/file">
                                      <FileIcon className="w-3 h-3 text-primary" />
                                      <span className="truncate max-w-[120px]">{file.name}</span>
                                      <span className="text-muted-foreground">({file.size})</span>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 ml-1 opacity-0 group-hover/file:opacity-100 transition-opacity"
                                        onClick={() => handleDownloadFile(file.name, file.data)}
                                        title="Скачать"
                                      >
                                        <Download className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="pt-4 space-y-4 mt-0">
                    {taskHistory.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        История изменений пуста
                      </div>
                    ) : (
                      taskHistory.map((h) => {
                        const userName = h.firstName && h.lastName 
                          ? `${h.firstName} ${h.lastName}` 
                          : h.username || 'Неизвестный пользователь';
                        
                        // Форматируем действие
                        let actionText = h.action;
                        if (h.fieldName) {
                          const fieldNames: Record<string, string> = {
                            'status': 'статус',
                            'priority': 'приоритет',
                            'assigneeId': 'исполнителя',
                            'description': 'описание',
                            'dueDate': 'срок',
                            'tags': 'метки'
                          };
                          const fieldNameRu = fieldNames[h.fieldName] || h.fieldName;
                          
                          if (h.oldValue && h.newValue) {
                            actionText = `изменил ${fieldNameRu} с "${h.oldValue}" на "${h.newValue}"`;
                          } else if (h.newValue) {
                            actionText = `установил ${fieldNameRu}: "${h.newValue}"`;
                          } else if (h.oldValue) {
                            actionText = `удалил ${fieldNameRu}: "${h.oldValue}"`;
                          }
                        }
                        
                        // Форматируем дату
                        const dateObj = new Date(h.createdAt);
                        const now = new Date();
                        const diffMs = now.getTime() - dateObj.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);
                        
                        let timeAgo;
                        if (diffMins < 1) {
                          timeAgo = 'только что';
                        } else if (diffMins < 60) {
                          timeAgo = `${diffMins} мин назад`;
                        } else if (diffHours < 24) {
                          timeAgo = `${diffHours} ч назад`;
                        } else if (diffDays === 1) {
                          timeAgo = 'вчера';
                        } else if (diffDays < 7) {
                          timeAgo = `${diffDays} дн назад`;
                        } else {
                          timeAgo = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                        }

                        return (
                          <div key={h.id} className="flex gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-foreground/80">
                                <span className="font-semibold">{userName}</span> {actionText}
                              </p>
                              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Sidebar Attributes Area */}
          <div className="w-full lg:w-72 bg-secondary/5 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Статус</Label>
                <Select 
                  value={localStatus}
                  onValueChange={async (value) => {
                    if (!taskDbId) {
                      toast.error('Ошибка: задача не сохранена в БД');
                      return;
                    }
                    
                    const oldStatus = localStatus;
                    // Обновляем локальное состояние сразу
                    setLocalStatus(value);
                    
                    // Конвертируем русский статус в английский для БД
                    const dbStatus = value === 'В планах' ? 'todo' :
                                    value === 'В работе' ? 'in_progress' :
                                    value === 'На проверке' ? 'review' : 'done';
                    
                    try {
                      await updateTaskInDB({ status: dbStatus });
                      await logTaskHistory('изменил статус', 'status', oldStatus, value);
                      onUpdate?.({ ...task, status: value });
                      toast.success('Статус изменен');
                    } catch (error) {
                      console.error('Error updating status:', error);
                      // Откатываем изменения при ошибке
                      setLocalStatus(oldStatus);
                      toast.error('Ошибка при изменении статуса');
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-10 border-none bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="В планах">В планах</SelectItem>
                    <SelectItem value="В работе">В работе</SelectItem>
                    <SelectItem value="На проверке">На проверке</SelectItem>
                    <SelectItem value="Готово">Готово</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Исполнитель</Label>
                <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 group cursor-pointer hover:bg-secondary/70 transition-colors">
                      {localAssignee.name && localAssignee.name !== "Не назначен" ? (
                        <>
                          <Avatar className="w-8 h-8">
                            {localAssignee.avatar ? (
                              <AvatarImage src={localAssignee.avatar} />
                            ) : null}
                            <AvatarFallback className="text-xs font-semibold">
                              {localAssignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate flex-1">{localAssignee.name}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm text-muted-foreground truncate flex-1">Не назначен</span>
                        </>
                      )}
                      {isUpdatingAssignee ? (
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-64 max-h-64 overflow-y-auto" align="start">
                    <Command>
                      <CommandInput placeholder="Поиск исполнителя..." disabled={isUpdatingAssignee} />
                      <CommandList>
                        <CommandEmpty>Пользователь не найден</CommandEmpty>
                        <CommandGroup>
                          {availableUsers.map((user) => {
                            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
                            return (
                              <CommandItem
                                key={user.id}
                                disabled={isUpdatingAssignee}
                                onSelect={async () => {
                                  if (!taskDbId || isUpdatingAssignee) return;
                                  
                                  setIsUpdatingAssignee(true);
                                  try {
                                    const oldAssignee = localAssignee.name || 'Не назначен';
                                    await updateTaskInDB({ assigneeId: user.id });
                                    await logTaskHistory('изменил исполнителя', 'assigneeId', oldAssignee, userName);
                                    
                                    // Обновляем локальное состояние
                                    const newAssignee = {
                                      name: userName,
                                      avatar: user.avatar
                                    };
                                    setLocalAssignee(newAssignee);
                                    
                                    // Обновляем родительский компонент
                                    onUpdate?.({
                                      ...task,
                                      assignee: newAssignee
                                    });
                                    
                                    // Закрываем popover после успешного обновления
                                    setIsAssigneePopoverOpen(false);
                                    toast.success('Исполнитель назначен');
                                  } catch (error) {
                                    console.error('Error updating assignee:', error);
                                    toast.error('Ошибка при назначении исполнителя');
                                  } finally {
                                    setIsUpdatingAssignee(false);
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <Avatar className="h-6 w-6">
                                  {user.avatar ? (
                                    <AvatarImage src={user.avatar} />
                                  ) : null}
                                  <AvatarFallback className="text-[10px] font-semibold">
                                    {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 truncate">{userName}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Observers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Наблюдатели</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-secondary/50">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-64 max-h-64 overflow-y-auto" align="end">
                      <Command>
                        <CommandInput placeholder="Поиск пользователя..." />
                        <CommandList>
                          <CommandEmpty>Пользователь не найден</CommandEmpty>
                          <CommandGroup>
                            {availableUsers.map((user) => {
                              const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
                              const isObserver = localObservers.some(o => o.userId === user.id);
                              return (
                                <CommandItem
                                  key={user.id}
                                  onSelect={() => toggleObserver({ id: user.id, name: userName, avatar: user.avatar })}
                                  className="flex items-center gap-2"
                                >
                                  <div className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isObserver ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                  )}>
                                    <Check className="h-3 w-3" />
                                  </div>
                                  <Avatar className="h-6 w-6">
                                    {user.avatar ? (
                                      <AvatarImage src={user.avatar} />
                                    ) : null}
                                    <AvatarFallback className="text-[10px] font-semibold">
                                      {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 truncate">{userName}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localObservers.length > 0 ? (
                    localObservers.map((observer, idx) => (
                      <div key={observer.userId || idx} className="flex items-center gap-2 p-1.5 pr-2 rounded-full bg-secondary/50 group border border-transparent hover:border-border transition-colors">
                        <Avatar className="w-5 h-5">
                          {observer.avatar ? (
                            <AvatarImage src={observer.avatar} />
                          ) : null}
                          <AvatarFallback className="text-[9px] font-semibold">
                            {observer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-medium">{observer.name.split(' ')[0]}</span>
                        <button 
                          onClick={() => toggleObserver({ id: observer.userId, name: observer.name, avatar: observer.avatar })}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px] py-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Нет наблюдателей</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Приоритет</Label>
                <Select 
                  value={localPriority}
                  onValueChange={async (value: Task["priority"]) => {
                    if (!taskDbId) {
                      console.error('Cannot update priority: taskDbId is missing');
                      toast.error('Ошибка: задача не сохранена в БД');
                      return;
                    }
                    
                    const oldPriority = localPriority;
                    console.log('Updating priority:', { from: oldPriority, to: value, taskDbId });
                    
                    // Обновляем локальное состояние сразу
                    setLocalPriority(value);
                    
                    // Конвертируем русский приоритет в английский для БД
                    const dbPriority = value === 'Высокий' ? 'high' :
                                      value === 'Средний' ? 'medium' :
                                      value === 'Низкий' ? 'low' : 'critical';
                    
                    try {
                      await updateTaskInDB({ priority: dbPriority });
                      await logTaskHistory('изменил приоритет', 'priority', oldPriority, value);
                      onUpdate?.({ ...task, priority: value });
                      toast.success('Приоритет изменен');
                    } catch (error) {
                      console.error('Error updating priority:', error);
                      // Откатываем изменения при ошибке
                      setLocalPriority(oldPriority);
                      toast.error('Ошибка при изменении приоритета');
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-10 border-none bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <Flag className={cn("w-4 h-4", 
                        localPriority === "Критический" ? "text-rose-600" :
                        localPriority === "Высокий" ? "text-rose-400" :
                        localPriority === "Средний" ? "text-amber-500" : "text-emerald-500"
                      )} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Низкий">Низкий</SelectItem>
                    <SelectItem value="Средний">Средний</SelectItem>
                    <SelectItem value="Высокий">Высокий</SelectItem>
                    <SelectItem value="Критический">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Дедлайн</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start h-10 bg-secondary/50 border-none px-3 font-normal">
                      <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                      {localDueDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <input
                      type="datetime-local"
                      className="w-full p-3 border-none bg-background focus:outline-none"
                      defaultValue={(() => {
                        if (!task.dueDate || task.dueDate === "Не установлен") return '';
                        try {
                          // Пробуем распарсить дату
                          const date = new Date(task.dueDate);
                          if (isNaN(date.getTime())) return '';
                          // Форматируем в ISO строку для datetime-local
                          return date.toISOString().slice(0, 16);
                        } catch {
                          return '';
                        }
                      })()}
                      onChange={async (e) => {
                        if (!taskDbId) return;
                        
                        const oldDate = localDueDate;
                        
                        if (!e.target.value) {
                          // Если дата очищена
                          try {
                            setLocalDueDate("Не установлен");
                            await updateTaskInDB({ dueDate: null });
                            await logTaskHistory('изменил срок', 'dueDate', oldDate, "Не установлен");
                            onUpdate?.({
                              ...task,
                              dueDate: "Не установлен"
                            });
                            toast.success('Срок снят');
                          } catch (error) {
                            console.error('Error clearing due date:', error);
                            setLocalDueDate(oldDate);
                            toast.error('Ошибка при снятии срока');
                          }
                          return;
                        }
                        
                        try {
                          const selectedDate = new Date(e.target.value);
                          // Проверяем валидность даты
                          if (isNaN(selectedDate.getTime())) {
                            toast.error('Неверный формат даты');
                            return;
                          }
                          
                          const newDateStr = selectedDate.toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          
                          // Обновляем локальное состояние сразу
                          setLocalDueDate(newDateStr);
                          
                          await updateTaskInDB({ dueDate: selectedDate });
                          await logTaskHistory('изменил срок', 'dueDate', oldDate, newDateStr);
                          onUpdate?.({
                            ...task,
                            dueDate: newDateStr
                          });
                          toast.success('Срок установлен');
                        } catch (error) {
                          console.error('Error updating due date:', error);
                          setLocalDueDate(oldDate);
                          toast.error('Ошибка при установке срока');
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Spent */}
              {task.timeSpent && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Затрачено времени</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary tracking-tight">{task.timeSpent}</span>
                  </div>
                </div>
              )}

              {/* Labels */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Метки</Label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {localLabels.map((label) => (
                    <Badge 
                      key={label} 
                      variant="secondary" 
                      className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary border-none group relative pr-5"
                    >
                      {label}
                      <button
                        onClick={() => removeLabel(label)}
                        className="absolute right-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <Popover open={isAddingLabel} onOpenChange={setIsAddingLabel}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-secondary/50">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start">
                      <div className="space-y-2">
                        <Label className="text-xs">Выберите метку</Label>
                        
                        {/* Поле поиска */}
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Поиск меток..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-sm"
                            autoFocus
                          />
                        </div>
                        
                        {filteredAndSortedLabels.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {filteredAndSortedLabels.map((label) => (
                              <Button
                                key={label.id}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "w-full justify-start h-8 px-2 text-sm",
                                  localLabels.includes(label.name) && "bg-primary/10 text-primary"
                                )}
                                onClick={() => {
                                  addLabel(label.name);
                                  setIsAddingLabel(false);
                                  setSearchTerm(""); // Очищаем поиск после выбора
                                }}
                                disabled={localLabels.includes(label.name)}
                              >
                                <div 
                                  className={cn(
                                    "w-3 h-3 rounded-full mr-2",
                                    label.color
                                  )}
                                />
                                <span className="truncate">{label.name}</span>
                                {localLabels.includes(label.name) && (
                                  <span className="ml-auto text-xs text-muted-foreground">Добавлена</span>
                                )}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            {searchTerm ? "Метки не найдены" : "Нет доступных меток"}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              {/* Creation Info */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Создано</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{task.creator.name}</span>
                    <span className="text-[10px] text-muted-foreground">{task.creator.date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
