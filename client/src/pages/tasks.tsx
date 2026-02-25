import { Layout } from "@/components/layout/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal, Calendar, ArrowUpDown, Filter, Layout as LayoutIcon, Briefcase, Play, Clock, X } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { TaskDetailsModal, Task } from "@/components/kanban/TaskDetailsModal";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Tasks() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [taskFilters, setTaskFilters] = useState({
    search: "",
    projects: [] as string[],
    status: [] as string[]
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks/my-tasks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tasks/my-tasks");
      return res.json();
    }
  });

  // Get all boards for project filter
  const { data: boards = [] } = useQuery({
    queryKey: ["/api/boards"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/boards");
      return res.json();
    }
  });

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    return tasks.filter((task: any) => {
      // Search filter
      if (taskFilters.search) {
        const searchLower = taskFilters.search.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(searchLower);
        const matchDesc = task.description?.toLowerCase().includes(searchLower);
        const matchNumber = task.number?.toString().includes(searchLower);
        if (!matchTitle && !matchDesc && !matchNumber) return false;
      }
      
      // Project filter
      if (taskFilters.projects.length > 0) {
        if (!task.boardId || !taskFilters.projects.includes(task.boardId)) return false;
      }
      
      // Status filter
      if (taskFilters.status.length > 0) {
        const taskStatus = task.status || "todo";
        if (!taskFilters.status.includes(taskStatus)) return false;
      }
      
      return true;
    });
  }, [tasks, taskFilters]);

  // Get active filter count
  const activeFilterCount = taskFilters.projects.length + taskFilters.status.length + (taskFilters.search ? 1 : 0);

  useEffect(() => {
    // Update time every minute instead of every second to reduce re-renders
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
      toast.success("Задача обновлена");
    },
    onError: () => {
      toast.error("Не удалось обновить задачу");
    }
  });

  const formatDuration = useCallback((start: number) => {
    const diff = currentTime - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, [currentTime]);

  const formatDate = useCallback((date: any) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return "Просрочено";
    if (days === 0) return "Сегодня";
    if (days === 1) return "Завтра";
    if (days < 7) return `${d.toLocaleDateString("ru-RU", { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString("ru-RU", { month: 'short' })}`;
    return d.toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' });
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      "done": "Готово",
      "in_progress": "В работе",
      "todo": "В планах",
      "review": "На проверке"
    };
    return statusMap[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityMap: Record<string, string> = {
      "high": "Высокий",
      "medium": "Средний",
      "low": "Низкий"
    };
    return priorityMap[priority] || priority;
  };

  const handleTakeTask = (e: React.MouseEvent | null, task: any) => {
    if (e) e.stopPropagation();
    updateTaskMutation.mutate({
      id: String(task.id),
      updates: { status: "in_progress" }
    });
    toast.success("Задача принята в работу");
  };

  const handleTaskClick = (task: any) => {
    const displayTask: Task = {
      id: String(task.id),
      title: task.title || "",
      description: task.description || "",
      status: getStatusBadge(task.status || "todo"),
      priorityId: task.priority || "medium",
      type: task.type || "Задача",
      boardId: task.boardId || "",
      columnId: task.columnId || "",
      assignee: task.assignee,
      creator: task.creator ? {
        name: task.creator.name || "",
        date: task.creator.date ? new Date(task.creator.date).toLocaleDateString("ru-RU") : "",
        avatar: task.creator.avatar || null
      } : { name: "Система", date: "" },
      dueDate: task.dueDate ? formatDate(task.dueDate) : "",
      labels: task.tags || [],
      subtasks: task.subtasks || [],
      comments: task.comments || [],
      history: task.history || [],
      attachments: task.attachments || [],
      number: String(task.number || ""),
      isAccepted: task.status === "in_progress",
      startTime: task.status === "in_progress" ? (task.updatedAt ? new Date(task.updatedAt).getTime() : Date.now()) : undefined
    };
    setSelectedTask(displayTask);
    setIsModalOpen(true);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks/my-tasks"] });
    setSelectedTask(updatedTask);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 p-6">
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground">Мои задачи</h1>
             <p className="text-muted-foreground mt-1">Все задачи, назначенные лично вам из разных проектов.</p>
           </div>
            <div className="flex gap-2">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" /> 
                    Фильтр
                    {activeFilterCount > 0 && (
                      <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold">Фильтры</Label>
                      {activeFilterCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setTaskFilters({ search: "", projects: [], status: [] })}
                          className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Очистить
                        </Button>
                      )}
                    </div>
                    
                    {/* Search */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Поиск</Label>
                      <Input
                        placeholder="Поиск по названию..."
                        value={taskFilters.search}
                        onChange={(e) => setTaskFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="h-8"
                      />
                    </div>

                    {/* Project filter */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Проект</Label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {boards.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Нет проектов</span>
                        ) : (
                          boards.map((board: any) => (
                            <label
                              key={board.id}
                              className="flex items-center gap-2 px-2 py-1 border border-input rounded-md cursor-pointer hover:bg-accent transition-colors text-xs"
                            >
                              <Checkbox
                                checked={taskFilters.projects.includes(board.id)}
                                onCheckedChange={(checked) => {
                                  setTaskFilters(prev => ({
                                    ...prev,
                                    projects: checked
                                      ? [...prev.projects, board.id]
                                      : prev.projects.filter(id => id !== board.id)
                                  }));
                                }}
                              />
                              <span>{board.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Status filter */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Статус</Label>
                      <div className="flex flex-wrap gap-2">
                        {["todo", "in_progress", "review", "done"].map((status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2 px-2 py-1 border border-input rounded-md cursor-pointer hover:bg-accent transition-colors text-xs"
                          >
                            <Checkbox
                              checked={taskFilters.status.includes(status)}
                              onCheckedChange={(checked) => {
                                setTaskFilters(prev => ({
                                  ...prev,
                                  status: checked
                                    ? [...prev.status, status]
                                    : prev.status.filter(s => s !== status)
                                }));
                              }}
                            />
                            <span>{status === "todo" ? "В планах" : status === "in_progress" ? "В работе" : status === "review" ? "На проверке" : "Готово"}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>У вас пока нет назначенных задач</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden font-sans">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] px-6"><Checkbox /></TableHead>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead className="w-[140px]">Статус</TableHead>
                  <TableHead className="w-[120px]">Приоритет</TableHead>
                  <TableHead className="w-[180px]">Проект / Доска</TableHead>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                      Срок <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[140px]">Подтверждение</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task: any) => (
                  <TableRow 
                    key={task.id} 
                    className="group cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                      <Checkbox />
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-foreground">TS-{task.number || String(task.id).slice(0, 4)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{task.title}</span>
                         <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{task.type || "Задача"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        task.status === "done" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-bold" :
                        task.status === "in_progress" ? "border-blue-500/30 text-blue-600 bg-blue-500/5 font-bold" :
                        "border-slate-500/30 text-slate-600 bg-slate-500/5 font-bold"
                      }>
                        {getStatusBadge(task.status || "todo")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          task.priority === "high" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" :
                          task.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
                        }`} />
                         <span className="text-xs font-medium text-foreground">{getPriorityLabel(task.priority || "medium")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                          <Briefcase className="w-3 h-3 text-primary/70" />
                          <span className="truncate max-w-[150px]">{task.project?.name || "Проект"}</span>
                        </div>
                         <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                           <LayoutIcon className="w-2.5 h-2.5" />
                           <span className="truncate max-w-[150px]">{task.board?.name || "Доска"}</span>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                       <div className="flex items-center gap-2">
                         <Calendar className="w-3.5 h-3.5" /> {task.dueDate ? formatDate(task.dueDate) : "—"}
                       </div>
                    </TableCell>
                    <TableCell>
                      {task.status === "in_progress" ? (
                        <div className="flex items-center gap-2 text-primary font-mono text-sm font-bold bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          {task.updatedAt ? formatDuration(new Date(task.updatedAt).getTime()) : "00:00"}
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          className="h-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                          onClick={(e) => handleTakeTask(e, task)}
                        >
                          <Play className="w-3 h-3 fill-current" /> Принять
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TaskDetailsModal 
        task={selectedTask}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={handleUpdateTask}
        onAccept={(id) => {
          const task = tasks.find((t: any) => String(t.id) === String(id));
          if (task) handleTakeTask(null, task);
        }}
      />
    </Layout>
  );
}
