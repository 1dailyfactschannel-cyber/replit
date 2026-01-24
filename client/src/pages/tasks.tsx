import { Layout } from "@/components/layout/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, ArrowUpDown, Filter, Layout as LayoutIcon, Briefcase, Play, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { TaskDetailsModal, Task } from "@/components/kanban/TaskDetailsModal";
import { toast } from "sonner";

// Mock tasks that look like real project tasks
const initialTasksData: (Task & { project: string; board: string; isAccepted?: boolean; startTime?: number })[] = [
  { 
    id: 872, 
    title: "Создать новые токены дизайн-системы", 
    status: "В работе", 
    priority: "Высокий", 
    type: "Дизайн",
    project: "TeamSync Web",
    board: "UI/UX Design",
    assignee: { name: "Я" },
    creator: { name: "Юлия Дарицкая", date: "10 янв 2026" },
    dueDate: "Завтра",
    description: "Необходимо обновить цветовую палитру и шрифтовые пары в соответствии с новым брендингом.",
    labels: ["Дизайн", "Брендинг"],
    subtasks: [
      { id: 1, title: "Выбрать палитру", completed: true },
      { id: 2, title: "Настроить переменные", completed: false }
    ],
    comments: [],
    history: [],
    isAccepted: true,
    startTime: Date.now() - 3600000 // 1 hour ago
  },
  { 
    id: 873, 
    title: "Исправить баг навигации на мобильных", 
    status: "В планах", 
    priority: "Средний", 
    type: "Разработка",
    project: "TeamSync Mobile",
    board: "Frontend Dev",
    assignee: { name: "Я" },
    creator: { name: "Александр Петров", date: "11 янв 2026" },
    dueDate: "Ср, 12 янв",
    description: "Меню не закрывается при клике на пункт на устройствах iOS.",
    labels: ["Баг", "Мобайл"],
    subtasks: [],
    comments: [],
    history: [],
    isAccepted: false
  },
  { 
    id: 874, 
    title: "Обновить зависимости", 
    status: "Готово", 
    priority: "Низкий", 
    type: "Техдолг",
    project: "Internal Tools",
    board: "Maintenance",
    assignee: { name: "Я" },
    creator: { name: "Максим Иванов", date: "09 янв 2026" },
    dueDate: "Вчера",
    description: "Обновление React и сопутствующих библиотек до последних версий.",
    labels: ["Maintenance"],
    subtasks: [],
    comments: [],
    history: [],
    isAccepted: true,
    timeSpent: "02:15"
  },
  { 
    id: 875, 
    title: "Написать документацию API", 
    status: "В работе", 
    priority: "Средний", 
    type: "Документация",
    project: "TeamSync Web",
    board: "Backend API",
    assignee: { name: "Я" },
    creator: { name: "Максим Иванов", date: "12 янв 2026" },
    dueDate: "Пт, 14 янв",
    description: "Описать все эндпоинты модуля Общение.",
    labels: ["Документация"],
    subtasks: [],
    comments: [],
    history: [],
    isAccepted: false
  }
];

export default function Tasks() {
  const [tasks, setTasks] = useState(initialTasksData);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Mock notification for a new task
    const timer = setTimeout(() => {
      toast("Новая задача назначена вам", {
        description: "Исправить баг навигации на мобильных",
        action: {
          label: "Принять",
          onClick: () => {
            const task = tasks.find(t => t.id === 873);
            if (task) handleTaskClick(task);
          },
        },
      });
    }, 2000);

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const formatDuration = (start: number) => {
    const diff = currentTime - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleTakeTask = (e: React.MouseEvent | null, taskId: number) => {
    if (e) e.stopPropagation();
    let updatedTask: any = null;
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        updatedTask = { ...task, isAccepted: true, startTime: Date.now(), status: "В работе" };
        return updatedTask;
      }
      return task;
    }));
    if (selectedTask && selectedTask.id === taskId && updatedTask) {
      setSelectedTask(updatedTask);
    }
    toast.success("Задача принята в работу");
  };

  const handleTaskClick = (task: any) => {
    // If task is in progress, update timeSpent for the modal
    const displayTask = { ...task };
    if (task.startTime && task.status === "В работе") {
      displayTask.timeSpent = formatDuration(task.startTime);
    }
    setSelectedTask(displayTask);
    setIsModalOpen(true);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => {
      if (t.id === updatedTask.id) {
        // If status changed from "В работе" to something else, freeze the time
        if (t.status === "В работе" && updatedTask.status !== "В работе" && t.startTime) {
          const finalTime = formatDuration(t.startTime);
          return { ...t, ...updatedTask, timeSpent: finalTime, startTime: undefined };
        }
        return { ...t, ...updatedTask };
      }
      return t;
    }));
    setSelectedTask(updatedTask);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 p-6">
        <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold tracking-tight text-foreground">Мои задачи</h1>
             <p className="text-muted-foreground mt-1">Все задачи, назначенные лично вам из разных проектов.</p>
           </div>
           <div className="flex gap-2">
              <Button variant="outline" className="gap-2"><Filter className="w-4 h-4" /> Фильтр</Button>
              <Button>Новая задача</Button>
           </div>
        </div>

        <div className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
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
              {tasks.map((task) => (
                <TableRow 
                  key={task.id} 
                  className="group cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => handleTaskClick(task)}
                >
                  <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                    <Checkbox />
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">TS-{task.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{task.title}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{task.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      task.status === "Готово" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-bold" :
                      task.status === "В работе" ? "border-blue-500/30 text-blue-600 bg-blue-500/5 font-bold" :
                      "border-slate-500/30 text-slate-600 bg-slate-500/5 font-bold"
                    }>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        task.priority === "Высокий" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" :
                        task.priority === "Средний" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span className="text-xs font-medium">{task.priority}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                        <Briefcase className="w-3 h-3 text-primary/70" />
                        <span className="truncate max-w-[150px]">{task.project}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <LayoutIcon className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[150px]">{task.board}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-medium">
                     <div className="flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5" /> {task.dueDate}
                     </div>
                  </TableCell>
                  <TableCell>
                    {task.isAccepted ? (
                      <div className="flex items-center gap-2 text-primary font-mono text-sm font-bold bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 w-fit">
                        {task.status === "В работе" && task.startTime ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            {formatDuration(task.startTime)}
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            {task.timeSpent || "00:00"}
                          </>
                        )}
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="h-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 animate-pulse"
                        onClick={(e) => handleTakeTask(e, task.id)}
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
      </div>

      <TaskDetailsModal 
        task={selectedTask}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={handleUpdateTask}
        onAccept={(id) => handleTakeTask(null, id)}
      />
    </Layout>
  );
}
