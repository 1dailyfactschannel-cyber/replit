import React, { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useQuery } from "@tanstack/react-query";
import { useRenderCount, usePropChanges } from "@/debug-hooks";
import { 
  Plus, 
  ChevronRight, 
  MoreVertical,
  Search,
  Hash,
  Filter,
  Users,
  Flag,
  GripVertical,
  Trash2,
  Pencil,
  Star,
  Rocket,
  Target,
  Zap,
  Heart,
  Sparkles,
  Crown,
  Trophy,
  Flame,
  AlertCircle,
  Signal,
  CircleDot,
  Lightbulb,
  Coffee,
  Palette,
  Music,
  Camera,
  Gift,
  Umbrella,
  Sun,
  Moon,
  Cloud,
  Smartphone,
  Laptop,
  Briefcase,
  BookOpen,
  Code,
  Database,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  Clock,
  FileText,
  Folder,
  CheckCircle
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskDetailsModal, Task } from "@/components/kanban/TaskDetailsModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Types
interface Project {
  id: number;
  name: string;
  boards: string[];
  priority: string;
  icon: string;
  members: number;
  collapsed: boolean;
}

// Набор доступных иконок для проектов
const PROJECT_ICONS = [
  { id: "star", icon: Star, label: "Звезда", color: "text-yellow-500" },
  { id: "rocket", icon: Rocket, label: "Ракета", color: "text-blue-500" },
  { id: "target", icon: Target, label: "Цель", color: "text-red-500" },
  { id: "zap", icon: Zap, label: "Молния", color: "text-purple-500" },
  { id: "heart", icon: Heart, label: "Сердце", color: "text-rose-500" },
  { id: "sparkles", icon: Sparkles, label: "Искры", color: "text-indigo-500" },
  { id: "crown", icon: Crown, label: "Корона", color: "text-amber-500" },
  { id: "trophy", icon: Trophy, label: "Трофей", color: "text-emerald-500" },
  { id: "flame", icon: Flame, label: "Пламя", color: "text-orange-500" },
  { id: "lightbulb", icon: Lightbulb, label: "Лампочка", color: "text-yellow-400" },
  { id: "coffee", icon: Coffee, label: "Кофе", color: "text-amber-700" },
  { id: "palette", icon: Palette, label: "Палитра", color: "text-pink-500" },
  { id: "music", icon: Music, label: "Музыка", color: "text-violet-500" },
  { id: "camera", icon: Camera, label: "Камера", color: "text-gray-600" },
  { id: "gift", icon: Gift, label: "Подарок", color: "text-red-400" },
  { id: "umbrella", icon: Umbrella, label: "Зонт", color: "text-sky-500" },
  { id: "sun", icon: Sun, label: "Солнце", color: "text-yellow-400" },
  { id: "moon", icon: Moon, label: "Луна", color: "text-indigo-400" },
  { id: "cloud", icon: Cloud, label: "Облако", color: "text-sky-300" },
  { id: "smartphone", icon: Smartphone, label: "Смартфон", color: "text-slate-600" },
  { id: "laptop", icon: Laptop, label: "Ноутбук", color: "text-gray-700" },
  { id: "briefcase", icon: Briefcase, label: "Портфель", color: "text-amber-800" },
  { id: "bookopen", icon: BookOpen, label: "Книга", color: "text-teal-600" },
  { id: "code", icon: Code, label: "Код", color: "text-green-600" },
  { id: "database", icon: Database, label: "База данных", color: "text-blue-600" },
  { id: "globe", icon: Globe, label: "Глобус", color: "text-cyan-500" },
  { id: "mail", icon: Mail, label: "Почта", color: "text-blue-400" },
  { id: "messagesquare", icon: MessageSquare, label: "Сообщение", color: "text-green-500" },
  { id: "phone", icon: Phone, label: "Телефон", color: "text-emerald-600" },
  { id: "calendar", icon: Calendar, label: "Календарь", color: "text-red-500" },
  { id: "clock", icon: Clock, label: "Часы", color: "text-slate-500" },
  { id: "filetext", icon: FileText, label: "Документ", color: "text-blue-500" },
  { id: "folder", icon: Folder, label: "Папка", color: "text-yellow-600" },
  { id: "checkcircle", icon: CheckCircle, label: "Галочка", color: "text-green-500" },
  { id: "flag", icon: Flag, label: "Флаг", color: "text-red-600" },
];

// Функция для получения иконки и цвета приоритета
const getPriorityIcon = (priority: string) => {
  const normalizedPriority = priority.toLowerCase();
  
  if (normalizedPriority === "критический" || normalizedPriority === "critical") {
    return { icon: Flame, color: "text-red-500", bgColor: "bg-red-500", label: "Критический" };
  } else if (normalizedPriority === "high" || normalizedPriority === "высокий") {
    return { icon: null, color: "text-red-500", bgColor: "bg-red-500", label: "Высокий", bars: 3 };
  } else if (normalizedPriority === "medium" || normalizedPriority === "средний") {
    return { icon: null, color: "text-yellow-500", bgColor: "bg-yellow-500", label: "Средний", bars: 2 };
  } else {
    return { icon: null, color: "text-blue-500", bgColor: "bg-blue-500", label: "Низкий", bars: 1 };
  }
};

// Компонент для отображения приоритета в виде сигнала
const PrioritySignal = ({ priority }: { priority: string }) => {
  const priorityData = getPriorityIcon(priority);
  
  // Если есть иконка (Критический), показываем её
  if (priorityData.icon) {
    const IconComponent = priorityData.icon;
    return <IconComponent className={cn("w-3.5 h-3.5", priorityData.color)} />;
  }
  
  // Иначе рисуем сигнальные палочки
  const bars = priorityData.bars || 1;
  return (
    <div className="flex items-end gap-[2px] h-3.5" title={priorityData.label}>
      {/* Палочка 1 - самая низкая */}
      <div 
        className={cn(
          "w-1 rounded-sm transition-all border border-black",
          bars >= 1 ? priorityData.bgColor : "bg-muted",
          "h-[6px]"
        )} 
      />
      {/* Палочка 2 - средняя */}
      <div 
        className={cn(
          "w-1 rounded-sm transition-all border border-black",
          bars >= 2 ? priorityData.bgColor : "bg-muted",
          "h-[9px]"
        )} 
      />
      {/* Палочка 3 - самая высокая */}
      <div 
        className={cn(
          "w-1 rounded-sm transition-all border border-black",
          bars >= 3 ? priorityData.bgColor : "bg-muted",
          "h-[12px]"
        )} 
      />
    </div>
  );
};

interface KanbanTask {
  id: number;
  dbId?: string; // Реальный ID из базы данных
  title: string;
  priority: string;
  type: string;
  subtasks?: { id: number; title: string; completed: boolean }[];
  comments?: { id: number; author: { name: string; avatar?: string }; text: string; date: string }[];
  history?: { id: number; action: string; user: string; date: string }[];
}

type KanbanColumn = KanbanTask[];
type KanbanBoard = Record<string, KanbanColumn>;
type BoardsData = Record<string, KanbanBoard>;

// Дефолтные данные для канбан-доски
const DEFAULT_KANBAN_DATA: KanbanBoard = {
  "В планах": [],
  "В работе": [],
  "На проверке": [],
  "Готово": []
};

export default function Projects() {
  // Диагностика
  const renderCount = useRenderCount('Projects');
  const { user } = useUser();
  usePropChanges({ user }, 'Projects');
  
  console.log('=== PROJECTS PAGE RENDER START ===');
  console.log('Render count:', renderCount);
  console.log('User authenticated:', !!user);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeBoard, setActiveBoard] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", icon: "star", priority: "Средний" });
  const [newBoardName, setNewBoardName] = useState("");
  const [editingColumn, setEditingColumn] = useState<{ originalName: string, currentName: string } | null>(null);
  
  // Храним соответствие между именем доски и ее ID в базе
  const [boardIdMap, setBoardIdMap] = useState<Record<string, string>>({});
  
  // Состояние для данных всех досок
  const [boardsData, setBoardsData] = useState<BoardsData>({});
  
  // Вычисляем ключ активной доски
  const activeBoardKey = `${activeProject?.id || 'default'}-${activeBoard}`;
  
  // Состояния для создания задачи
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "Средний",
    type: "feature"
  });

  // Функция для загрузки проектов с оптимизацией
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 минут
    refetchOnWindowFocus: false, // Отключаем автоматическое обновление при фокусе
    refetchOnMount: false, // Отключаем повторную загрузку при монтировании
  });

  // Функция для загрузки досок проекта с оптимизацией
  const { data: boardsDataResponse, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards', activeProject?.id],
    queryFn: async () => {
      if (!activeProject?.id) return null;
      const response = await fetch(`/api/projects/${activeProject.id}/boards`);
      if (!response.ok) throw new Error('Failed to fetch boards');
      return response.json();
    },
    enabled: !!activeProject?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Эффект для обновления списка проектов
  useEffect(() => {
    if (projectsData?.projects) {
      setProjects(projectsData.projects);
      if (projectsData.projects.length > 0 && !activeProject) {
        setActiveProject(projectsData.projects[0]);
      }
    }
  }, [projectsData, activeProject]);

  // Эффект для обновления списка досок
  useEffect(() => {
    if (boardsDataResponse?.boards) {
      const boardNames = boardsDataResponse.boards.map((board: any) => board.name);
      const newBoardIdMap: Record<string, string> = {};
      
      boardsDataResponse.boards.forEach((board: any) => {
        newBoardIdMap[board.name] = board.id;
      });
      
      setBoardIdMap(newBoardIdMap);
      
      if (boardNames.length > 0 && !activeBoard) {
        setActiveBoard(boardNames[0]);
      }
    }
  }, [boardsDataResponse, activeBoard]);

  // Эффект для загрузки задач при смене активной доски
  useEffect(() => {
    if (!activeProject || !activeBoard) return;

    const loadTasks = async () => {
      try {
        const boardId = boardIdMap[activeBoard];
        if (!boardId) return;

        const response = await fetch(`/api/boards/${boardId}/tasks`);
        if (!response.ok) {
          console.error('Failed to fetch tasks:', response.status);
          return;
        }

        const result = await response.json();
        console.log('Tasks API response:', result);

        if (result.tasks) {
          const kanbanTasks = result.tasks.map((task: any) => ({
            id: task.id,
            dbId: task.id, // Используем реальный ID из базы
            title: task.title,
            priority: task.priority || "Средний",
            type: task.type || "feature",
            subtasks: task.subtasks || [],
            comments: task.comments || [],
            history: task.history || [],
            status: task.status // Статус из БД
          }));

          // Группируем задачи по статусу для канбан-доски
          const groupedTasks: KanbanBoard = {
            "В планах": [],
            "В работе": [],
            "На проверке": [],
            "Готово": []
          };

          kanbanTasks.forEach((task: any) => {
            // Конвертируем статус из БД в название колонки
            let columnName = "В планах"; // дефолт
            if (task.status === 'todo') columnName = "В планах";
            else if (task.status === 'in_progress') columnName = "В работе";
            else if (task.status === 'review') columnName = "На проверке";
            else if (task.status === 'done') columnName = "Готово";
            
            if (!groupedTasks[columnName]) {
              groupedTasks[columnName] = [];
            }
            groupedTasks[columnName].push(task);
          });

          setBoardsData(prev => ({
            ...prev,
            [activeBoardKey]: groupedTasks
          }));
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };

    loadTasks();
  }, [activeProject, activeBoard, boardIdMap, activeBoardKey]);

  const handleTaskClick = (task: any) => {
    console.log('=== HANDLE TASK CLICK START ===');
    console.log('Incoming task object:', task);
    console.log('Task id:', task.id);
    console.log('Task dbId:', task.dbId);
    
    // Используем реальные данные задачи, а не моковые
    const newSelectedTask = {
      id: task.dbId || task.id,
      dbId: task.dbId,
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      type: task.type,
      status: task.status || "В планах",
      assignee: task.assignee || { name: "Не назначен", avatar: undefined },
      creator: task.creator || { name: "Неизвестно", date: new Date().toLocaleDateString('ru-RU') },
      dueDate: task.dueDate || "Не установлен",
      labels: task.labels || [],
      subtasks: task.subtasks || [],
      comments: task.comments || [],
      history: task.history || [],
      observers: task.observers || []
    };
    
    console.log('New selected task object:', newSelectedTask);
    console.log('Setting selectedTask state...');
    
    setSelectedTask(newSelectedTask);
    
    console.log('Setting modalOpen to true...');
    setModalOpen(true);
    
    console.log('=== HANDLE TASK CLICK END ===');
  };

  const handleCreateTask = () => {
    setIsCreateTaskOpen(true);
  };

  const handleCreateTaskSubmit = async () => {
    if (!newTask.title.trim() || !activeProject || !activeBoard) return;

    try {
      const boardId = boardIdMap[activeBoard];
      if (!boardId) {
        toast.error("Не найден ID доски");
        return;
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: "",
          priority: newTask.priority,
          type: newTask.type,
          status: 'todo',
          boardId: boardId,
          projectId: activeProject.id
        })
      });

      if (response.ok) {
        const createdTask = await response.json();
        console.log('Created task:', createdTask);
        
        // Добавляем задачу в локальное состояние
        const taskToAdd = {
          id: createdTask.id,
          dbId: createdTask.id,
          title: createdTask.title,
          priority: createdTask.priority,
          type: createdTask.type,
          status: "В планах",
          subtasks: [],
          comments: [],
          history: []
        };

        setBoardsData(prev => {
          const currentBoardData = prev[activeBoardKey] || DEFAULT_KANBAN_DATA;
          const newBoardData = {
            ...currentBoardData,
            "В планах": [...currentBoardData["В планах"], taskToAdd]
          };
          
          return {
            ...prev,
            [activeBoardKey]: newBoardData
          };
        });

        // Сбрасываем форму
        setNewTask({ title: "", priority: "Средний", type: "feature" });
        setIsCreateTaskOpen(false);
        toast.success("Задача создана");
      } else {
        toast.error("Не удалось создать задачу");
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error("Ошибка при создании задачи");
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProject.name,
          priority: newProject.priority,
          icon: newProject.icon
        })
      });

      if (response.ok) {
        const createdProject = await response.json();
        setProjects(prev => [...prev, { ...createdProject, boards: [], members: 1, collapsed: false }]);
        setActiveProject({ ...createdProject, boards: [], members: 1, collapsed: false });
        setNewProject({ name: "", icon: "star", priority: "Средний" });
        setIsCreateProjectOpen(false);
        toast.success("Проект создан");
      } else {
        toast.error("Не удалось создать проект");
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error("Ошибка при создании проекта");
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !activeProject) return;

    try {
      const response = await fetch(`/api/projects/${activeProject.id}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName })
      });

      if (response.ok) {
        const createdBoard = await response.json();
        setBoardIdMap(prev => ({ ...prev, [newBoardName]: createdBoard.id }));
        setActiveBoard(newBoardName);
        setNewBoardName("");
        setIsCreateBoardOpen(false);
        toast.success("Доска создана");
      } else {
        toast.error("Не удалось создать доску");
      }
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error("Ошибка при создании доски");
    }
  };

  const onTaskUpdate = useCallback((updatedTask: Task) => {
    console.log('=== ON TASK UPDATE IN PROJECTS PAGE ===');
    console.log('Updated task received:', updatedTask);
    console.log('Task id:', updatedTask.id);
    console.log('Task dbId:', updatedTask.dbId);
    
    const boardKey = activeBoardKey;
    console.log('Active board key:', boardKey);
    
    setBoardsData(prev => {
      console.log('Updating boards data...');
      const currentBoardData = prev[boardKey] || DEFAULT_KANBAN_DATA;
      console.log('Current board data keys:', Object.keys(currentBoardData));
      
      // Проверяем, есть ли задача в какой-либо колонке
      let existingColumn: string | null = null;
      Object.entries(currentBoardData).forEach(([columnName, tasks]) => {
        if (tasks.some((t: any) => t.id === updatedTask.id)) {
          existingColumn = columnName;
        }
      });

      console.log('Existing column:', existingColumn);
      
      // Создаем обновленные данные доски
      const newBoardData = { ...currentBoardData };
      
      if (!existingColumn) {
        // Новая задача - добавляем в колонку "В планах"
        if (!newBoardData["В планах"]) {
          newBoardData["В планах"] = [];
        }
        newBoardData["В планах"].push(updatedTask);
        console.log('Added new task to "В планах" column');
      } else {
        // Существующая задача
        
        // Если статус изменился, перемещаем задачу в другую колонку
        if (existingColumn && existingColumn !== updatedTask.status) {
          // Удаляем из старой колонки
          newBoardData[existingColumn] = newBoardData[existingColumn].filter((t: any) => t.id !== updatedTask.id);
          // Добавляем в новую колонку
          if (!newBoardData[updatedTask.status]) {
            newBoardData[updatedTask.status] = [];
          }
          newBoardData[updatedTask.status].push(updatedTask);
        } else if (existingColumn) {
          // Статус не изменился - просто обновляем задачу
          newBoardData[existingColumn] = newBoardData[existingColumn].map((t: any) => 
            t.id === updatedTask.id ? { ...t, ...updatedTask } : t
          );
        }
      }
      
      // Не очищаем кэш, так как мы не используем localStorage кэширование
      
      return {
        ...prev,
        [boardKey]: newBoardData
      };
    });
    
    toast.success(Object.values(boardsData[boardKey] || {}).flat().find((t: any) => t.id === updatedTask.id) ? "Задача обновлена" : "Задача успешно создана");
    console.log('=== ON TASK UPDATE COMPLETED ===');
  }, [activeBoardKey, boardsData, DEFAULT_KANBAN_DATA]);

  const handleRenameColumn = (oldName: string, newName: string) => {
    if (!newName || oldName === newName) {
      setEditingColumn(null);
      return;
    }
    const boardKey = activeBoardKey;
    const currentBoardData = boardsData[boardKey] || DEFAULT_KANBAN_DATA;
    
    // Create a new object with preserved order
    const newData: Record<string, any> = {};
    Object.keys(currentBoardData).forEach(key => {
      if (key === oldName) {
        newData[newName] = currentBoardData[oldName];
      } else {
        newData[key] = currentBoardData[key];
      }
    });
    
    setBoardsData(prev => ({ ...prev, [boardKey]: newData }));
    setEditingColumn(null);
    toast.success("Колонка переименована");
  };

  const handleDeleteColumn = (colName: string) => {
    const boardKey = activeBoardKey;
    const currentBoardData = boardsData[boardKey] || DEFAULT_KANBAN_DATA;
    const newData = { ...currentBoardData };
    delete newData[colName];
    
    setBoardsData(prev => ({ ...prev, [boardKey]: newData }));
    toast.success("Колонка удалена");
  };

  const handleAddColumn = () => {
    const boardKey = activeBoardKey;
    setBoardsData(prev => {
      const currentData = { ...(prev[boardKey] || DEFAULT_KANBAN_DATA) };
      const newName = `Новая колонка ${Object.keys(currentData).length + 1}`;
      return {
        ...prev,
        [boardKey]: { ...currentData, [newName]: [] }
      };
    });
    toast.success("Колонка добавлена");
  };

  const toggleProjectCollapse = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, collapsed: !p.collapsed } : p
    ));
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const boardKey = activeBoardKey;
    const currentBoardData = { ...boardsData[boardKey] || DEFAULT_KANBAN_DATA };

    if (type === "column") {
      const entries = Object.entries(currentBoardData);
      const [movedCol] = entries.splice(source.index, 1);
      entries.splice(destination.index, 0, movedCol);
      
      setBoardsData({
        ...boardsData,
        [boardKey]: Object.fromEntries(entries)
      });
      toast.success("Колонка перемещена");
      return;
    }
    
    const sourceCol = [...currentBoardData[source.droppableId]];
    const destCol = source.droppableId === destination.droppableId 
      ? sourceCol 
      : [...currentBoardData[destination.droppableId]];

    const [movedTask] = sourceCol.splice(source.index, 1);
    destCol.splice(destination.index, 0, movedTask);

    const newBoardData = {
      ...currentBoardData,
      [source.droppableId]: sourceCol,
      [destination.droppableId]: destCol
    };

    setBoardsData({
      ...boardsData,
      [boardKey]: newBoardData
    });
    
    // Обновляем статус задачи в БД, если колонка изменилась
    if (source.droppableId !== destination.droppableId && movedTask.dbId) {
      try {
        // Конвертируем название колонки в статус БД
        const dbStatus = destination.droppableId === 'В планах' ? 'todo' :
                        destination.droppableId === 'В работе' ? 'in_progress' :
                        destination.droppableId === 'На проверке' ? 'review' : 'done';
        
        const response = await fetch(`/api/tasks/${movedTask.dbId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: dbStatus })
        });
        
        if (response.ok) {
          toast.success("Задача перемещена");
        } else {
          console.error('Failed to update task status');
          toast.error("Не удалось обновить статус задачи");
        }
      } catch (error) {
        console.error('Error updating task status:', error);
        toast.error("Ошибка при обновлении статуса");
      }
    } else {
      toast.success("Задача перемещена");
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Secondary Projects Sidebar */}
        <div className="w-72 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Проекты</h2>
            <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новый проект</DialogTitle>
                  <DialogDescription>Установите параметры и приоритет проекта.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Название проекта</Label>
                    <Input 
                      id="project-name" 
                      placeholder="Напр: Редизайн сайта" 
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Приоритет проекта</Label>
                    <Select 
                      value={newProject.priority} 
                      onValueChange={(val) => setNewProject({ ...newProject, priority: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Низкий">Низкий</SelectItem>
                        <SelectItem value="Средний">Средний</SelectItem>
                        <SelectItem value="Высокий">Высокий</SelectItem>
                        <SelectItem value="Критический">Критический</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Иконка проекта</Label>
                    <Select value={newProject.icon} onValueChange={(value) => setNewProject({ ...newProject, icon: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_ICONS.map(iconObj => (
                          <SelectItem key={iconObj.id} value={iconObj.id}>
                            <div className="flex items-center gap-2">
                              {React.createElement(iconObj.icon, { className: cn("w-4 h-4", iconObj.color) })}
                              <span>{iconObj.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={!newProject.name.trim()}
                  >
                    Создать проект
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {projectsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Загрузка...</div>
              ) : projects.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Нет проектов
                </div>
              ) : (
                projects.map(project => (
                  <div 
                    key={project.id}
                    className={cn(
                      "rounded-lg p-3 cursor-pointer transition-colors group",
                      activeProject?.id === project.id 
                        ? "bg-primary/10 border border-primary/20" 
                        : "hover:bg-accent"
                    )}
                    onClick={() => setActiveProject(project)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {(() => {
                            const iconConfig = PROJECT_ICONS.find(i => i.id === project.icon) || PROJECT_ICONS[0];
                            return React.createElement(iconConfig.icon, { 
                              className: cn("w-5 h-5", iconConfig.color) 
                            });
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{project.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{project.members} участников</span>
                            <div className="flex items-center gap-1">
                              <PrioritySignal priority={project.priority} />
                              <span className="capitalize">{project.priority.toLowerCase()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => toggleProjectCollapse(project.id, e)}
                      >
                        <ChevronRight 
                          className={cn(
                            "w-4 h-4 transition-transform",
                            project.collapsed ? "" : "rotate-90"
                          )} 
                        />
                      </Button>
                    </div>
                    
                    {!project.collapsed && (
                      <div className="mt-3 pl-8 space-y-1">
                        {boardsLoading ? (
                          <div className="text-xs text-muted-foreground">Загрузка досок...</div>
                        ) : boardsDataResponse?.boards?.length ? (
                          boardsDataResponse.boards.map((board: any) => (
                            <div
                              key={board.id}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors",
                                activeBoard === board.name
                                  ? "bg-secondary text-secondary-foreground"
                                  : "hover:bg-accent"
                              )}
                              onClick={() => setActiveBoard(board.name)}
                            >
                              <Hash className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{board.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground">Нет досок</div>
                        )}
                        
                        <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full justify-start text-xs h-8 mt-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateBoardOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Новая доска
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Создать новую доску</DialogTitle>
                              <DialogDescription>
                                Добавьте новую доску для проекта "{activeProject?.name}"
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="board-name">Название доски</Label>
                                <Input 
                                  id="board-name" 
                                  placeholder="Напр: Разработка" 
                                  value={newBoardName}
                                  onChange={(e) => setNewBoardName(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                onClick={handleCreateBoard}
                                disabled={!newBoardName.trim()}
                              >
                                Создать доску
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">
                {activeProject ? `${activeProject.name} / ${activeBoard}` : "Выберите проект"}
              </h1>
              {activeProject && activeBoard && (
                <Badge variant="secondary" className="text-xs">
                  {Object.values(boardsData[activeBoardKey] || DEFAULT_KANBAN_DATA).flat().length} задач
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск задач..."
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Фильтры
              </Button>
              {activeProject && activeBoard && (
                <Button onClick={handleCreateTask}>
                  <Plus className="w-4 h-4 mr-2" />
                  Новая задача
                </Button>
              )}
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-auto">
            {activeProject && activeBoard ? (
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="p-4 min-h-full">
                  <Droppable droppableId="all-columns" direction="horizontal" type="column">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex gap-4 h-full"
                      >
                        {Object.entries(boardsData[activeBoardKey] || DEFAULT_KANBAN_DATA).map(([columnName, tasks], index) => (
                          <Droppable key={columnName} droppableId={columnName} type="task">
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={cn(
                                  "w-72 bg-card rounded-lg border border-border flex flex-col",
                                  snapshot.isDraggingOver && "bg-accent/50"
                                )}
                              >
                                {/* Column Header */}
                                <div className="p-3 border-b border-border flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-sm">{columnName}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                      {tasks.length}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => setEditingColumn({ originalName: columnName, currentName: columnName })}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => handleDeleteColumn(columnName)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Tasks */}
                                <ScrollArea className="flex-1 p-2">
                                  <div className="space-y-2 min-h-[200px]">
                                    {tasks.map((task, index) => (
                                      <Draggable key={`${task.id}-${task.dbId}`} draggableId={`${task.id}-${task.dbId}`} index={index}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={cn(
                                              "bg-background rounded-lg border border-border p-3 cursor-pointer hover:shadow-sm transition-shadow",
                                              snapshot.isDragging && "shadow-lg rotate-1"
                                            )}
                                            onClick={() => handleTaskClick(task)}
                                          >
                                            <div className="flex items-start justify-between mb-2">
                                              <h4 className="font-medium text-sm leading-tight pr-2">{task.title}</h4>
                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                <PrioritySignal priority={task.priority} />
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                              <div className="flex items-center gap-2">
                                                <div className="flex -space-x-1">
                                                  {task.assignee && task.assignee.avatar ? (
                                                    <Avatar className="w-5 h-5 border-2 border-background">
                                                      <AvatarImage src={task.assignee.avatar} />
                                                      <AvatarFallback>
                                                        {task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                  ) : (
                                                    <Avatar className="w-5 h-5 border-2 border-background">
                                                      <AvatarFallback>?</AvatarFallback>
                                                    </Avatar>
                                                  )}
                                                </div>
                                                <span className="text-xs">
                                                  {task.assignee?.name || "Не назначен"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Flag className="w-3 h-3" />
                                                <span>{task.type}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                </ScrollArea>

                                {/* Add Task Button */}
                                <div className="p-2 border-t border-border">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full justify-start text-xs h-8"
                                    onClick={handleCreateTask}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Добавить задачу
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Droppable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Add Column Button */}
                        <div className="w-72 flex flex-col">
                          <Button 
                            variant="outline" 
                            className="h-12 border-dashed"
                            onClick={handleAddColumn}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Добавить колонку
                          </Button>
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              </DragDropContext>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Выберите проект и доску</div>
                  <div className="text-muted-foreground">
                    {activeProject 
                      ? "Выберите доску для просмотра задач" 
                      : "Создайте или выберите проект для начала работы"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={onTaskUpdate}
        boardId={boardIdMap[activeBoard] || ""}
      />

      {/* Create Task Dialog */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новую задачу</DialogTitle>
            <DialogDescription>
              Добавьте новую задачу в доску "{activeBoard}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Название задачи</Label>
              <Input
                id="task-title"
                placeholder="Опишите задачу..."
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Низкий">Низкий</SelectItem>
                    <SelectItem value="Средний">Средний</SelectItem>
                    <SelectItem value="Высокий">Высокий</SelectItem>
                    <SelectItem value="Критический">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тип задачи</Label>
                <Select value={newTask.type} onValueChange={(value) => setNewTask({ ...newTask, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Фича</SelectItem>
                    <SelectItem value="bug">Баг</SelectItem>
                    <SelectItem value="task">Задача</SelectItem>
                    <SelectItem value="research">Исследование</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleCreateTaskSubmit}
              disabled={!newTask.title.trim()}
            >
              Создать задачу
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Rename Dialog */}
      <Dialog open={!!editingColumn} onOpenChange={() => setEditingColumn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать колонку</DialogTitle>
            <DialogDescription>
              Измените название колонки "{editingColumn?.originalName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column-name">Новое название</Label>
              <Input
                id="column-name"
                value={editingColumn?.currentName || ""}
                onChange={(e) => setEditingColumn(prev => 
                  prev ? { ...prev, currentName: e.target.value } : null
                )}
                placeholder="Введите новое название..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => editingColumn && handleRenameColumn(editingColumn.originalName, editingColumn.currentName)}
              disabled={!editingColumn?.currentName.trim() || editingColumn?.originalName === editingColumn?.currentName}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}