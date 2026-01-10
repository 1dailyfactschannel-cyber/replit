import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { cn } from "@/lib/utils";
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
  Pencil
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

// Mock Data
const INITIAL_PROJECTS = [
  { id: 1, name: "Ребрендинг TeamSync", boards: ["Основная доска", "Маркетинг"], priority: "Высокий", color: "bg-purple-500", members: 12, collapsed: false },
  { id: 2, name: "Мобильное приложение", boards: ["iOS Разработка", "Android Разработка", "Дизайн"], priority: "Средний", color: "bg-blue-500", members: 8, collapsed: false },
  { id: 3, name: "API Интеграция", boards: ["Техзадание"], priority: "Низкий", color: "bg-emerald-500", members: 4, collapsed: false },
];

const MOCK_TASK_DETAILS: Task = {
  id: 3,
  title: "Разработка темной темы",
  description: "Необходимо реализовать поддержку темной темы во всех основных компонентах системы.",
  status: "В работе",
  priority: "Высокий",
  type: "UI/UX",
  assignee: { name: "Юлия Дарицкая", avatar: "https://github.com/shadcn.png" },
  creator: { name: "Майк Росс", date: "24 окт. 2025" },
  dueDate: "15 янв. 2026",
  labels: ["Дизайн", "Frontend"],
  subtasks: [],
  comments: [],
  history: []
};

export default function Projects() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState(projects[0]);
  const [activeBoard, setActiveBoard] = useState(projects[0].boards[0]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", color: "bg-blue-500", priority: "Средний" });
  const [newBoardName, setNewBoardName] = useState("");
  const [editingColumn, setEditingColumn] = useState<{ originalName: string, currentName: string } | null>(null);

  const DEFAULT_KANBAN_DATA = {
    "В планах": [],
    "В работе": [],
    "На проверке": [],
    "Готово": [],
  };

  const [boardsData, setBoardsData] = useState<Record<string, any>>({
    "1-Основная доска": {
      "В планах": [
        { id: 1, title: "Ревью дизайн-системы", priority: "Высокий", type: "Дизайн" },
      ],
      "В работе": [
        { id: 3, title: "Разработка темной темы", priority: "Высокий", type: "UI/UX" },
      ],
      "На проверке": [],
      "Готово": [],
    }
  });

  const handleCreateProject = () => {
    if (!newProject.name) return;
    
    const project = {
      id: Date.now(),
      name: newProject.name,
      boards: ["Основная доска"],
      color: newProject.color,
      priority: newProject.priority,
      members: 1,
      collapsed: false
    };
    
    setProjects([...projects, project]);
    setIsCreateProjectOpen(false);
    setNewProject({ name: "", color: "bg-blue-500", priority: "Средний" });
    setActiveProject(project);
    setActiveBoard(project.boards[0]);
    toast.success("Проект успешно создан");
  };

  const [editingBoard, setEditingBoard] = useState<{ originalName: string, currentName: string } | null>(null);

  const handleRenameBoard = (oldName: string, newName: string) => {
    if (!newName || oldName === newName || !activeProject) {
      setEditingBoard(null);
      return;
    }

    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) {
        return {
          ...p,
          boards: p.boards.map(b => b === oldName ? newName : b)
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    
    // Update boardsData if exists
    const oldBoardKey = `${activeProject.id}-${oldName}`;
    const newBoardKey = `${activeProject.id}-${newName}`;
    
    setBoardsData(prev => {
      if (prev[oldBoardKey]) {
        const newData = { ...prev };
        newData[newBoardKey] = newData[oldBoardKey];
        delete newData[oldBoardKey];
        return newData;
      }
      return prev;
    });

    if (activeBoard === oldName) {
      setActiveBoard(newName);
    }
    
    setEditingBoard(null);
    toast.success("Доска переименована");
  };

  const handleDeleteBoard = (boardName: string) => {
    if (!activeProject || activeProject.boards.length <= 1) {
      toast.error("Нельзя удалить последнюю доску");
      return;
    }

    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) {
        return {
          ...p,
          boards: p.boards.filter(b => b !== boardName)
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    
    const boardKey = `${activeProject.id}-${boardName}`;
    setBoardsData(prev => {
      const newData = { ...prev };
      delete newData[boardKey];
      return newData;
    });

    if (activeBoard === boardName) {
      const newActive = updatedProjects.find(p => p.id === activeProject.id);
      if (newActive) setActiveBoard(newActive.boards[0]);
    }
    
    toast.success("Доска удалена");
  };

  const handleCreateBoard = () => {
    if (!newBoardName || !activeProject) return;
    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) {
        return { ...p, boards: [...p.boards, newBoardName] };
      }
      return p;
    });
    setProjects(updatedProjects);
    const newActive = updatedProjects.find(p => p.id === activeProject.id);
    if (newActive) {
      setActiveProject(newActive);
      setActiveBoard(newBoardName);
    }
    setIsCreateBoardOpen(false);
    setNewBoardName("");
    toast.success("Доска успешно создана");
  };

  const activeBoardKey = `${activeProject.id}-${activeBoard}`;
  const kanbanData = boardsData[activeBoardKey] || DEFAULT_KANBAN_DATA;

  const handleTaskClick = (task: any) => {
    // Fill with mock data for editing
    setSelectedTask({
      ...MOCK_TASK_DETAILS,
      id: task.id,
      title: task.title,
      priority: task.priority,
      type: task.type,
      status: task.status || "В планах"
    });
    setModalOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setModalOpen(true);
  };

  const onTaskUpdate = (updatedTask: Task) => {
    const boardKey = activeBoardKey;
    
    setBoardsData(prev => {
      const currentBoardData = prev[boardKey] || DEFAULT_KANBAN_DATA;
      
      // Check if it's a new task (not in any column)
      const isNew = !Object.values(currentBoardData).flat().find((t: any) => t.id === updatedTask.id);
      
      if (isNew) {
        const status = updatedTask.status;
        const columnTasks = currentBoardData[status] || [];
        const newState = {
          ...prev,
          [boardKey]: {
            ...currentBoardData,
            [status]: [...columnTasks, updatedTask]
          }
        };
        return newState;
      } else {
        // Find and update existing task
        const newBoardData = { ...currentBoardData };
        Object.keys(newBoardData).forEach(col => {
          newBoardData[col] = newBoardData[col].map((t: any) => 
            t.id === updatedTask.id ? { ...t, ...updatedTask } : t
          );
        });
        return {
          ...prev,
          [boardKey]: newBoardData
        };
      }
    });
    
    toast.success(Object.values(boardsData[boardKey] || {}).flat().find((t: any) => t.id === updatedTask.id) ? "Задача обновлена" : "Задача успешно создана");
  };

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

  const onDragEnd = (result: DropResult) => {
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
    
    toast.success("Задача перемещена");
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
                    <Label>Цвет метки</Label>
                    <div className="flex flex-wrap gap-2">
                      {["bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-indigo-500"].map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewProject({ ...newProject, color: color })}
                          className={cn(
                            "w-8 h-8 rounded-full transition-all ring-offset-background",
                            color,
                            newProject.color === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>Отмена</Button>
                  <Button onClick={handleCreateProject} disabled={!newProject.name}>Создать проект</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-3">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Найти проект..." className="h-9 pl-9 bg-secondary/50 border-none text-xs" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 space-y-1 py-2">
              {projects.map((project) => (
                <div key={project.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveProject(project);
                      setActiveBoard(project.boards[0]);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group/project",
                      activeProject.id === project.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <div 
                      className="flex items-center gap-2 flex-1 min-w-0"
                      onClick={(e) => {
                        if (activeProject.id === project.id) {
                          toggleProjectCollapse(project.id, e);
                        }
                      }}
                    >
                      <ChevronRight className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-50",
                        !project.collapsed && "rotate-90"
                      )} />
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                        project.priority === "Высокий" || project.priority === "Критический" ? "bg-rose-500 shadow-rose-500/40" :
                        project.priority === "Средний" ? "bg-amber-500 shadow-amber-500/40" :
                        "bg-emerald-500 shadow-emerald-500/40"
                      )} />
                      <span className="truncate text-left">{project.name}</span>
                    </div>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] opacity-70">
                      {project.boards.length}
                    </Badge>
                  </button>
                  
                  {activeProject.id === project.id && !project.collapsed && (
                    <div className="ml-4 pl-3 border-l border-border/60 space-y-1 mt-1">
                      {project.boards.map((board) => (
                        <div key={board} className="group/board relative">
                          <button
                            onClick={() => setActiveBoard(board)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left pr-8",
                              activeBoard === board
                                ? "bg-secondary text-foreground font-medium"
                                : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                            )}
                          >
                            <Hash className="w-3.5 h-3.5 shrink-0 opacity-50" />
                            <span className="truncate">{board}</span>
                          </button>
                          
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/board:opacity-100 transition-opacity">
                            <Dialog open={editingBoard?.originalName === board} onOpenChange={(open) => !open && setEditingBoard(null)}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingBoard({ originalName: board, currentName: board });
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
                                  <Button onClick={() => handleRenameBoard(board, editingBoard?.currentName || "")}>Сохранить</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBoard(board);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
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
                            <Button onClick={handleCreateBoard} disabled={!newBoardName.trim()}>Создать</Button>
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
            <div className="flex items-center gap-3 overflow-hidden">
               <div className={cn(
                 "w-3 h-3 rounded-full shadow-sm",
                 activeProject.priority === "Высокий" || activeProject.priority === "Критический" ? "bg-rose-500" :
                 activeProject.priority === "Средний" ? "bg-amber-500" : "bg-emerald-500"
               )} />
               <h1 className="text-xl font-bold truncate">{activeProject.name}</h1>
               <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
               <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 whitespace-nowrap uppercase tracking-wider">
                 {activeBoard}
               </Badge>
            </div>
            
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
               >
                 <Plus className="w-4 h-4" />
                 <span className="hidden sm:inline">Добавить задачу</span>
               </Button>
            </div>
          </div>

          {/* Kanban Columns */}
          <DragDropContext onDragEnd={onDragEnd}>
            <ScrollArea className="flex-1 p-6">
              <Droppable droppableId="board" direction="horizontal" type="column">
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex gap-6 h-full items-start"
                  >
                    {Object.entries(kanbanData).map(([column, tasks]: [string, any], colIndex) => (
                      <Draggable draggableId={`col-${column}`} index={colIndex} key={column}>
                        {(colProvided) => (
                          <div
                            ref={colProvided.innerRef}
                            {...colProvided.draggableProps}
                            className="w-80 shrink-0 flex flex-col gap-4"
                          >
                            <Droppable droppableId={column} type="task">
                              {(provided) => (
                                <div 
                                  {...provided.droppableProps}
                                  ref={provided.innerRef}
                                  className="flex flex-col gap-4"
                                >
                                  <div className="flex items-center justify-between px-1" {...colProvided.dragHandleProps}>
                                    <div className="flex items-center gap-2 group/col-title w-full">
                                      {editingColumn?.originalName === column ? (
                                        <Input
                                          autoFocus
                                          className="h-7 text-sm font-bold bg-transparent border-primary/30 py-0 px-1"
                                          value={editingColumn.currentName}
                                          onChange={(e) => setEditingColumn({ ...editingColumn, currentName: e.target.value })}
                                          onBlur={() => handleRenameColumn(column, editingColumn.currentName)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRenameColumn(column, editingColumn.currentName);
                                            if (e.key === 'Escape') setEditingColumn(null);
                                          }}
                                        />
                                      ) : (
                                        <>
                                          <h3 className="font-bold text-sm text-foreground/80 truncate max-w-[150px]">{column}</h3>
                                          <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px] font-bold shrink-0">
                                            {tasks.length}
                                          </Badge>
                                          <div className="flex items-center gap-1 opacity-0 group-hover/col-title:opacity-100 transition-opacity ml-auto">
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6"
                                              onClick={() => setEditingColumn({ originalName: column, currentName: column })}
                                              title="Переименовать"
                                            >
                                              <Pencil className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6"
                                              onClick={handleAddColumn}
                                              title="Добавить колонку"
                                            >
                                              <Plus className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6 hover:text-destructive"
                                              onClick={() => handleDeleteColumn(column)}
                                              title="Удалить"
                                            >
                                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-3 min-h-[100px]">
                                    {tasks.map((task: any, index: number) => (
                                      <Draggable draggableId={task.id.toString()} index={index} key={task.id}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={cn(
                                              "group bg-card border border-border/60 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer",
                                              snapshot.isDragging && "shadow-xl ring-2 ring-primary/20 border-primary"
                                            )}
                                            onClick={() => handleTaskClick({ ...task, status: column })}
                                          >
                                            <div className="flex items-center justify-between mb-3">
                                              <Badge 
                                                className={cn(
                                                  "text-[10px] font-bold px-2 py-0 rounded-full",
                                                  task.priority === "Высокий" ? "bg-rose-500/10 text-rose-600" : 
                                                  task.priority === "Средний" ? "bg-amber-500/10 text-amber-600" : 
                                                  "bg-emerald-500/10 text-emerald-600"
                                                )}
                                              >
                                                {task.priority}
                                              </Badge>
                                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <h4 className="text-sm font-semibold mb-3 text-foreground/90">{task.title}</h4>
                                            
                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center -space-x-1.5 overflow-hidden">
                                                <Avatar className="w-5 h-5 border-2 border-card ring-0">
                                                  <AvatarImage src="https://github.com/shadcn.png" />
                                                  <AvatarFallback>ЮД</AvatarFallback>
                                                </Avatar>
                                              </div>
                                              
                                              {task.subtasks && task.subtasks.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                  {task.subtasks.map((sub: any, idx: number) => (
                                                    <div 
                                                      key={idx}
                                                      className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        sub.completed ? "bg-primary shadow-[0_0_4px_rgba(var(--primary),0.5)]" : "bg-muted-foreground/30"
                                                      )}
                                                      title={sub.title}
                                                    />
                                                  ))}
                                                </div>
                                              )}

                                              <div className="flex items-center gap-1.5 ml-auto text-[10px] font-medium text-muted-foreground">
                                                <Hash className="w-3 h-3" />
                                                <span>TS-{task.id}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    <Button 
                                      variant="ghost" 
                                      className="w-full border-2 border-dashed border-border/50 py-8 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 transition-all rounded-xl gap-2"
                                      onClick={handleCreateTask}
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span className="text-xs font-semibold">Новая задача</span>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {/* Add Column Button */}
                    <Button 
                      variant="ghost" 
                      className="w-80 shrink-0 border-2 border-dashed border-border/40 py-12 rounded-xl text-muted-foreground hover:bg-secondary/30 hover:border-primary/30 transition-all h-fit"
                      onClick={handleAddColumn}
                    >
                      <Plus className="w-5 h-5 mb-1" />
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-sm">Добавить колонку</span>
                        <span className="text-[10px] opacity-60">Создайте новый этап процесса</span>
                      </div>
                    </Button>
                  </div>
                )}
              </Droppable>
            </ScrollArea>
          </DragDropContext>
        </div>
      </div>

      <TaskDetailsModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdate={onTaskUpdate}
      />
    </Layout>
  );
}
