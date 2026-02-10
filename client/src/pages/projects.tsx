import { Layout } from "@/components/layout/Layout";
import { useState, useMemo } from "react";
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

export default function Projects() {
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
  });

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const { data: boards = [], isLoading: isLoadingBoards } = useQuery<any[]>({
    queryKey: ["/api/projects", activeProject?.id, "boards"],
    enabled: !!activeProject?.id,
  });

  const activeBoard = useMemo(() => 
    boards.find(b => b.id === activeBoardId) || boards[0],
    [boards, activeBoardId]
  );

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject?.id, "boards"] });
      setIsCreateBoardOpen(false);
      setNewBoardName("");
      setActiveBoardId(data.id);
      toast.success("Доска успешно создана");
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

  const kanbanData = DEFAULT_KANBAN_DATA; // TODO: Fetch tasks per board

  const handleTaskClick = (task: any) => {
    toast.info("Просмотр задач будет доступен после интеграции с БД");
  };

  const handleCreateTask = () => {
    toast.info("Создание задач будет доступно после интеграции с БД");
  };

  const onTaskUpdate = (updatedTask: Task) => {
    toast.info("Функционал задач в разработке");
  };

  const handleRenameColumn = (oldName: string, newName: string) => {
    toast.info("Функционал колонок в разработке");
    setEditingColumn(null);
  };

  const handleDeleteColumn = (colName: string) => {
    toast.info("Функционал колонок в разработке");
  };

  const handleAddColumn = () => {
    toast.info("Функционал колонок в разработке");
  };

  const toggleProjectCollapse = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const onDragEnd = (result: DropResult) => {
    // Implement task moving later
    toast.info("Перемещение задач будет реализовано позже");
  };

  if (isLoadingProjects) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
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
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={(e) => {
                        if (activeProject?.id === project.id) {
                          toggleProjectCollapse(project.id, e);
                        }
                      }}
                    >
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
               <Button 
                 className="gap-2 shadow-lg shadow-primary/20" 
                 size="sm"
                 onClick={handleCreateTask}
                 disabled={!activeBoard}
               >
                 <Plus className="w-4 h-4" />
                 <span className="hidden sm:inline">Добавить задачу</span>
               </Button>
            </div>
          </div>

          {/* Kanban Columns */}
          <DragDropContext onDragEnd={onDragEnd}>
            <ScrollArea className="flex-1 p-6">
              {activeBoard ? (
                <Droppable droppableId="board" direction="horizontal" type="column">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex gap-6 h-full items-start"
                    >
                      {Object.entries(kanbanData).map(([column, tasks]: [string, any], colIndex) => (
                        <div key={column} className="w-80 shrink-0 flex flex-col gap-4">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 group/col-title w-full">
                              <h3 className="font-bold text-sm text-foreground/80 truncate max-w-[150px]">{column}</h3>
                              <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px] font-bold shrink-0">
                                {tasks.length}
                              </Badge>
                            </div>
                          </div>

                          <Droppable droppableId={column} type="task">
                            {(taskProvided, snapshot) => (
                              <div
                                {...taskProvided.droppableProps}
                                ref={taskProvided.innerRef}
                                className={cn(
                                  "flex flex-col gap-3 min-h-[150px] rounded-xl transition-colors p-1",
                                  snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
                                )}
                              >
                                {tasks.map((task: any, index: number) => (
                                  <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        onClick={() => handleTaskClick(task)}
                                        className={cn(
                                          "bg-card border border-border/50 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all group/task",
                                          snapshot.isDragging ? "shadow-xl ring-2 ring-primary/20 rotate-1" : ""
                                        )}
                                      >
                                        <h4 className="text-sm font-medium mb-3 leading-snug">{task.title}</h4>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {taskProvided.placeholder}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="w-full justify-start gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 mt-1 h-9 rounded-lg"
                                  onClick={handleCreateTask}
                                >
                                  <Plus className="w-4 h-4" />
                                  <span className="text-xs font-medium">Добавить задачу</span>
                                </Button>
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
            </ScrollArea>
          </DragDropContext>
        </div>
      </div>

      {/* Task Details Modal */}
      {modalOpen && (
        <TaskDetailsModal
          task={null}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onUpdate={onTaskUpdate}
        />
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать проект</DialogTitle>
            <DialogDescription>Измените параметры и приоритет проекта.</DialogDescription>
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
              <Label>Приоритет проекта</Label>
              <Select 
                value={editingProject?.priority || "Средний"} 
                onValueChange={(val) => setEditingProject(prev => prev ? { ...prev, priority: val } : null)}
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
