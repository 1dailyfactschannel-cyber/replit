import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Folder, 
  Plus, 
  ChevronRight, 
  LayoutGrid, 
  List, 
  MoreVertical,
  Search,
  Hash,
  Filter,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskDetailsModal, Task } from "@/components/kanban/TaskDetailsModal";

// Mock Data
const INITIAL_PROJECTS = [
  { id: 1, name: "Ребрендинг TeamSync", boards: ["Основная доска", "Маркетинг"], color: "bg-purple-500", members: 12, collapsed: false },
  { id: 2, name: "Мобильное приложение", boards: ["iOS Разработка", "Android Разработка", "Дизайн"], color: "bg-blue-500", members: 8, collapsed: false },
  { id: 3, name: "API Интеграция", boards: ["Техзадание"], color: "bg-emerald-500", members: 4, collapsed: false },
];

const MOCK_TASK_DETAILS: Task = {
  id: 3,
  title: "Разработка темной темы",
  description: "Необходимо реализовать поддержку темной темы во всех основных компонентах системы. Цветовая схема должна соответствовать гайдлайнам Indigo/Slate. Особое внимание уделить контрастности и доступности интерфейса.",
  status: "В работе",
  priority: "Высокий",
  type: "UI/UX",
  assignee: { name: "Юлия Дарицкая", avatar: "https://github.com/shadcn.png" },
  creator: { name: "Майк Росс", date: "24 окт. 2025, 14:20" },
  dueDate: "15 янв. 2026",
  labels: ["Дизайн", "Frontend", "V2"],
  subtasks: [
    { id: 1, title: "Настройка CSS переменных", completed: true },
    { id: 2, title: "Обновление компонентов Shadcn", completed: false },
    { id: 3, title: "Тестирование на мобильных устройствах", completed: false },
  ],
  comments: [
    { id: 1, user: "Майк Росс", content: "Юлия, как продвигается работа над палитрой?", time: "2 часа назад" },
    { id: 2, user: "Юлия Дарицкая", content: "Уже закончила основные переменные, завтра приступлю к верстке модальных окон.", time: "1 час назад" },
  ],
  history: [
    { id: 1, action: "изменил(а) статус на 'В работе'", user: "Юлия Дарицкая", time: "Вчера, 18:30" },
    { id: 2, action: "назначил(а) задачу на Юлия Дарицкая", user: "Майк Росс", time: "Вчера, 10:15" },
    { id: 3, action: "создал(а) задачу", user: "Майк Росс", time: "24 окт. 2025" },
  ]
};

export default function Projects() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState(projects[0]);
  const [activeBoard, setActiveBoard] = useState(projects[0].boards[0]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [kanbanData, setKanbanData] = useState({
    "В планах": [
      { id: 1, title: "Ревью дизайн-системы", priority: "Высокий", type: "Дизайн" },
      { id: 2, title: "Исправить API эндпоинты", priority: "Средний", type: "Backend" },
    ],
    "В работе": [
      { id: 3, title: "Разработка темной темы", priority: "Высокий", type: "UI/UX" },
    ],
    "На проверке": [
      { id: 4, title: "Анимации переходов", priority: "Низкий", type: "Frontend" },
    ],
    "Готово": [
      { id: 5, title: "Настройка сервера", priority: "Завершено", type: "DevOps" },
    ],
  });

  const handleTaskClick = (taskId: number) => {
    // In a real app we'd fetch task data, here we use mock
    setSelectedTask(MOCK_TASK_DETAILS);
    setModalOpen(true);
  };

  const toggleProjectCollapse = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, collapsed: !p.collapsed } : p
    ));
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Secondary Projects Sidebar */}
        <div className="w-72 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Проекты</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" data-testid="button-create-project">
              <Plus className="w-4 h-4" />
            </Button>
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
                      <div className={cn("w-2 h-2 rounded-full shrink-0", project.color)} />
                      <span className="truncate text-left">{project.name}</span>
                    </div>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] opacity-70">
                      {project.boards.length}
                    </Badge>
                  </button>
                  
                  {activeProject.id === project.id && !project.collapsed && (
                    <div className="ml-4 pl-3 border-l border-border/60 space-y-1 mt-1 animate-in slide-in-from-left-2 duration-300">
                      {project.boards.map((board) => (
                        <button
                          key={board}
                          onClick={() => setActiveBoard(board)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors text-left",
                            activeBoard === board
                              ? "bg-secondary text-foreground font-medium"
                              : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                          )}
                        >
                          <Hash className="w-3.5 h-3.5 shrink-0 opacity-50" />
                          <span className="truncate">{board}</span>
                        </button>
                      ))}
                      <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-primary hover:bg-primary/5 transition-colors group">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Новая доска</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border bg-secondary/10">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 shrink-0">
                {[1, 2, 3].map((i) => (
                  <Avatar key={i} className="w-6 h-6 border-2 border-background">
                    <AvatarFallback className="text-[8px]">U{i}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Команда проекта: {activeProject.members} чел.</span>
            </div>
          </div>
        </div>

        {/* Kanban Board View */}
        <div className="flex-1 flex flex-col min-w-0 bg-secondary/20">
          {/* Board Header */}
          <div className="h-16 px-6 border-b border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className={cn("w-3 h-3 rounded-full", activeProject.color)} />
               <h1 className="text-xl font-bold truncate">{activeProject.name}</h1>
               <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
               <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 whitespace-nowrap">
                 {activeBoard}
               </Badge>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
               <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                 <Filter className="w-4 h-4" />
                 <span className="hidden sm:inline">Фильтр</span>
               </Button>
               <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                 <Users className="w-4 h-4" />
                 <span className="hidden sm:inline">Участники</span>
               </Button>
               <Separator orientation="vertical" className="h-6 mx-2" />
               <Button className="gap-2 shadow-lg shadow-primary/20" size="sm">
                 <Plus className="w-4 h-4" />
                 <span className="hidden sm:inline">Добавить задачу</span>
               </Button>
            </div>
          </div>

          {/* Kanban Columns */}
          <ScrollArea className="flex-1 p-6">
            <div className="flex gap-6 h-full items-start pb-6">
              {Object.entries(kanbanData).map(([column, tasks]) => (
                <div key={column} className="w-80 shrink-0 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                       <h3 className="font-bold text-sm text-foreground/80">{column}</h3>
                       <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 text-[10px] font-bold">
                         {tasks.length}
                       </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className="group bg-card border border-border/60 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
                        data-testid={`card-task-${task.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Badge 
                            className={cn(
                              "text-[10px] font-bold px-2 py-0 rounded-full",
                              task.priority === "Высокий" ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20" : 
                              task.priority === "Средний" ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20" : 
                              "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20"
                            )}
                          >
                            {task.priority}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <h4 className="text-sm font-semibold mb-3 text-foreground/90 leading-snug">{task.title}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 bg-secondary rounded-md">{task.type}</span>
                          <div className="flex -space-x-1.5">
                            <Avatar className="w-6 h-6 border-2 border-card">
                              <AvatarFallback className="text-[8px] bg-indigo-500 text-white">JD</AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="ghost" 
                      className="w-full border-2 border-dashed border-border/50 py-8 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 transition-all rounded-xl gap-2"
                      data-testid={`button-add-task-${column}`}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-semibold">Новая задача</span>
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Add Column Button */}
              <div className="w-80 shrink-0">
                <Button 
                  variant="ghost" 
                  className="w-full h-12 border-2 border-dashed border-border/50 text-muted-foreground hover:bg-secondary/40 transition-all rounded-xl gap-2 font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить колонку</span>
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      <TaskDetailsModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </Layout>
  );
}
