import { Layout } from "@/components/layout/Layout";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
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
  Loader2,
  Plus
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const TaskCard = React.memo(({ task, index, onClick }: { task: any, index: number, onClick: (task: any) => void }) => {
  return (
    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={cn(
            "bg-card border border-border/50 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-[box-shadow,border-color,background-color] group/task relative overflow-hidden font-sans",
            snapshot.isDragging ? "shadow-xl ring-2 ring-primary/20 rotate-1 z-50" : ""
          )}
        >
          {/* Bottom border indicator for priority */}
          <div className={cn(
            "absolute inset-x-[-1px] bottom-[-1px] h-2 rounded-b-xl border-b-4",
            task.priority === "high" || task.priority === "critical" ? "border-rose-500" :
            task.priority === "medium" ? "border-amber-500" : "border-emerald-500"
          )} />
          
          <h4 className="text-sm font-semibold mb-3 leading-snug text-foreground/90">{task.title}</h4>
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {task.assignee ? (
                <Avatar className="w-6 h-6 border-2 border-background">
                  {task.assignee.avatar && <AvatarImage src={task.assignee.avatar} />}
                  <AvatarFallback className="text-[8px]">
                    {task.assignee.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="w-6 h-6 border-2 border-background">
                  <AvatarFallback className="text-[8px]">?</AvatarFallback>
                </Avatar>
              )}
            </div>
            {task.creator && (
              <div className="text-[10px] text-muted-foreground font-medium">
                {task.creator.date.split(' ')[0]}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});

export default function Projects() {
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"] });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", color: "bg-blue-500", priority: "Средний" });
  const [newBoardName, setNewBoardName] = useState("");
  const [editingColumn, setEditingColumn] = useState<{ originalName: string, currentName: string } | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  // Queries
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const { data: boards = [], isLoading: isLoadingBoards } = useQuery<any[]>({
    queryKey: ["/api/projects", activeProject?.id, "boards"],
    enabled: !!activeProject?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const activeBoard = useMemo(() => 
    boards.find(b => b.id === activeBoardId) || boards[0],
    [boards, activeBoardId]
  );

  // Auto-select first board when activeProject changes
  useEffect(() => {
    if (boards.length > 0 && !activeBoardId) {
      setActiveBoardId(boards[0].id);
    }
  }, [boards, activeBoardId]);

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      const res = await apiRequest("POST", "/api/projects", project);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateProjectOpen(false);
      setNewProject({ name: "", color: "bg-blue-500", priority: "Средний" });
      setActiveProjectId(data.id);
      toast.success("Проект успешно создан");
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingProject(null);
      toast.success("Проект успешно обновлен");
    }
  });

  const createBoardMutation = useMutation({
    mutationFn: async ({ projectId, name }: { projectId: string, name: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/boards`, { name });
      return res.json();
    },
    onMutate: async ({ name }) => {
      // Мгновенно закрываем окно и очищаем форму
      setIsCreateBoardOpen(false);
      const currentBoardName = newBoardName;
      setNewBoardName("");

      // Отменяем текущие запросы
      await queryClient.cancelQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });

      // Сохраняем предыдущее состояние
      const previousBoards = queryClient.getQueryData<any[]>(["/api/projects", activeProject?.id, "boards"]);

      // Оптимистично добавляем новую доску
      if (previousBoards) {
        const optimisticBoard = {
          id: `temp-board-${Date.now()}`,
          name: name,
          projectId: activeProject?.id,
          createdAt: new Date().toISOString()
        };
        queryClient.setQueryData(["/api/projects", activeProject?.id, "boards"], [...previousBoards, optimisticBoard]);
      }

      return { previousBoards, currentBoardName };
    },
    onError: (err, variables, context) => {
      // Откатываем при ошибке
      if (context?.previousBoards) {
        queryClient.setQueryData(["/api/projects", activeProject?.id, "boards"], context.previousBoards);
      }
      if (context?.currentBoardName) {
        setNewBoardName(context.currentBoardName);
        setIsCreateBoardOpen(true);
      }
      toast.error("Не удалось создать доску");
    },
    onSuccess: (data) => {
      setActiveBoardId(data.id);
      toast.success("Доска успешно создана");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });
    }
  });

  const updateBoardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await apiRequest("PATCH", `/api/boards/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });
      setEditingBoard(null);
      toast.success("Доска успешно обновлена");
    }
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });
      toast.success("Доска удалена");
    }
  });

  const [editingProject, setEditingProject] = useState<{ id: string, name: string, priority: string, color: string } | null>(null);

  const handleUpdateProject = () => {
    if (!editingProject || !editingProject.name) return;
    updateProjectMutation.mutate({ 
      id: editingProject.id, 
      data: { 
        name: editingProject.name, 
        priority: editingProject.priority, 
        color: editingProject.color 
      } 
    });
  };

  const handleCreateProject = () => {
    if (!newProject.name) return;
    createProjectMutation.mutate(newProject);
  };

  const [editingBoard, setEditingBoard] = useState<{ id: string, currentName: string } | null>(null);

  const handleRenameBoard = (id: string, newName: string) => {
    if (!newName) {
      setEditingBoard(null);
      return;
    }
    updateBoardMutation.mutate({ id, data: { name: newName } });
  };

  const handleDeleteBoard = (id: string) => {
    if (boards.length <= 1) {
      toast.error("Нельзя удалить последнюю доску");
      return;
    }
    deleteBoardMutation.mutate(id);
  };

  const handleCreateBoard = () => {
    if (!newBoardName || !activeProject) return;
    createBoardMutation.mutate({ projectId: activeProject.id, name: newBoardName });
  };

  const DEFAULT_KANBAN_DATA = {
    "В планах": [],
    "В работе": [],
    "На проверке": [],
    "Готово": [],
  };

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", type: "task" });

  const { data: boardData, isLoading: isLoadingBoard } = useQuery<{ columns: any[], tasks: any[] }>({
    queryKey: ["/api/boards", activeBoard?.id, "full"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/boards/${activeBoard?.id}/full`);
      return res.json();
    },
    enabled: !!activeBoard?.id,
    staleTime: 1000 * 60 * 5, // 5 минут кэша
  });

  const columns = boardData?.columns || [];
  const tasks = boardData?.tasks || [];
  const isLoadingColumns = isLoadingBoard;
  const isLoadingTasks = isLoadingBoard;

  const createTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      // Подготавливаем данные для отправки, включая информацию об исполнителе для корректного отображения
      const taskData = {
        ...task,
        assignee: user ? { 
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username,
          avatar: user.avatar 
        } : undefined
      };
      const res = await apiRequest("POST", `/api/boards/${activeBoard?.id}/tasks`, taskData);
      return res.json();
    },
    onMutate: async (newTaskData) => {
      // Мгновенно закрываем окно и очищаем форму
      setIsCreateTaskOpen(false);
      const currentNewTask = { ...newTask }; // Сохраняем текущее состояние для возможного отката
      setNewTask({ title: "", description: "", priority: "medium", type: "task" });

      // Отменяем текущие запросы, чтобы они не перезаписали наш оптимистичный апдейт
      await queryClient.cancelQueries({ queryKey: ["/api/boards", activeBoard?.id, "full"] });

      // Сохраняем предыдущее состояние для отката при ошибке
      const previousBoardData = queryClient.getQueryData<{ columns: any[], tasks: any[] }>(["/api/boards", activeBoard?.id, "full"]);

      // Оптимистично обновляем кэш
      if (previousBoardData) {
        const optimisticTask = {
          ...newTaskData,
          id: `temp-${Date.now()}`, // Временный ID
          createdAt: new Date().toISOString(),
          order: previousBoardData.tasks.filter(t => t.columnId === newTaskData.columnId).length
        };

        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], {
          ...previousBoardData,
          tasks: [...previousBoardData.tasks, optimisticTask]
        });
      }

      return { previousBoardData, currentNewTask };
    },
    onError: (err, newTaskData, context) => {
      // Откатываем изменения при ошибке
      if (context?.previousBoardData) {
        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], context.previousBoardData);
      }
      // Возвращаем данные в форму, если произошла ошибка
      if (context?.currentNewTask) {
        setNewTask(context.currentNewTask);
        setIsCreateTaskOpen(true);
      }
      toast.error("Не удалось создать задачу");
    },
    onSuccess: () => {
      toast.success("Задача успешно создана");
    },
    onSettled: () => {
      // Синхронизируем данные с сервером
      queryClient.invalidateQueries({ queryKey: ["/api/boards", activeBoard?.id, "full"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      // Если это временный ID (начинается с temp-), не отправляем запрос на сервер,
      // так как задача еще создается. Реальный PATCH уйдет после синхронизации.
      if (id.startsWith("temp-")) {
        return null;
      }
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/boards", activeBoard?.id, "full"] });
      const previousData = queryClient.getQueryData<{ columns: any[], tasks: any[] }>(["/api/boards", activeBoard?.id, "full"]);

      if (previousData) {
        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], (old: any) => {
          if (!old) return old;
          
          const oldTasks = old.tasks || [];
          // 1. Находим задачу, которую перемещаем
          const movedTask = oldTasks.find((t: any) => t.id === id);
          if (!movedTask) return old;

          // 2. Создаем копию списка без этой задачи
          const otherTasks = oldTasks.filter((t: any) => t.id !== id);
          
          // 3. Обновляем данные перемещаемой задачи (новая колонка и временный порядок)
          const updatedMovedTask = { ...movedTask, ...data };
          
          // 4. Получаем задачи в целевой колонке
          const targetColTasks = otherTasks
            .filter((t: any) => t.columnId === (data.columnId || movedTask.columnId))
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          
          // 5. Вставляем задачу на новую позицию
          targetColTasks.splice(data.order ?? 0, 0, updatedMovedTask);
          
          // 6. Пересчитываем order для всех задач в целевой колонке
          const updatedTargetColTasks = targetColTasks.map((t: any, idx: number) => ({ ...t, order: idx }));
          
          // 7. Объединяем обратно со всеми остальными задачами
          const finalTasks = [
            ...otherTasks.filter((t: any) => t.columnId !== (data.columnId || movedTask.columnId)),
            ...updatedTargetColTasks
          ];
          
          return { ...old, tasks: finalTasks };
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Игнорируем ошибку для временных ID, так как мы сами отменили запрос
      if (variables.id.startsWith("temp-")) return;
      
      if (context?.previousData) {
        queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], context.previousData);
      }
      toast.error("Не удалось переместить задачу");
    },
    onSettled: (data, error, variables) => {
      // Не инвалидируем, если это была временная задача, чтобы не мешать процессу создания
      if (variables.id.startsWith("temp-")) return;

      // Инвалидируем без принудительного рефетча, чтобы не мерцало
      queryClient.invalidateQueries({ 
        queryKey: ["/api/boards", activeBoard?.id, "full"],
        refetchType: 'none' 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    }
  });

  const kanbanData = useMemo(() => {
    if (!columns.length) return {};
    
    const data: Record<string, any[]> = {};
    columns.forEach(col => {
      data[col.name] = tasks
        .filter(t => t.columnId === col.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return data;
  }, [columns, tasks]);

  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleTaskClick = useCallback((task: any) => {
    setSelectedTask(task);
    setModalOpen(true);
  }, []);

  const handleCreateTask = (columnName?: string) => {
    if (!activeBoard) return;
    
    // Если передано название колонки, находим её ID
    if (columnName) {
      const column = columns.find(c => c.name === columnName);
      if (column) {
        setNewTask(prev => ({ 
          ...prev, 
          columnId: column.id, 
          status: columnName,
          assigneeId: user?.id 
        }));
      }
    } else {
      // По умолчанию первая колонка
      setNewTask(prev => ({ 
        ...prev, 
        columnId: columns[0]?.id, 
        status: columns[0]?.name || "В планах",
        assigneeId: user?.id
      }));
    }
    
    setIsCreateTaskOpen(true);
  };

  const submitCreateTask = () => {
    if (!newTask.title.trim() || !activeBoard) return;
    createTaskMutation.mutate(newTask);
  };

  const onTaskUpdate = (updatedTask: any) => {
    // Задача уже обновлена на сервере через TaskDetailsModal.
    // Обновляем локальный кэш, чтобы UI сразу отобразил изменения.
    queryClient.setQueryData(["/api/boards", activeBoard?.id, "full"], (old: any) => {
      if (!old || !old.tasks) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: any) => t.id === updatedTask.id ? updatedTask : t)
      };
    });
  };

  const toggleProjectCollapse = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "task") {
      // Find the target column
      const targetColumn = columns.find(col => col.name === destination.droppableId);
      if (!targetColumn) return;

      // Optimistically update the UI or just call the mutation
      updateTaskMutation.mutate({
        id: draggableId,
        data: {
          columnId: targetColumn.id,
          order: destination.index
        }
      });
    }
  };

  if (isLoadingProjects && projects.length === 0) {
    return (
      <Layout className="overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="overflow-hidden">
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Secondary Projects Sidebar */}
        <div className="w-72 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Проекты</h2>
          </div>

          <div className="p-3">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Найти проект..." className="h-9 pl-9 bg-secondary/50 border-none text-xs" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 space-y-1 py-2">
              {projects.map((project: any) => (
                <div key={project.id} className="space-y-1">
                  <div
                    onClick={() => {
                      setActiveProjectId(project.id);
                      setActiveBoardId(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group/project relative pr-10 cursor-pointer",
                      activeProject?.id === project.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <div 
                      className="flex flex-col flex-1 min-w-0"
                      onClick={(e) => {
                        if (activeProject?.id === project.id) {
                          toggleProjectCollapse(project.id, e);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-50",
                          !collapsedProjects[project.id] && "rotate-90"
                        )} />
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                          project.priority === "Высокий" || project.priority === "Критический" ? "bg-rose-500 shadow-rose-500/40" :
                          project.priority === "Средний" ? "bg-amber-500 shadow-amber-500/40" :
                          "bg-emerald-500 shadow-emerald-500/40"
                        )} />
                        <span className="truncate text-left">{project.name}</span>
                      </div>
                      
                      <div className="mt-1.5 ml-5.5 px-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Прогресс</span>
                          <span>{project.progress || 0}%</span>
                        </div>
                        <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500" 
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/project:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject({ 
                            id: project.id, 
                            name: project.name, 
                            priority: project.priority || "Средний", 
                            color: project.color || "bg-blue-500"
                          });
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {activeProject?.id === project.id && !collapsedProjects[project.id] && (
                    <div className="ml-4 pl-3 border-l border-border/60 space-y-1 mt-1">
                      {isLoadingBoards ? (
                        <div className="p-2 text-xs text-muted-foreground">Загрузка...</div>
                      ) : (
                        boards.map((board: any) => (
                          <div key={board.id} className="group/board relative">
                            <div
                              onClick={() => setActiveBoardId(board.id)}
                              onMouseEnter={() => {
                                // Предзагрузка данных доски при наведении
                                queryClient.prefetchQuery({
                                  queryKey: ["/api/boards", board.id, "full"],
                                  queryFn: async () => {
                                    const res = await apiRequest("GET", `/api/boards/${board.id}/full`);
                                    return res.json();
                                  },
                                  staleTime: 1000 * 60 * 5,
                                });
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left pr-8 cursor-pointer",
                                activeBoard?.id === board.id
                                  ? "bg-secondary text-foreground font-medium"
                                  : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                              )}
                            >
                              <Hash className="w-3.5 h-3.5 shrink-0 opacity-50" />
                              <span className="truncate">{board.name}</span>
                            </div>
                            
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/board:opacity-100 transition-opacity">
                              <Dialog open={editingBoard?.id === board.id} onOpenChange={(open) => !open && setEditingBoard(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingBoard({ id: board.id, currentName: board.name });
                                    }}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Переименовать доску</DialogTitle>
                                    <DialogDescription>Введите новое название для этой доски.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <Input 
                                      value={editingBoard?.currentName || ""} 
                                      onChange={(e) => setEditingBoard(prev => prev ? { ...prev, currentName: e.target.value } : null)}
                                      autoFocus
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditingBoard(null)}>Отмена</Button>
                                    <Button onClick={() => handleRenameBoard(board.id, editingBoard?.currentName || "")} disabled={updateBoardMutation.isPending}>
                                      {updateBoardMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                      Сохранить
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBoard(board.id);
                                }}
                                disabled={deleteBoardMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                      
                      <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
                        <DialogTrigger asChild>
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-primary/70 hover:text-primary hover:bg-primary/5 transition-colors text-left mt-1">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Добавить доску</span>
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Создать новую доску</DialogTitle>
                            <DialogDescription>Укажите название для новой доски в этом проекте.</DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Input 
                              placeholder="Название доски" 
                              value={newBoardName}
                              onChange={(e) => setNewBoardName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateBoardOpen(false)}>Отмена</Button>
                            <Button onClick={handleCreateBoard} disabled={!newBoardName.trim() || createBoardMutation.isPending}>
                              {createBoardMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              Создать
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Kanban Board View */}
        <div className="flex-1 flex flex-col min-w-0 bg-secondary/20">
          {/* Board Header */}
          <div className="h-16 px-6 border-b border-border bg-card flex items-center justify-between">
            {activeProject ? (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                  "w-3 h-3 rounded-full shadow-sm",
                  activeProject.priority === "Высокий" || activeProject.priority === "Критический" ? "bg-rose-500" :
                  activeProject.priority === "Средний" ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <h1 className="text-xl font-bold truncate">{activeProject.name}</h1>
                {activeBoard && (
                  <>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 whitespace-nowrap uppercase tracking-wider">
                      {activeBoard.name}
                    </Badge>
                  </>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground italic px-6">Выберите проект</div>
            )}
            
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                 <Filter className="w-4 h-4" />
                 <span className="hidden sm:inline">Фильтр</span>
               </Button>
               <Separator orientation="vertical" className="h-6 mx-2" />
               <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                 <Button 
                   className="gap-2 shadow-lg shadow-primary/20" 
                   size="sm"
                   disabled={!activeBoard}
                   onClick={() => handleCreateTask()}
                 >
                   <Plus className="w-4 h-4" />
                   <span className="hidden sm:inline">Добавить задачу</span>
                 </Button>
                 <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать новую задачу</DialogTitle>
                      <DialogDescription>Введите название задачи для добавления на доску.</DialogDescription>
                    </DialogHeader>
                   <div className="space-y-4 py-4">
                     <div className="space-y-2">
                       <Label htmlFor="task-title">Название задачи</Label>
                       <Input 
                         id="task-title" 
                         placeholder="Что нужно сделать?" 
                         value={newTask.title}
                         onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && newTask.title.trim()) {
                             submitCreateTask();
                           }
                         }}
                       />
                     </div>
                   </div>
                   <DialogFooter>
                     <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>Отмена</Button>
                     <Button onClick={submitCreateTask} disabled={createTaskMutation.isPending || !newTask.title.trim()}>
                       {createTaskMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                       Создать задачу
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
            </div>
          </div>

          {/* Kanban Columns */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 overflow-auto p-6 custom-scrollbar">
              {activeBoard ? (
                <Droppable droppableId="board" direction="horizontal" type="column">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex gap-6 items-start h-full min-w-max"
                    >
                      {Object.entries(kanbanData).map(([column, tasks]: [string, any], colIndex) => (
                        <div key={column} className="w-80 shrink-0 flex flex-col gap-4">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 group/col-title w-full">
                              <h3 className="font-bold text-sm text-foreground/80 truncate max-w-[150px]">{column}</h3>
                              <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px] font-bold shrink-0">
                                {tasks.length}
                              </Badge>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-6 h-6 ml-auto text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                                onClick={() => handleCreateTask(column)}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          <Droppable droppableId={column} type="task">
                            {(taskProvided, snapshot) => (
                              <div
                                {...taskProvided.droppableProps}
                                ref={taskProvided.innerRef}
                                className={cn(
                                  "flex flex-col gap-3 min-h-[150px] rounded-xl p-1",
                                  snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                                )}
                              >
                                {tasks.map((task: any, index: number) => (
                                  <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    index={index} 
                                    onClick={handleTaskClick} 
                                  />
                                ))}
                                {taskProvided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mb-4">
                    <Hash className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Доска не выбрана</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Выберите проект и доску в левом меню, чтобы начать работу над задачами.
                  </p>
                </div>
              )}
            </div>
          </DragDropContext>
        </div>
      </div>

      {/* Task Details Modal */}
      {modalOpen && (
        <TaskDetailsModal
          task={selectedTask}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdate={onTaskUpdate}
        />
      )}

      {/* Project Edit Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать проект</DialogTitle>
            <DialogDescription>Измените параметры проекта.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Название проекта</Label>
              <Input 
                id="edit-project-name" 
                value={editingProject?.name || ""} 
                onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select 
                value={editingProject?.priority || "Средний"} 
                onValueChange={(val) => setEditingProject(prev => prev ? { ...prev, priority: val } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите приоритет" />
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
              <Label>Цвет</Label>
              <div className="flex gap-2">
                {["bg-blue-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-indigo-500", "bg-slate-500"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditingProject(prev => prev ? { ...prev, color: c } : null)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      c,
                      editingProject?.color === c ? "border-primary scale-110 shadow-lg" : "border-transparent hover:scale-105"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>Отмена</Button>
            <Button onClick={handleUpdateProject} disabled={updateProjectMutation.isPending || !editingProject?.name}>
              {updateProjectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
